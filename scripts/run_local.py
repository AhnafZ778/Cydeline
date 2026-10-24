"""Start the local target, control and web UI. Ctrl+C stops only these children."""

from __future__ import annotations
import argparse, os, secrets, signal, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--web-port", type=int, default=5173)
    p.add_argument("--backend-only", action="store_true")
    p.add_argument("--runtime", default=".runtime")
    a = p.parse_args()
    runtime = Path(a.runtime).resolve()
    runtime.mkdir(parents=True, exist_ok=True)
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
        "TARGET_URL": f"http://127.0.0.1:{a.port + 1}",
        "RANGE_WORKER_URL": f"http://127.0.0.1:{a.port + 2}",
        "TOOL_RUNTIME_DIR": str(runtime / "tools"),
        "VITE_CONTROL_API_URL": f"http://127.0.0.1:{a.port}",
        "RED_AGENT_TIMEOUT_MS": os.environ.get("RED_AGENT_TIMEOUT_MS") or "30000",
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
            children.append(
                subprocess.Popen(command, cwd=ROOT, env=env, start_new_session=True)
            )
        print(
            f"Live SOC: http://127.0.0.1:{a.web_port} | instructor code: {runtime / 'instructor-pin'}",
            flush=True,
        )
        while all(child.poll() is None for child in children):
            time.sleep(0.5)
        return 1
    finally:
        stop()


if __name__ == "__main__":
    raise SystemExit(main())
