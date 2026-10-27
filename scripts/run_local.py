"""Start the local target, control and web UI. Ctrl+C stops only these children."""

from __future__ import annotations
import argparse, os, secrets, signal, subprocess, sys, time
from pathlib import Path
from urllib.request import Request, build_opener, ProxyHandler

ROOT = Path(__file__).resolve().parents[1]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--web-port", type=int, default=5173)
    p.add_argument("--backend-only", action="store_true")
    p.add_argument("--require-access-codes", action="store_true", help="Disable password-free local demo switching")
    p.add_argument("--runtime", default=".runtime")
    p.add_argument("--windows-image", help="Prepared standalone Windows qcow2 base; saved for this local runtime")
    a = p.parse_args()
    runtime = Path(a.runtime).resolve()
    runtime.mkdir(parents=True, exist_ok=True)
    image_config = runtime / "windows-base-image"
    if a.windows_image:
        image_path = Path(a.windows_image).expanduser().resolve()
        if not image_path.is_file() or image_path.suffix.lower() != ".qcow2":
            p.error("--windows-image must name an existing prepared qcow2 file")
        image_config.write_text(str(image_path) + "\n")
    windows_image = os.environ.get("WINDOWS_BASE_IMAGE") or (image_config.read_text().strip() if image_config.is_file() else "")
    if a.windows_image:
        windows_image = str(image_path)
    secretfile = runtime / "range-secret"
    if not secretfile.exists():
        secretfile.write_text(secrets.token_urlsafe(32))
        secretfile.chmod(0o600)
    env = {
        **os.environ,
        "PYTHONPATH": str(ROOT),
        "RANGE_SECRET": secretfile.read_text().strip(),
        "TARGET_DB": str(runtime / "target.sqlite3"),
        "RUNTIME_DIR": str(runtime),
        "LOCAL_DEMO_ACCESS": "0" if a.require_access_codes else "1",
        "TARGET_URL": f"http://127.0.0.1:{a.port + 1}",
        "RANGE_WORKER_URL": f"http://127.0.0.1:{a.port + 2}",
        "TOOL_RUNTIME_DIR": str(runtime / "tools"),
        "VITE_CONTROL_API_URL": f"http://127.0.0.1:{a.port}",
        "RED_AGENT_TIMEOUT_MS": os.environ.get("RED_AGENT_TIMEOUT_MS") or "30000",
        **({"WINDOWS_BASE_IMAGE": windows_image} if windows_image else {}),
    }
    children = []
    commands = [
        [
            sys.executable,
            "-m",
            "uvicorn",
            "apps.range-worker.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(a.port + 2),
        ],
        [
            sys.executable,
            "-m",
            "uvicorn",
            "apps.target-api.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(a.port + 1),
        ],
        [
            sys.executable,
            "-m",
            "uvicorn",
            "apps.control-api.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(a.port),
        ],
    ]
    if not a.backend_only:
        commands.append(
            [
                "npm",
                "--prefix",
                "apps/web",
                "run",
                "dev",
                "--",
                "--host",
                "127.0.0.1",
                "--port",
                str(a.web_port),
                "--strictPort",
            ]
        )

    def stop(*_):
        for child in children:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
        for child in children:
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    try:
        for command in commands:
            if "uvicorn" in command:
                command.append("--no-proxy-headers")
            child = subprocess.Popen(command, cwd=ROOT, env=env, start_new_session=True)
            children.append(child)
            if "apps.target-api.main:app" in command:
                # Control startup reconciles saved runs with the target. Wait
                # for that dependency so a normal local restart preserves them.
                deadline = time.monotonic() + 15
                local_http = build_opener(ProxyHandler({}))
                while True:
                    try:
                        request = Request(env["TARGET_URL"] + "/health", headers={"x-range-secret": env["RANGE_SECRET"]})
                        with local_http.open(request, timeout=1) as response:
                            if response.status == 200:
                                break
                    except OSError:
                        pass
                    if child.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError("Target did not become ready; saved exercises were left untouched")
                    time.sleep(0.1)
        print(
            f"Live SOC: http://127.0.0.1:{a.web_port} | " + ("Access codes required" if a.require_access_codes else "Local demo: password-free Training / Instructor switch"),
            flush=True,
        )
        while all(child.poll() is None for child in children):
            time.sleep(0.5)
        return 1
    finally:
        stop()


if __name__ == "__main__":
    raise SystemExit(main())
