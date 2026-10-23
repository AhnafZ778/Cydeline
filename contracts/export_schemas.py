"""Export canonical JSON Schemas for non-Python consumers (browser + model).

Run from the repository root::

    python -m contracts.export_schemas

Output is deterministic and committed under ``contracts/schemas/`` so Ahnaf and
Tanvir can consume the frozen contract without a Python toolchain.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Any

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from contracts.adapter import (
    AttackerActionResult,
    AttackerHandles,
    DefenderActionResult,
    ProbeResult,
    TargetAuditEntry,
    TargetProvisionResult,
    TeardownProof,
)
from contracts.enums import (
    CANONICAL_ENUMS,
    AccessOutcome,
    EventSource,
    EventType,
    HealthStatus,
    Role,
    ScoreDimension,
    SessionStatus,
    enum_values,
)
from contracts.models import CONTRACT_MODELS, CONTRACT_SCHEMA_VERSION

SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"

ADAPTER_MODELS: dict[str, type] = {
    "AttackerHandles": AttackerHandles,
    "TargetProvisionResult": TargetProvisionResult,
    "AttackerActionResult": AttackerActionResult,
    "DefenderActionResult": DefenderActionResult,
    "TargetAuditEntry": TargetAuditEntry,
    "ProbeResult": ProbeResult,
    "TeardownProof": TeardownProof,
}

ALL_SCHEMA_MODELS: dict[str, type] = {**CONTRACT_MODELS, **ADAPTER_MODELS}

SUPPORTING_ENUMS: dict[str, type] = {
    "Role": Role,
    "SessionStatus": SessionStatus,
    "AccessOutcome": AccessOutcome,
    "EventSource": EventSource,
    "EventType": EventType,
    "HealthStatus": HealthStatus,
    "ScoreDimension": ScoreDimension,
}


def render_schemas() -> dict[str, dict[str, Any]]:
    """Return ``{model_name: json_schema}`` without touching disk."""

    return {name: model.model_json_schema() for name, model in ALL_SCHEMA_MODELS.items()}


def render_enums() -> dict[str, Any]:
    """Return the enum vocabulary consumed by the browser mock layer."""

    return {
        "contract_schema_version": CONTRACT_SCHEMA_VERSION,
        "canonical": {name: list(values) for name, values in CANONICAL_ENUMS.items()},
        "supporting": {
            name: list(enum_values(enum_type)) for name, enum_type in SUPPORTING_ENUMS.items()
        },
    }


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )


def export_schemas(destination: Path | None = None) -> list[Path]:
    """Write every schema plus ``enums.json``. Returns the written paths."""

    directory = destination or SCHEMA_DIR
    directory.mkdir(parents=True, exist_ok=True)

    written: list[Path] = []
    for name, schema in render_schemas().items():
        path = directory / f"{name}.schema.json"
        _write_json(path, schema)
        written.append(path)

    enums_path = directory / "enums.json"
    _write_json(enums_path, render_enums())
    written.append(enums_path)
    return written


def main() -> int:
    written = export_schemas()
    print(json.dumps({"exported": [str(path.relative_to(SCHEMA_DIR.parent.parent)) for path in written]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = [
    "ADAPTER_MODELS",
    "ALL_SCHEMA_MODELS",
    "SCHEMA_DIR",
    "export_schemas",
    "render_enums",
    "render_schemas",
]
