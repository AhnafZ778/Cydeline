"""Opt-in proof of the optional analyst tools against a running local range (scripts/run_local.py) and real Docker.

For one profile (`desktop` = Guacamole + XFCE, `siem` = Elasticsearch + Kibana) it provisions a live run through the same
browser-facing API a learner uses, launches the tool, waits for it, inspects the resulting containers and network, confirms the
tool answers on loopback, then proves that ending the run tears everything down. The worker's own memory gate is honored: if the
host cannot satisfy it the result is reported as `gated`, never forced.

    INSTRUCTOR_PIN=... .venv/bin/python scripts/prove_optional_tools.py siem [--base http://127.0.0.1:18000]

Exit codes: 0 proved, 1 a check failed, 2 prerequisites missing, 3 refused by the memory gate (not a failure of the tool).
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from verify_compose_isolation import Browser

LEASE_FIELDS_FORBIDDEN = {"password", "key", "secret", "token"}
TERMINAL_TOOL = {"ready", "failed", "stopped", "expired"}


def docker(*args, check=False):
    return subprocess.run(
        ["docker", *args], capture_output=True, text=True, check=check, timeout=180
    )


def labelled(rid):
    out = docker("ps", "-aq", "--filter", f"label=cydeline.run={rid}").stdout.split()
    return out


def networks(rid):
    return docker(
        "network", "ls", "-q", "--filter", f"label=cydeline.run={rid}"
    ).stdout.split()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("profile", choices=["desktop", "siem"])
    parser.add_argument("--base", default="http://127.0.0.1:18000")
    parser.add_argument("--timeout", type=int, default=480)
    parser.add_argument("--receipt")
    args = parser.parse_args()
    receipt_path = Path(
        args.receipt
        or ROOT / f"docs/model-card/OPTIONAL_TOOL_PROOF_{args.profile.upper()}.json"
    )

    checks, notes = [], {}

    def check(name, ok, detail=""):
        checks.append(
            {"check": name, "passed": bool(ok), "detail": detail if not ok else ""}
        )
        print(
            ("PASS  " if ok else "FAIL  ")
            + name
            + (f"  [{detail}]" if detail and not ok else ""),
            flush=True,
        )

    if docker("info").returncode:
        print("Docker is not reachable.", file=sys.stderr)
        return 2
    learner = Browser(args.base)
    status, health = learner.json("GET", "/api/health")
    if status != 200 or "tools" not in health.get("services", {}):
        print(
            "The range is not running with the optional-tool worker (scripts/run_local.py).",
            file=sys.stderr,
        )
        return 2

    admin = Browser(args.base)
    pin = os.environ.get("INSTRUCTOR_PIN")
    if pin:
        admin.json("POST", "/api/session", {"code": pin})
        for run in admin.json("GET", "/api/runs")[1].get("runs", []):
            if run["state"] not in {
                "completed",
                "timed_out",
                "aborted",
                "technical_failure",
            }:
                admin.json("POST", f"/api/runs/{run['run_id']}/abort")

    started = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    rid, verdict = None, "failed"
    try:
        status, run = learner.json(
            "POST",
            "/api/runs",
            {
                "scenario_id": "stolen-session",
                "mode": "practice",
                "assistance": "coached",
            },
        )
        if status != 200:
            print(
                f"Could not create a run ({status}): {str(run)[:200]}", file=sys.stderr
            )
            return 2
        rid = run["run_id"]
        learner.json("POST", f"/api/runs/{rid}/start")
        deadline = time.time() + 90
        events = []
        while time.time() < deadline and len(events) < 3:
            time.sleep(2)
            events = [
                e
                for e in learner.json("GET", f"/api/runs/{rid}/events")[1]["events"]
                if e["source"] == "target-access"
            ]
        check(
            "run produced released evidence for the tool to receive",
            len(events) >= 3,
            str(len(events)),
        )

        # Preparing a tool takes minutes and ending a run stops its tools; hold the shift clock so the launch can finish.
        learner.json("POST", f"/api/runs/{rid}/pause")
        launch_status, launched = learner.json(
            "POST", f"/api/runs/{rid}/tools/{args.profile}"
        )
        if launch_status == 503 and "memory" in json.dumps(launched).lower():
            print(
                "GATED: the worker refused this profile for lack of free memory (this is its designed behavior)."
            )
            verdict = "gated"
            notes["worker_message"] = launched.get("message")
            return 3
        check(
            "launch accepted",
            launch_status == 200,
            f"{launch_status} {str(launched)[:200]}",
        )

        begun, state, trail = time.time(), launched, [launched.get("status")]
        while (
            time.time() - begun < args.timeout
            and state.get("status") not in TERMINAL_TOOL
        ):
            time.sleep(5)
            _, state = learner.json("GET", f"/api/runs/{rid}/tools/{args.profile}")
            if state.get("status") != trail[-1]:
                trail.append(state.get("status"))
        notes.update(ready_after_sec=round(time.time() - begun), status_trail=trail)
        check(
            f"{args.profile} reaches ready",
            state.get("status") == "ready",
            f"{state.get('status')}: {state.get('message')}",
        )
        check(
            "the learner response carries no credentials",
            not (LEASE_FIELDS_FORBIDDEN & {k.lower() for k in state}),
            ",".join(state),
        )

        ids = labelled(rid)
        check(
            "tool containers exist and are labelled to this run",
            len(ids) >= 2,
            str(len(ids)),
        )
        names = {}
        for cid in ids:
            inspected = json.loads(docker("inspect", cid).stdout or "[]")
            if not inspected:
                check(
                    f"container {cid[:12]} still exists to inspect",
                    False,
                    "removed while the proof ran",
                )
                continue
            info = inspected[0]
            host, name = info["HostConfig"], info["Name"].lstrip("/")
            names[cid] = name
            check(f"{name}: capabilities dropped", "ALL" in (host.get("CapDrop") or []))
            check(
                f"{name}: no-new-privileges",
                any("no-new-privileges" in s for s in host.get("SecurityOpt") or []),
            )
            check(
                f"{name}: memory/pid limits set",
                (host.get("Memory") or 0) > 0 and (host.get("PidsLimit") or 0) > 0,
            )
            check(
                f"{name}: not privileged, no Docker socket",
                host.get("Privileged") is False
                and not any("docker.sock" in b for b in host.get("Binds") or []),
            )
            published = [
                b["HostIp"]
                for binds in (host.get("PortBindings") or {}).values()
                for b in binds
            ]
            check(
                f"{name}: any published port is loopback-only",
                all(ip == "127.0.0.1" for ip in published),
                ",".join(published),
            )
        nets = networks(rid)
        check("a per-run network exists", len(nets) == 1, str(len(nets)))
        if nets:
            internal = json.loads(docker("network", "inspect", nets[0]).stdout)[0]
            check(
                "the tool network is internal (no egress)",
                internal.get("Internal") is True,
            )

        if state.get("status") == "ready" and state.get("url"):
            url = state["url"]
            check(
                "the access URL is loopback",
                url.startswith("http://127.0.0.1:"),
                url.split("?")[0],
            )
            code = None
            for _ in range(20):
                try:
                    with urllib.request.urlopen(url, timeout=15) as response:
                        code = response.status
                except urllib.error.HTTPError as error:
                    code = error.code
                except OSError:
                    code = None
                if code and code < 500:
                    break
                time.sleep(3)
            check(
                "the tool answers on loopback",
                code is not None and code < 500,
                str(code),
            )
            if args.profile == "siem":
                es = next((c for c, n in names.items() if "elasticsearch" in n), None)
                count = (
                    docker(
                        "exec",
                        es,
                        "sh",
                        "-c",
                        "curl -s -u elastic:$ELASTIC_PASSWORD 'http://localhost:9200/northstar-*/_count'",
                    ).stdout
                    if es
                    else ""
                )
                try:
                    indexed = json.loads(count).get("count", 0)
                except ValueError:
                    indexed = 0
                notes["indexed_events"] = indexed
                check(
                    "run evidence is indexed into the disposable cluster",
                    indexed > 0,
                    count[:120],
                )
                check(
                    "only released evidence is indexed",
                    indexed
                    <= len(learner.json("GET", f"/api/runs/{rid}/events")[1]["events"]),
                    str(indexed),
                )

        learner.json("POST", f"/api/runs/{rid}/abort")
        for _ in range(30):
            if not labelled(rid) and not networks(rid):
                break
            time.sleep(2)
        check(
            "ending the run removes every tool container",
            not labelled(rid),
            str(labelled(rid)),
        )
        check(
            "ending the run removes the tool network",
            not networks(rid),
            str(networks(rid)),
        )
        _, after = learner.json("GET", f"/api/runs/{rid}/tools/{args.profile}")
        check(
            "status reports the tool as stopped",
            after.get("status") in {"stopped", "expired"},
            str(after.get("status")),
        )
        verdict = "proved" if all(c["passed"] for c in checks) else "failed"
    finally:
        if rid:
            learner.json("DELETE", f"/api/runs/{rid}/tools/{args.profile}")
            learner.json("POST", f"/api/runs/{rid}/abort")
            for cid in labelled(
                rid
            ):  # last resort, scoped strictly to this run's label
                docker("rm", "-f", cid)
            for net in networks(rid):
                docker("network", "rm", net)
        receipt = {
            "proof": f"optional-tool-{args.profile}",
            "started_at": started,
            "finished_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            "verdict": verdict,
            "notes": notes,
            "checks": checks,
        }
        receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
        print(
            f"\nverdict: {verdict}; {sum(c['passed'] for c in checks)}/{len(checks)} checks; receipt: {receipt_path}"
        )
    return 0 if verdict == "proved" else 1


if __name__ == "__main__":
    raise SystemExit(main())
