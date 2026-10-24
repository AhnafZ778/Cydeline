"""Opt-in proof that the Compose range keeps its isolation promises.

Builds and starts only `target` and `control` (the model service is not needed to prove isolation and is large), then checks
container hardening, network topology, authenticated control->target traffic, target egress, and that nothing a browser can
reach exposes credentials or hidden scenario state. It always tears the project down and removes the images it built.
Secrets are generated per run, passed through the environment, and never printed or written to the receipt.

    .venv/bin/python scripts/verify_compose_isolation.py [--receipt docs/model-card/COMPOSE_ISOLATION_PROOF.json]
"""

from __future__ import annotations

import argparse
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import http.cookiejar
import json
import secrets
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PROJECT = "cydeline-isolation-" + secrets.token_hex(5)
SERVICES = ["target", "control"]
# Keys that must never appear in anything a learner's browser can fetch during a run.
HIDDEN_KEYS = {
    "first_read_sec",
    "pivot_window_sec",
    "max_steps",
    "minimum_signals_before_first_protected_read",
    "first_ai_sec",
    "ai_interval_sec",
    "lead_update_sec",
    "model_policy",
    "routes",
    "rubric",
    "rubric_hash",
    "objective_reached",
    "broad_actions",
}


class Checks:
    def __init__(self):
        self.items = []

    def add(self, name, ok, detail=""):
        self.items.append({"check": name, "passed": bool(ok), "detail": detail})
        print(
            ("  PASS  " if ok else "  FAIL  ")
            + name
            + (f"  [{detail}]" if detail and not ok else "")
        )

    @property
    def passed(self):
        return bool(self.items) and all(i["passed"] for i in self.items)


def run(args, env=None, timeout=1800, check=True):
    result = subprocess.run(
        args,
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if check and result.returncode:
        raise RuntimeError(
            f"{' '.join(args[:4])} failed ({result.returncode}): {result.stderr.strip()[-600:]}"
        )
    return result


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Browser:
    """Minimal cookie-keeping HTTP client standing in for a learner's browser."""

    def __init__(self, base):
        self.base = base
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )

    def call(self, method, path, body=None, headers=None):
        data = None if body is None else json.dumps(body).encode()
        request = urllib.request.Request(
            self.base + path,
            data=data,
            method=method,
            headers={"Content-Type": "application/json", **(headers or {})},
        )
        try:
            with self.opener.open(request, timeout=20) as response:
                raw = response.read().decode()
                return response.status, raw
        except urllib.error.HTTPError as error:
            return error.code, error.read().decode()

    def json(self, method, path, body=None, headers=None):
        status, raw = self.call(method, path, body, headers)
        try:
            return status, json.loads(raw)
        except ValueError:
            return status, raw


def keys_of(value):
    if isinstance(value, dict):
        for key, inner in value.items():
            yield key
            yield from keys_of(inner)
    elif isinstance(value, list):
        for inner in value:
            yield from keys_of(inner)


def exec_python(container, code):
    result = run(
        ["docker", "exec", container, "python", "-c", code], check=False, timeout=60
    )
    return result.returncode, result.stdout.strip()


def exec_sh(container, command):
    return run(
        ["docker", "exec", container, "sh", "-c", command], check=False, timeout=60
    )


