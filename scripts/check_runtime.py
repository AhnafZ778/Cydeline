"""Portable harness entry point for backend tests using the project environment."""

import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
python = root / ".venv/bin/python"
if not python.exists():
    print(
        "Create .venv and install requirements.txt before running runtime checks.",
        file=sys.stderr,
    )
    raise SystemExit(2)
raise SystemExit(
    subprocess.call(
        [
            str(python),
            "-m",
            "pytest",
            "tests/agent",
            "tests/control",
            "tests/target",
            "-q",
        ],
        cwd=root,
    )
)
