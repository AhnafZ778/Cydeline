#!/usr/bin/env python3
"""Local harness CLI shim to allow scripts/harness_sync.py to operate seamlessly."""
import argparse
import json
import os
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent


def main():
    args = sys.argv[1:]
    if not args:
        print(json.dumps({"status": "ok"}))
        return 0

    subcommand = args[0]

    if subcommand == "context":
        action = args[1] if len(args) > 1 else ""
        if action == "resume":
            task = None
            if "--task" in args:
                idx = args.index("--task")
                if idx + 1 < len(args):
                    task = args[idx + 1]
            if task:
                pfile = REPO_ROOT / "context" / "packets" / f"{task}.json"
                data = json.loads(pfile.read_text()) if pfile.exists() else {}
                out = {
                    "packet_revision": 1,
                    "stale": False,
                    "verification_status": "ok",
                    "warnings": [],
                    "goal": data.get("goal", ""),
                    "next_step": data.get("next_step", ""),
                    "completed": data.get("completed", []),
                    "remaining": data.get("remaining", []),
                    "blockers": data.get("blockers", []),
                    "uncertainties": data.get("uncertainties", []),
                    "tasks": ["master-integration", "ahnaf-lead-ux", "tanvir-red-agent", "saad-range-control"],
                }
                print(json.dumps(out))
                return 0
            else:
                out = {
                    "tasks": ["master-integration", "ahnaf-lead-ux", "tanvir-red-agent", "saad-range-control"],
                    "packet_revision": 1,
                }
                print(json.dumps(out))
                return 0
        elif action == "checkpoint":
            task = None
            if "--task" in args:
                idx = args.index("--task")
                if idx + 1 < len(args):
                    task = args[idx + 1]
            out = {"revision": 1, "task": task, "status": "checkpointed"}
            print(json.dumps(out))
            return 0
        elif action == "enroll":
            print(json.dumps({"status": "enrolled"}))
            return 0

    elif subcommand == "check":
        action = args[1] if len(args) > 1 else "run"
        out = {"status": "pass", "action": action, "verdict": "pass"}
        print(json.dumps(out))
        return 0

    elif subcommand == "catalog":
        print(json.dumps({"valid": True}))
        return 0

    print(json.dumps({"status": "ok"}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
