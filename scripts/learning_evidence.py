"""Crash-safe evidence checkpoints and strict saved-record identity checks."""
import json
import os
import tempfile
from pathlib import Path


def atomic_json(path, payload):
    path = Path(path)
    fd, temporary = tempfile.mkstemp(prefix="." + path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(payload, stream, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def validate_records(records, canonical, fields):
    seen = set()
    for record in records:
        identity = record.get("id")
        if identity not in canonical or identity in seen:
            raise ValueError("Unknown or duplicated saved evidence record")
        seen.add(identity)
        for field in fields:
            if record.get(field) != canonical[identity].get(field):
                raise ValueError("Saved evidence metadata changed: " + str(identity) + "/" + field)
