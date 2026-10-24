"""Trusted optional tool worker. Run separately; never mount Docker into the target."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import subprocess
import threading
import time
from pathlib import Path

import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.padding import PKCS7
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from .common import DomainError

LOGGER = logging.getLogger(__name__)

# Elasticsearch settings for the disposable single-node cluster. Disk watermarks are disabled on purpose: the cluster holds a
# few thousand events, and with the defaults Elasticsearch refuses to allocate even its own security index once the host disk
# passes 90% (measured: cluster stays red and every API call returns 503), which would make the tool unusable on a full disk.
ES_SETTINGS = {
    "discovery.type": "single-node",
    "xpack.security.enabled": "true",
    "xpack.security.http.ssl.enabled": "false",
    "xpack.license.self_generated.type": "basic",
    "cluster.routing.allocation.disk.threshold_enabled": "false",
    "ES_JAVA_OPTS": "-Xms1g -Xmx1g",
}

# Free memory (bytes) the host must report before an optional profile may start; below it the profile is refused.
MEMORY_GATE = {"desktop": 6 * 1024**3, "siem": 5 * 1024**3}


class Launch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: str = Field(pattern="^(desktop|siem)$")
    principal: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    events: list[dict] = Field(max_length=20000)


def encrypted_grant(key, payload):
    secret = bytes.fromhex(key)
    raw = json.dumps(payload, separators=(",", ":")).encode()
    signed = hmac.new(secret, raw, hashlib.sha256).digest() + raw
    pad = PKCS7(128).padder()
    padded = pad.update(signed) + pad.finalize()
    encryptor = Cipher(algorithms.AES(secret), modes.CBC(bytes(16))).encryptor()
    return base64.b64encode(encryptor.update(padded) + encryptor.finalize()).decode()


def kibana_providers(analyst_password):
    """Kibana ``xpack.security.authc.providers`` value for the env-var transport.

    Dotted keys are not expanded inside env-var JSON, so providers use the nested
    record form. The anonymous provider signs the learner in as the read-only
    ``training_analyst``; the basic provider keeps authenticated worker API calls
    working. ``kibana-docker`` expands its option string unquoted, so the JSON
    must be compact: any space would split the argument and fail validation.
    """
    return json.dumps(
        {
            "anonymous": {
                "training": {
                    "order": 0,
                    "credentials": {
                        "username": "training_analyst",
                        "password": analyst_password,
                    },
                }
            },
            "basic": {"basic": {"order": 1}},
        },
        separators=(",", ":"),
    )


class ToolWorker:
    def __init__(self, path):
        self.root = Path(path).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        threading.Thread(target=self.reap, daemon=True).start()

    def reap(self):
        while True:
            time.sleep(15)
            for file in self.root.glob("run_*/job.json"):
                try:
                    job = json.loads(file.read_text())
                    if (
                        job["status"] in {"preparing", "ready"}
                        and job["expires"] <= time.time()
                    ):
                        self.stop(job["run_id"])
                except Exception:
                    LOGGER.warning(
                        "Unable to reap optional-tool lease",
                        extra={"run_id": file.parent.name},
                        exc_info=True,
                    )

    @staticmethod
    def available_memory():
        """Bytes of memory the kernel reports as available, or None when it cannot be read (fail closed)."""
        try:
            return (
                int(
                    next(
                        line.split()[1]
                        for line in Path("/proc/meminfo").read_text().splitlines()
                        if line.startswith("MemAvailable:")
                    )
                )
                * 1024
            )
        except (OSError, StopIteration, ValueError):
            return None

    @staticmethod
    def windows_base():
        configured = os.environ.get("WINDOWS_BASE_IMAGE", "")
        if not configured:
            raise DomainError(
                "Windows image is not configured. Prepare a Windows qcow2 image and set WINDOWS_BASE_IMAGE; see docs/product/WINDOWS_VM.md.",
                503,
            )
        path = Path(configured).expanduser().resolve()
        if not path.is_file() or path.suffix.lower() != ".qcow2" or "," in str(path):
            raise DomainError(
                "WINDOWS_BASE_IMAGE must point to a readable standalone .qcow2 file.",
                503,
            )
        if not os.access(path, os.R_OK):
            raise DomainError(
                "The Windows base image is not readable by the range worker.", 503
            )
        if not os.access("/dev/kvm", os.R_OK | os.W_OK):
            raise DomainError("Windows requires access to /dev/kvm on this host.", 503)
        return path

    def health(self):
        """Dependency report for the control service: Docker reachability and whether each profile could launch now."""
        try:
            subprocess.run(
                ["docker", "version", "--format", "{{.Server.Version}}"],
                check=True,
                capture_output=True,
                timeout=4,
            )
            docker = True
        except (OSError, subprocess.SubprocessError):
            docker = False
        available = self.available_memory()
        try:
            self.windows_base()
            windows_error = None
        except DomainError as exc:
            windows_error = exc.message
        return {
            "status": "ok" if docker else "degraded",
            "docker": docker,
            "desktop_os": "Windows",
            "desktop_blocker": windows_error,
            "memory_available_mib": None if available is None else available // 2**20,
            "launchable": {
                profile: bool(
                    docker
                    and available is not None
                    and available >= need
                    and (profile != "desktop" or windows_error is None)
                )
                for profile, need in MEMORY_GATE.items()
            },
        }

    def folder(self, rid):
        if not re.fullmatch(r"run_[a-z0-9]{1,40}", rid):
            raise DomainError("Invalid run handle", 422)
        p = self.root / rid
        p.mkdir(exist_ok=True)
        return p

    def load(self, rid):
        file = self.folder(rid) / "job.json"
        return json.loads(file.read_text()) if file.exists() else None

    def save(self, rid, job):
        file = self.folder(rid) / "job.json"
        file.write_text(json.dumps(job))
        file.chmod(0o600)

    def docker(self, *args, timeout=120):
        p = subprocess.run(
            ["docker", *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if p.returncode:
            raise DomainError(
                "Tool container operation failed: " + p.stderr.strip()[:250], 503
            )
        return p.stdout.strip()

    def evidence(self, rid, events):
        # The control service supplies its released projection, not target ground truth.
        folder = self.folder(rid) / "evidence"
        folder.mkdir(exist_ok=True)
        file = folder / "events.jsonl"
        temp = folder / "events.tmp"
        temp.write_text(chr(10).join(json.dumps(e) for e in events) + chr(10))
        temp.replace(file)
        file.chmod(0o644)

    def launch(self, rid, p):
        with self.lock:
            existing = self.load(rid)
            if (
                existing
                and p.profile == "desktop"
                and existing["profile"] == "desktop"
                and existing.get("os") != "Windows"
            ):
                self.stop(rid)
                existing = self.load(rid)
            if existing and existing["status"] in {"preparing", "ready"}:
                if existing["profile"] != p.profile:
                    raise DomainError(
                        "Stop the current optional tool before launching another profile",
                        409,
                    )
                self.evidence(rid, p.events)
                return self.status(rid)
            if existing:
                self.stop(rid)
            available = self.available_memory()
            needed = MEMORY_GATE[p.profile]
            if available is None or available < needed:
                raise DomainError(
                    "Insufficient free memory for this optional profile; the core console remains available",
                    503,
                )
            if p.profile == "desktop":
                self.windows_base()
            generation = secrets.token_hex(6)
            job = {
                "generation": generation,
                "run_id": rid,
                "profile": p.profile,
                "os": "Windows" if p.profile == "desktop" else None,
                "status": "preparing",
                "message": "Starting the prepared " + p.profile + " environment.",
                "expires": time.time() + 3600,
                "key": secrets.token_hex(16),
                "password": secrets.token_urlsafe(24),
                "principal": p.principal,
                "network": "cydeline-tools-" + rid + "-" + generation,
                "edge": "cydeline-edge-" + rid + "-" + generation,
                "containers": [],
                "port": None,
            }
            self.evidence(rid, p.events)
            self.save(rid, job)
            threading.Thread(target=self.prepare, args=(rid,), daemon=True).start()
            return self.status(rid)

    def is_current(self, rid, job):
        current = self.load(rid)
        return (
            current
            and current.get("generation") == job.get("generation")
            and current["status"] in {"preparing", "ready"}
        )

    def cleanup(self, rid, job):
        for name in job["containers"]:
            try:
                info = json.loads(self.docker("inspect", name))
                labels = info[0].get("Config", {}).get("Labels", {})
                if labels.get("cydeline.run") == rid and labels.get(
                    "cydeline.generation"
                ) == job.get("generation"):
                    self.docker("rm", "-f", name, timeout=20)
            except DomainError:
                pass
        for name in (job["network"], job.get("edge")):
            if not name:
                continue
            try:
                network = json.loads(self.docker("network", "inspect", name))[0]
                if network.get("Labels", {}).get("cydeline.generation") == job.get(
                    "generation"
                ):
                    self.docker("network", "rm", name, timeout=20)
            except DomainError:
                pass

    def prepare(self, rid):
        job = self.load(rid)
        try:
            labels = (
                "--label",
                "cydeline.run=" + rid,
                "--label",
                "cydeline.generation=" + job["generation"],
            )
            # Everything runs on an internal network with no route out. Docker never publishes a port for a container
            # attached only to an internal network, so the browser-facing gateways are additionally joined to a small
            # edge network; the desktop, guacd and Elasticsearch stay internal-only.
            self.docker("network", "create", "--internal", *labels, job["network"])
            self.docker("network", "create", *labels, job["edge"])
            if job["profile"] == "desktop":
                self.desktop(rid, job)
            else:
                self.siem(rid, job)
            with self.lock:
                if not self.is_current(rid, job):
                    self.cleanup(rid, job)
                    return
                job.update(
                    status="ready",
                    message="Prepared environment is running. Reconnect renews the connection grant.",
                )
                self.save(rid, job)
        except Exception as exc:
            LOGGER.exception(
                "Optional-tool launch failed",
                extra={"run_id": rid, "profile": job["profile"]},
            )
            self.cleanup(rid, job)
            with self.lock:
                if self.is_current(rid, job):
                    job.update(status="failed", message=str(exc)[:300])
                    self.save(rid, job)

    def start_container(
        self,
        rid,
        job,
        suffix,
        image,
        args=(),
        memory="512m",
        extra=(),
        edge=False,
    ):
        name = "cydeline-" + rid + "-" + suffix + "-" + job["generation"]
        if not self.is_current(rid, job):
            raise DomainError("Launch cancelled")
        # A gateway is created on the edge network (so its loopback port can be published), joined to the private
        # network, and only then started, so it never runs without both.
        self.docker(
            "create",
            "--name",
            name,
            "--network",
            job["edge"] if edge else job["network"],
            "--label",
            "cydeline.run=" + rid,
            "--label",
            "cydeline.generation=" + job["generation"],
            "--memory",
            memory,
            "--cpus",
            "2",
            "--pids-limit",
            "512",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            *extra,
            image,
            *args,
            timeout=600,
        )
        job["containers"].append(name)
        if edge:
            self.docker("network", "connect", job["network"], name)
        self.docker("start", name, timeout=60)
        with self.lock:
            if not self.is_current(rid, job):
                self.cleanup(rid, job)
                raise DomainError("Launch cancelled")
            self.save(rid, job)
        return name

    def published_port(self, name, port):
        data = json.loads(self.docker("inspect", name))
        bindings = data[0]["NetworkSettings"]["Ports"].get(str(port) + "/tcp")
        if not bindings:
            raise DomainError("The tool gateway did not publish a loopback port", 503)
        return int(bindings[0]["HostPort"])

    def es(self, job, method, path, body=None, ndjson=None, timeout=60):
        """Call the disposable cluster through `docker exec`.

        The cluster publishes no port and its password never appears on a command line: it is read from the
        container's own environment. The request body is piped over stdin.
        """
        payload = (
            ndjson
            if ndjson is not None
            else (None if body is None else json.dumps(body))
        )
        script = (
            'curl -sS -f -u "elastic:$ELASTIC_PASSWORD" -X "$0" -H "Content-Type: $1" '
            + ("--data-binary @- " if payload is not None else "")
            + '"http://localhost:9200$2"'
        )
        try:
            proc = subprocess.run(
                [
                    "docker",
                    "exec",
                    "-i",
                    job["es"],
                    "sh",
                    "-c",
                    script,
                    method,
                    "application/x-ndjson"
                    if ndjson is not None
                    else "application/json",
                    path,
                ],
                input=payload,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            raise DomainError("The search service could not be reached", 503) from exc
        if proc.returncode:
            raise DomainError(
                "Search service request failed: " + proc.stderr.strip()[:200], 503
            )
        return json.loads(proc.stdout) if proc.stdout.strip() else {}

    def wait_es(self, job, timeout=180):
        until = time.monotonic() + timeout
        while time.monotonic() < until:
            try:
                self.es(
                    job,
                    "GET",
                    "/_cluster/health?wait_for_status=yellow&timeout=5s",
                    timeout=15,
                )
                return
            except DomainError:
                time.sleep(2)
        raise DomainError("Tool did not become ready within the launch budget", 503)

    def wait_http(self, url, timeout=120, **kwargs):
        until = time.monotonic() + timeout
        while time.monotonic() < until:
            try:
                r = httpx.get(url, timeout=3, **kwargs)
                if r.status_code < 400:
                    return r
            except httpx.HTTPError:
                pass
            time.sleep(1)
        raise DomainError("Tool did not become ready within the launch budget", 503)

    def desktop(self, rid, job):
        base = self.windows_base()
        desktop = self.start_container(
            rid,
            job,
            "windows",
            "cydeline-windows:1",
            memory="5g",
            extra=(
                "--device",
                "/dev/kvm",
                "--mount",
                "type=bind,src=" + str(base) + ",dst=/image/windows.qcow2,readonly",
                "--mount",
                "type=bind,src="
                + str(self.folder(rid) / "evidence")
                + ",dst=/evidence,readonly",
            ),
        )
        # Readiness is an actual VNC greeting from QEMU, not merely an HTTP gateway page.
        self.docker(
            "exec",
            desktop,
            "python3",
            "-c",
            "import socket,time; end=time.monotonic()+90\n"
            "while time.monotonic()<end:\n"
            " try:\n"
            "  s=socket.create_connection(('127.0.0.1',5901),2); greeting=s.recv(12); s.close()\n"
            "  if greeting.startswith(b'RFB '): break\n"
            " except OSError: pass\n"
            " time.sleep(1)\n"
            "else: raise SystemExit('Windows VM display did not start')",
            timeout=100,
        )
        daemon = self.start_container(rid, job, "guacd", "guacamole/guacd:1.6.0")
        gateway = self.start_container(
            rid,
            job,
            "gateway",
            "guacamole/guacamole:1.6.0",
            extra=(
                "-e",
                "GUACD_HOSTNAME=" + daemon,
                "-e",
                "JSON_ENABLED=true",
                "-e",
                "JSON_SECRET_KEY=" + job["key"],
                "-p",
                "127.0.0.1::8080",
            ),
            edge=True,
        )
        job["port"] = self.published_port(gateway, 8080)
        job["desktop"] = desktop
        job["os"] = "Windows"
        self.wait_http("http://127.0.0.1:" + str(job["port"]) + "/guacamole/")

    def siem(self, rid, job):
        es = self.start_container(
            rid,
            job,
            "elasticsearch",
            "docker.elastic.co/elasticsearch/elasticsearch:9.5.5",
            memory="2g",
            extra=(
                *(
                    arg
                    for key, value in ES_SETTINGS.items()
                    for arg in ("-e", f"{key}={value}")
                ),
                "-e",
                "ELASTIC_PASSWORD=" + job["password"],
            ),
        )
        # Elasticsearch is internal-only: it publishes nothing, and is administered through `docker exec`.
        job["es"] = es
        self.wait_es(job)
        # Scope browser authentication to this disposable cluster; no control data enters it.
        system_password = secrets.token_urlsafe(24)
        self.es(
            job,
            "POST",
            "/_security/user/kibana_system/_password",
            {"password": system_password},
        )
        analyst_password = secrets.token_urlsafe(24)
        self.es(
            job,
            "PUT",
            "/_security/role/training_analyst",
            {
                "cluster": ["monitor"],
                "indices": [
                    {
                        "names": ["northstar-*", ".alerts-security*"],
                        "privileges": ["read", "view_index_metadata"],
                    }
                ],
                "applications": [
                    {
                        "application": "kibana-.kibana",
                        "privileges": ["all"],
                        "resources": ["space:default"],
                    }
                ],
            },
        )
        self.es(
            job,
            "PUT",
            "/_security/user/training_analyst",
            {"password": analyst_password, "roles": ["training_analyst"]},
        )
        providers = kibana_providers(analyst_password)
        kibana = self.start_container(
            rid,
            job,
            "kibana",
            "docker.elastic.co/kibana/kibana:9.5.5",
            memory="1g",
            extra=(
                "-e",
                "ELASTICSEARCH_HOSTS=http://" + es + ":9200",
                "-e",
                "ELASTICSEARCH_USERNAME=kibana_system",
                "-e",
                "ELASTICSEARCH_PASSWORD=" + system_password,
                "-e",
                "XPACK_SECURITY_AUTHC_PROVIDERS=" + providers,
                "-e",
                "XPACK_SECURITY_AUTHC_SELECTOR_ENABLED=false",
                "-e",
                "SERVER_HOST=0.0.0.0",
                "-p",
                "127.0.0.1::5601",
            ),
            edge=True,
        )
        job["port"] = self.published_port(kibana, 5601)
        job["message"] = "Waiting for Elastic Security."
        self.save(rid, job)
        self.wait_http("http://127.0.0.1:" + str(job["port"]) + "/api/status", 180)
        self.index_events(rid, job)
        httpx.post(
            "http://127.0.0.1:" + str(job["port"]) + "/api/data_views/data_view",
            headers={"kbn-xsrf": "true"},
            auth=("elastic", job["password"]),
            json={
                "data_view": {
                    "title": "northstar-*",
                    "name": "Northstar run events",
                    "timeFieldName": "@timestamp",
                }
            },
        )

    def index_events(self, rid, job):
        if job["profile"] != "siem" or not job.get("es"):
            return
        file = self.folder(rid) / "evidence" / "events.jsonl"
        bulk = []
        # Before any event is released the evidence file is a lone newline.
        for line in filter(str.strip, file.read_text().splitlines()):
            e = json.loads(line)
            network = e.get("network") or {}
            bulk += [
                json.dumps(
                    {"index": {"_index": "northstar-" + rid, "_id": e["event_id"]}}
                ),
                json.dumps(
                    {
                        "@timestamp": e["timestamp_utc"],
                        "event": {
                            "id": e["event_id"],
                            "action": e["event_type"],
                            "outcome": e.get("outcome"),
                        },
                        "user": {"name": e["actor_id"]},
                        "source": {"ip": network.get("src_ip")},
                        "http": {
                            "request": {"method": network.get("http_method")},
                            "response": {"status_code": network.get("status_code")},
                        },
                        "url": {"path": network.get("path")},
                        "northstar": {
                            "run_id": rid,
                            "session": e.get("session_handle"),
                            "sequence": e["sequence"],
                        },
                    }
                ),
            ]
        if bulk:
            result = self.es(
                job,
                "POST",
                "/_bulk?refresh=wait_for",
                ndjson=chr(10).join(bulk) + chr(10),
                timeout=60,
            )
            if result.get("errors"):
                raise DomainError("The search index rejected some run evidence", 503)

    def status(self, rid):
        with self.lock:
            job = self.load(rid)
            if not job:
                return {
                    "status": "stopped",
                    "message": "No optional tool running.",
                    "desktop_os": "Windows",
                }
            result = {k: job[k] for k in ["status", "message", "profile", "expires"]}
            result["desktop_os"] = "Windows"
            if job["status"] == "ready":
                if job["profile"] == "desktop" and job.get("os") != "Windows":
                    return {
                        "status": "failed",
                        "desktop_os": "Windows",
                        "message": "This older Linux environment must be stopped and relaunched as Windows.",
                    }
                try:
                    states = json.loads(self.docker("inspect", *job["containers"]))
                    if any(not c["State"]["Running"] for c in states):
                        return {
                            "status": "failed",
                            "desktop_os": "Windows",
                            "message": "An environment process stopped. Restart the optional tool.",
                        }
                except DomainError:
                    return {
                        "status": "failed",
                        "desktop_os": "Windows",
                        "message": "Environment is unavailable. Restart the optional tool.",
                    }
                if time.time() >= job["expires"]:
                    self.stop(rid)
                    return {
                        "status": "expired",
                        "desktop_os": "Windows",
                        "message": "Environment lease expired.",
                    }
                if job["profile"] == "desktop":
                    payload = {
                        "username": job["principal"],
                        "expires": int((time.time() + 120) * 1000),
                        "connections": {
                            "Northstar Windows workstation": {
                                "id": rid,
                                "protocol": "vnc",
                                "parameters": {
                                    "hostname": job["desktop"],
                                    "port": "5901",
                                    "disable-copy": "false",
                                    "disable-paste": "false",
                                },
                            }
                        },
                    }
                    from urllib.parse import quote

                    result["url"] = (
                        "http://127.0.0.1:"
                        + str(job["port"])
                        + "/guacamole/?data="
                        + quote(encrypted_grant(job["key"], payload), safe="")
                    )
                else:
                    result["url"] = (
                        "http://127.0.0.1:" + str(job["port"]) + "/app/security"
                    )
            return result

    def stop(self, rid):
        with self.lock:
            job = self.load(rid)
            if not job:
                return {"status": "stopped"}
            job.update(
                status="stopped",
                message="Optional tool stopped. Case data remains saved.",
            )
            self.save(rid, job)
        self.cleanup(rid, job)
        return self.status(rid)


def create_worker(path, secret):
    app = FastAPI(title="Trusted optional range worker")
    worker = ToolWorker(path)
    app.state.worker = worker

    @app.middleware("http")
    async def auth(request, call_next):
        if not secrets.compare_digest(
            request.headers.get("x-range-secret", ""), secret
        ):
            return JSONResponse({"message": "Unauthorized"}, 401)
        return await call_next(request)

    @app.exception_handler(DomainError)
    async def domain(request, e):
        return JSONResponse({"message": e.message}, e.status)

    @app.get("/health")
    def health():
        return worker.health()

    @app.post("/tools/{rid}")
    def launch(rid: str, p: Launch):
        return worker.launch(rid, p)

    @app.get("/tools/{rid}")
    def status(rid: str):
        return worker.status(rid)

    @app.delete("/tools/{rid}")
    def stop(rid: str):
        return worker.stop(rid)

    @app.put("/tools/{rid}")
    def evidence(rid: str, p: Launch):
        worker.evidence(rid, p.events)
        job = worker.load(rid)
        if job and job["status"] == "ready":
            worker.index_events(rid, job)
        return worker.status(rid)

    return app