def hardening(checks, label, info):
    host = info["HostConfig"]
    checks.add(
        f"{label}: read-only root filesystem", host.get("ReadonlyRootfs") is True
    )
    checks.add(
        f"{label}: all capabilities dropped, none added",
        "ALL" in (host.get("CapDrop") or []) and not host.get("CapAdd"),
        str(host.get("CapDrop")),
    )
    checks.add(
        f"{label}: no-new-privileges",
        any("no-new-privileges" in o for o in host.get("SecurityOpt") or []),
    )
    checks.add(f"{label}: not privileged", host.get("Privileged") is False)
    checks.add(
        f"{label}: runs as non-root 65532",
        info["Config"].get("User") == "65532:65532",
        info["Config"].get("User", ""),
    )
    checks.add(f"{label}: memory limit set", (host.get("Memory") or 0) > 0)
    checks.add(f"{label}: CPU limit set", (host.get("NanoCpus") or 0) > 0)
    checks.add(f"{label}: pid limit set", (host.get("PidsLimit") or 0) > 0)
    checks.add(
        f"{label}: no host namespaces",
        host.get("NetworkMode") != "host"
        and host.get("PidMode") in ("", None)
        and host.get("IpcMode") != "host",
    )
    mounts = info.get("Mounts") or []
    checks.add(
        f"{label}: Docker socket never mounted",
        not any(
            "docker.sock" in (m.get("Source", "") + m.get("Destination", ""))
            for m in mounts
        )
        and not any("docker.sock" in b for b in host.get("Binds") or []),
    )
    # Compose lists named volumes under Binds as "<volume>:<dest>"; a host-path source starts with "/".
    host_paths = [
        b for b in host.get("Binds") or [] if b.split(":", 1)[0].startswith("/")
    ]
    checks.add(
        f"{label}: only named volumes, no host bind mounts",
        all(m.get("Type") in {"volume", "tmpfs"} for m in mounts) and not host_paths,
        ", ".join(f"{m.get('Type')}:{m.get('Destination')}" for m in mounts),
    )


