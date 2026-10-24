"""Exercise QEMU/KVM and Guacamole using a synthetic, non-bootable disk.

This proves gateway authentication/isolation/cleanup, not Windows OS boot.
Requires the built cydeline-windows:1 image, Docker, KVM and the normal memory gate.
Run: .venv/bin/python scripts/prove_windows_gateway.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import hashlib
import json
import os
import subprocess
import tempfile
import time
import urllib.parse
from pathlib import Path

import httpx

from services.range_runtime.tool_worker import Launch, ToolWorker

with tempfile.TemporaryDirectory(prefix="cydeline-hypervisor-") as tmp:
    base = Path(tmp) / "synthetic.qcow2"
    subprocess.run(
        ["qemu-img", "create", "-q", "-f", "qcow2", str(base), "64M"], check=True
    )
    before = hashlib.sha256(base.read_bytes()).hexdigest()
    os.environ["WINDOWS_BASE_IMAGE"] = str(base)
    worker = ToolWorker(Path(tmp) / "jobs")
    rid = "run_winbiossmoke"
    try:
        worker.launch(
            rid,
            Launch(
                profile="desktop",
                principal="smoke",
                events=[{"event_id": "evt_visible"}],
            ),
        )
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            result = worker.status(rid)
            if result["status"] in {"ready", "failed"}:
                break
            time.sleep(1)
        if result["status"] != "ready":
            raise RuntimeError(result.get("message", result["status"]))
        job = worker.load(rid)
        gateway = "http://127.0.0.1:" + str(job["port"]) + "/guacamole/"
        assert httpx.get(gateway, timeout=10).status_code == 200
        grant = urllib.parse.parse_qs(urllib.parse.urlparse(result["url"]).query)[
            "data"
        ][0]
        auth = httpx.post(gateway + "api/tokens", data={"data": grant}, timeout=15)
        assert auth.status_code == 200, str(auth.status_code) + auth.text[:150]
        token = auth.json()["authToken"]
        datasource = auth.json()["dataSource"]
        con = httpx.get(
            gateway + "api/session/data/" + datasource + "/connections",
            params={"token": token},
            timeout=10,
        )
        assert con.status_code == 200, con.text[:150]
        assert any(c["protocol"] == "vnc" for c in con.json().values()), con.text[:150]
        inspection = json.loads(worker.docker("inspect", job["desktop"]))[0]
        mounts = inspection["Mounts"]
        assert all(
            not m["RW"]
            for m in mounts
            if m["Destination"] in {"/image/windows.qcow2", "/evidence"}
        )
        assert set(inspection["NetworkSettings"]["Networks"]) == {job["network"]}
        assert not any(inspection["NetworkSettings"]["Ports"].values())
        assert hashlib.sha256(base.read_bytes()).hexdigest() == before
        print(
            json.dumps(
                {
                    "verdict": "passed",
                    "scope": "Synthetic BIOS disk only; Windows OS boot remains unverified",
                    "checks": [
                        "QEMU/KVM display",
                        "Guacamole HTTP",
                        "signed grant authentication",
                        "VNC connection registered",
                        "base/evidence read-only",
                        "VM internal-only",
                        "base unchanged",
                    ],
                }
            ),
            flush=True,
        )
    finally:
        worker.stop(rid)
        remaining = subprocess.check_output(
            ["docker", "ps", "-aq", "--filter", "label=cydeline.run=" + rid], text=True
        ).strip()
        assert not remaining, remaining
        print("Generation-scoped cleanup passed", flush=True)
