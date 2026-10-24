"""Published scenario catalog, loaded from the reviewed artifacts under ``scenarios/``.

The ``manifest.json`` and ``rubric.json`` beside each scenario version are the only
definition of that version's title, pacing, routes and scoring weights. Nothing in
this module (or the engine) restates them, so editing an artifact is a reviewed,
hash-visible change rather than a silent code/data drift.
"""

from __future__ import annotations

import copy
import json
import os
from pathlib import Path

from .common import digest

SCENARIO_ROOT = Path(
    os.environ.get("SCENARIO_ROOT") or Path(__file__).resolve().parents[2] / "scenarios"
)

# The scorer in ``engine.Engine.score`` implements formulas for exactly these dimensions.
# A rubric that changes names or maxima must ship with a scorer change, so we refuse it.
SCORER_DIMENSIONS = (
    ("recognition", 20),
    ("containment", 25),
    ("verification", 20),
    ("continuity", 15),
    ("proportionality", 10),
    ("timeliness", 10),
)

# Pacing and answer-shape fields are server-side. Learners never receive them.
PRIVATE_KEYS = {
    "first_read_sec",
    "pivot_window_sec",
    "max_steps",
    "minimum_signals_before_first_protected_read",
    "first_ai_sec",
    "ai_interval_sec",
    "containment_target_sec",
    "lead_update_sec",
    "routes",
    "model_policy",
    "order",
    "objective_resource",
}

_REQUIRED = {
    "scenario_id": str,
    "version": str,
    "title": str,
    "summary": str,
    "duration_sec": int,
    "difficulty": str,
    "family": str,
    "order": int,
    "tools": list,
    "skills": list,
    "max_steps": int,
    "first_read_sec": int,
    "pivot_window_sec": int,
    "minimum_signals_before_first_protected_read": int,
    "first_ai_sec": int,
    "ai_interval_sec": int,
    "containment_target_sec": int,
    "routes": list,
    "schema_version": str,
}


class CatalogError(ValueError):
    """A published scenario artifact is malformed or disagrees with the scorer."""


def _read(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CatalogError(f"{path}: {exc}") from exc


def _rubric_dimensions(rubric, path):
    raw = rubric.get("dimensions")
    if isinstance(raw, dict):
        pairs = list(raw.items())
    elif isinstance(raw, list):
        pairs = [(d.get("dimension"), d.get("max_points")) for d in raw]
    else:
        raise CatalogError(f"{path}: dimensions must be an object or a list")
    if tuple(pairs) != SCORER_DIMENSIONS:
        raise CatalogError(
            f"{path}: rubric dimensions {pairs} are not implemented by the scorer "
            f"{list(SCORER_DIMENSIONS)}"
        )
    if sum(points for _, points in pairs) != 100:
        raise CatalogError(f"{path}: rubric maxima must sum to 100")
    return [{"dimension": d, "max_points": int(m)} for d, m in pairs]


def _load_one(manifest_path: Path):
    s = _read(manifest_path)
    if not isinstance(s, dict):
        raise CatalogError(f"{manifest_path}: expected an object")
    for key, kind in _REQUIRED.items():
        if not isinstance(s.get(key), kind) or isinstance(s.get(key), bool):
            raise CatalogError(f"{manifest_path}: {key} must be {kind.__name__}")
    for key in ("tools", "skills", "routes"):
        if not s[key] or not all(isinstance(x, str) and x for x in s[key]):
            raise CatalogError(f"{manifest_path}: {key} must be non-empty strings")
    if (
        min(
            s["duration_sec"],
            s["max_steps"],
            s["containment_target_sec"],
            s["ai_interval_sec"],
        )
        <= 0
    ):
        raise CatalogError(f"{manifest_path}: durations and steps must be positive")
    if s["routes"][0] != "sess_A":
        raise CatalogError(f"{manifest_path}: the browser route sess_A must come first")
    folder = manifest_path.parent
    if (folder.name, folder.parent.name) != (s["version"], s["scenario_id"]):
        raise CatalogError(f"{manifest_path}: path does not match scenario/version")
    lead = s.get("lead_update_sec")
    if lead is not None and (not isinstance(lead, int) or lead <= 0):
        raise CatalogError(f"{manifest_path}: lead_update_sec must be null or positive")
    rubric_path = folder / "rubric.json"
    rubric = _read(rubric_path)
    s["rubric"] = {
        "version": rubric.get("version") or rubric.get("rubric_id"),
        "dimensions": _rubric_dimensions(rubric, rubric_path),
        "hash": digest(rubric),
    }
    if not s["rubric"]["version"]:
        raise CatalogError(f"{rubric_path}: version or rubric_id is required")
    s["manifest_hash"] = digest({k: v for k, v in s.items() if k != "rubric"})
    return s


def load_catalog(root: Path | None = None):
    found = sorted((root or SCENARIO_ROOT).glob("*/*/manifest.json"))
    scenarios = [_load_one(p) for p in found]
    keys = [(s["scenario_id"], s["version"]) for s in scenarios]
    if not scenarios or len(set(keys)) != len(keys):
        raise CatalogError("Scenario catalog is empty or has duplicate versions")
    return sorted(scenarios, key=lambda s: (s["order"], s["scenario_id"], s["version"]))


SCENARIOS = load_catalog()


def manifest(s):
    """Learner-safe projection: no pacing, route list or rubric internals."""
    return {
        k: copy.deepcopy(v)
        for k, v in s.items()
        if k not in PRIVATE_KEYS | {"rubric", "manifest_hash"}
    }


def lookup(sid, version=None):
    return next(
        (
            copy.deepcopy(s)
            for s in SCENARIOS
            if s["scenario_id"] == sid and (version is None or s["version"] == version)
        ),
        None,
    )


def spec(r):
    """The pinned scenario spec of a run.

    Records written before pacing and routes moved into the published manifests are
    completed from the same published version; stored values always win.
    """
    s = r["scenario"]
    if "routes" in s and "rubric" in s:
        return s
    published = lookup(r["scenario_id"], r["scenario_version"]) or {}
    return {**published, **s}