def verify(checks, env, base, containers):
    infos = {
        name: json.loads(run(["docker", "inspect", cid]).stdout)[0]
        for name, cid in containers.items()
    }
    internal = f"{PROJECT}_range_internal"
    services = f"{PROJECT}_services"

    print("Container hardening", flush=True)
    for name, info in infos.items():
        hardening(checks, name, info)

    print("Network topology")
    network = json.loads(run(["docker", "network", "inspect", internal]).stdout)[0]
    checks.add(
        "range network is internal (no external routing)",
        network.get("Internal") is True,
    )
    target = infos["target"]
    target_ports = target["NetworkSettings"].get("Ports") or {}
    checks.add(
        "target publishes no ports",
        not target["HostConfig"].get("PortBindings")
        and all(v is None for v in target_ports.values()),
        str(target_ports),
    )
    checks.add(
        "target is attached only to the internal range network",
        set(target["NetworkSettings"]["Networks"]) == {internal},
        ",".join(target["NetworkSettings"]["Networks"]),
    )
    control = infos["control"]
    bindings = control["HostConfig"].get("PortBindings") or {}
    checks.add(
        "control publishes one port, bound to loopback only",
        list(bindings) == ["8000/tcp"]
        and all(b["HostIp"] == "127.0.0.1" for b in bindings["8000/tcp"]),
        str(bindings),
    )
    checks.add(
        "control bridges the range and service networks",
        set(control["NetworkSettings"]["Networks"]) == {internal, services},
    )

    print("Target authentication and egress")
    # Wait for HTTP readiness before asserting an authentication result; a refused
    # TCP connection during startup is neither a 401 nor an authentication bypass.
    ready = False
    for _ in range(30):
        code, state = exec_python(containers["control"],
            "import urllib.request,urllib.error\n"
            "try:\n urllib.request.urlopen('http://target:8001/health',timeout=2); print('ready')\n"
            "except urllib.error.HTTPError as e: print('ready')\n"
            "except OSError: print('starting')")
        if code == 0 and state == "ready": ready = True; break
        time.sleep(1)
    checks.add("target HTTP listener becomes ready", ready)
    _, out = exec_python(
        containers["control"],
        "import urllib.request,urllib.error\n"
        "try:\n urllib.request.urlopen('http://target:8001/health', timeout=5); print('open')\n"
        "except urllib.error.HTTPError as e: print(e.code)",
    )
    checks.add(
        "target rejects an unauthenticated peer on its own network", out == "401", out
    )
    _, out = exec_python(
        containers["control"],
        "import urllib.request,urllib.error\n"
        "r=urllib.request.Request('http://target:8001/health', headers={'x-range-secret':'wrong'})\n"
        "try:\n urllib.request.urlopen(r, timeout=5); print('open')\n"
        "except urllib.error.HTTPError as e: print(e.code)",
    )
    checks.add("target rejects a wrong secret", out == "401", out)
    _, out = exec_python(
        containers["target"],
        "import socket\n"
        "try:\n socket.create_connection(('1.1.1.1',443),4); print('reachable')\n"
        "except OSError: print('blocked')",
    )
    checks.add("target cannot open an outbound connection", out == "blocked", out)
    _, out = exec_python(
        containers["target"],
        "import socket\n"
        "try:\n socket.gethostbyname('example.com'); print('resolved')\n"
        "except OSError: print('unresolved')",
    )
    checks.add("target cannot resolve external names", out == "unresolved", out)

    print("Filesystem and identity inside the containers")
    for name, cid in containers.items():
        checks.add(
            f"{name}: application tree is read-only",
            exec_sh(cid, "touch /app/probe").returncode != 0,
        )
        checks.add(
            f"{name}: data volume is writable",
            exec_sh(cid, "touch /data/probe && rm /data/probe").returncode == 0,
        )
        checks.add(
            f"{name}: no Docker socket inside",
            exec_sh(cid, "test ! -e /var/run/docker.sock").returncode == 0,
        )
        checks.add(
            f"{name}: uid is 65532", exec_sh(cid, "id -u").stdout.strip() == "65532"
        )

    print("Authenticated control -> target flow")
    health_status, health = None, None
    for _ in range(60):
        try:
            health_status, health = Browser(base).json("GET", "/api/health")
            if health_status == 200:
                break
        except OSError:
            pass
        time.sleep(1)
    checks.add(
        "control answers on the published loopback port",
        health_status == 200,
        str(health_status),
    )
    checks.add(
        "control reaches the target with its secret (health probe)",
        isinstance(health, dict) and health.get("services", {}).get("target") == "ok",
        json.dumps(health.get("services") if isinstance(health, dict) else health),
    )

    learner, other = Browser(base), Browser(base)
    bodies = []
    status, scenarios = learner.json("GET", "/api/scenarios")
    bodies.append(("/api/scenarios", scenarios))
    checks.add(
        "scenario catalog served", status == 200 and bool(scenarios.get("scenarios"))
    )
    status, run_body = learner.json(
        "POST",
        "/api/runs",
        {"scenario_id": "stolen-session", "mode": "practice", "assistance": "coached"},
    )
    created = status == 200 and isinstance(run_body, dict) and "run_id" in run_body
    checks.add(
        "learner can provision a fresh target through control",
        created,
        f"{status} {str(run_body)[:160]}",
    )
    if not created:
        return
    rid = run_body["run_id"]
    bodies.append(("create", run_body))
    status, _ = learner.json("POST", f"/api/runs/{rid}/start")
    checks.add("run starts", status == 200, str(status))
    # A coached launch is intentionally paused; no model generation is needed
    # for an isolation proof. Readiness still reaches the genuine local runtime.
    for path in [
        f"/api/runs/{rid}",
        f"/api/runs/{rid}/events",
        "/api/runs",
        "/api/progress",
        "/api/health",
    ]:
        status, body = learner.json("GET", path)
        bodies.append((path, body))
        checks.add(
            f"GET {path.replace(rid, '{run}')} succeeds", status == 200, str(status)
        )

    print("Browser-visible data")
    blob = json.dumps([b for _, b in bodies])
    checks.add(
        "no range secret in any browser-visible response",
        env["RANGE_SECRET"] not in blob,
    )
    checks.add(
        "no instructor PIN in any browser-visible response",
        env["INSTRUCTOR_PIN"] not in blob,
    )
    # /api/progress aggregates the learner's own finished attempts (already disclosed in their debriefs); every other
    # body here describes the run in progress, which must carry no scenario-private field.
    live = [b for name, b in bodies if name != "/api/progress"]
    leaked = sorted({k for b in live for k in keys_of(b)} & HIDDEN_KEYS)
    checks.add(
        "no hidden scenario fields in live-run responses", not leaked, ",".join(leaked)
    )

    print("Access control at the browser edge")
    status, _ = other.json("GET", f"/api/runs/{rid}")
    checks.add("a different learner cannot read the run", status == 404, str(status))
    status, _ = other.json("POST", f"/api/runs/{rid}/finish")
    checks.add("a different learner cannot change the run", status == 404, str(status))
    status, _ = learner.json("GET", "/api/instructor")
    checks.add("a learner cannot reach instructor routes", status == 403, str(status))
    status, _ = learner.json(
        "POST",
        "/api/runs",
        {"scenario_id": "stolen-session"},
        {"Origin": "http://evil.example"},
    )
    checks.add("cross-origin mutations are refused", status == 403, str(status))

    learner.json("POST", f"/api/runs/{rid}/abort")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--receipt", default=str(ROOT / "docs/model-card/COMPOSE_ISOLATION_PROOF.json")
    )
    parser.add_argument(
        "--keep", action="store_true", help="leave the stack running for inspection"
    )
    args = parser.parse_args()

    if run(["docker", "info"], check=False, timeout=30).returncode:
        print("Docker is not reachable; nothing was verified.", file=sys.stderr)
        return 2

    # Bridge-only relay to the host's genuine local model. Bind only Docker's
    # bridge address, allow only the readiness endpoint, never invent a response.
    bridge = json.loads(run(["docker", "network", "inspect", "bridge"]).stdout)[0]
    gateway = bridge["IPAM"]["Config"][0]["Gateway"]
    class ReadinessRelay(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path != "/api/tags":
                self.send_error(403); return
            connection = http.client.HTTPConnection("127.0.0.1", 11434, timeout=5)
            try:
                connection.request("GET", "/api/tags")
                response = connection.getresponse(); body = response.read()
                self.send_response(response.status); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(body)
            except OSError:
                self.send_error(503)
            finally:
                connection.close()
        def log_message(self, *args):
            pass
    relay = ThreadingHTTPServer((gateway, 0), ReadinessRelay)
    threading.Thread(target=relay.serve_forever, daemon=True).start()

    env = {
        **__import__("os").environ,
        "RANGE_SECRET": secrets.token_hex(24),
        "INSTRUCTOR_PIN": secrets.token_urlsafe(12),
    }
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    override = Path(tempfile.mkdtemp(prefix="cydeline-compose-")) / "override.yaml"
    override.write_text(
        f'services:\n  control:\n    environment:\n      OLLAMA_HOST: "http://{gateway}:{relay.server_port}"\n    ports: !override\n      - "127.0.0.1:{port}:8000"\n'
    )
    compose = [
        "docker",
        "compose",
        "-p",
        PROJECT,
        "-f",
        "compose.yaml",
        "-f",
        str(override),
    ]
    checks = Checks()
    started = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    error = None
    try:
        print("Building and starting target + control ...")
        run([*compose, "up", "-d", "--build", "--no-deps", *SERVICES], env=env)
        containers = {
            name: run([*compose, "ps", "-q", name], env=env).stdout.strip()
            for name in SERVICES
        }
        if not all(containers.values()):
            raise RuntimeError("A service did not start: " + json.dumps(containers))
        verify(checks, env, base, containers)
    except Exception as exc:  # noqa: BLE001 -- report any harness failure as a failed proof rather than a traceback
        error = f"{type(exc).__name__}: {exc}"
        print("Harness error:", error, file=sys.stderr)
    finally:
        relay.shutdown(); relay.server_close()
        if not args.keep:
            down = run(
                [*compose, "down", "-v", "--remove-orphans", "--rmi", "local"],
                env=env,
                check=False,
            )
            if down.returncode:
                print(
                    "WARNING: teardown reported a problem:",
                    down.stderr.strip()[-300:],
                    file=sys.stderr,
                )
        override.unlink(missing_ok=True)
        override.parent.rmdir()

    leftover = run(
        [
            "docker",
            "ps",
            "-aq",
            "--filter",
            f"label=com.docker.compose.project={PROJECT}",
        ],
        check=False,
    ).stdout.split()
    if not args.keep:
        checks.add(
            "teardown leaves no containers behind", not leftover, ",".join(leftover)
        )
    receipt = {
        "proof": "compose-isolation",
        "started_at": started,
        "finished_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "scope": "Unique disposable target/control project. Genuine host Ollama readiness through a bridge-bound GET /api/tags relay. Coached run remains paused; no model generations or optional tool claims.",
        "project": PROJECT,
        "passed": checks.passed and error is None,
        "harness_error": error,
        "checks": checks.items,
    }
    Path(args.receipt).write_text(json.dumps(receipt, indent=2) + "\n")
    print(
        f"\n{sum(i['passed'] for i in checks.items)}/{len(checks.items)} checks passed; receipt: {args.receipt}"
    )
    return 0 if receipt["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
