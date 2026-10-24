"""Versioned, reviewed target configurations. Private configuration never reaches learners."""
from __future__ import annotations
import copy
import json
from pathlib import Path
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from .common import DomainError, digest


class Workflow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    owner: Literal["maya", "eli", "reporting"]
    resource: str = Field(pattern=r"^doc_[A-Za-z0-9_]+$")
    kind: Literal["browser_session", "api_credential"] = "browser_session"


class Variant(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["learning-1"]
    id: Literal["baseline", "shared-work", "service-dependent"]
    version: Literal["1"]
    label: str
    scenario_id: Literal["stolen-session", "northstar-breach"]
    scenario_version: Literal["v1", "v2"]
    browser_handle: str = Field(pattern=r"^sess_[A-Za-z0-9_]+$")
    browser_owner: Literal["maya", "eli"]
    objective_resource: str = Field(pattern=r"^doc_[A-Za-z0-9_]+$")
    browser_objective_access: bool
    reporting_objective_access: bool
    reporting_owner: Literal["reporting", "maya", "eli"]
    concurrent_sessions: int = Field(ge=1, le=3)
    workflows: list[Workflow] = Field(min_length=2, max_length=3)
    background_denial: bool

    @model_validator(mode="after")
    def valid(self):
        if (self.scenario_id == "stolen-session") != (self.scenario_version == "v1"):
            raise ValueError("Scenario and version disagree")
        if self.scenario_version == "v1" and (not self.browser_objective_access or self.reporting_objective_access):
            raise ValueError("Session variants require one browser objective route")
        if not (self.browser_objective_access or self.reporting_objective_access):
            raise ValueError("Variant needs an actual objective-capable route")
        if len({w.owner for w in self.workflows}) != len(self.workflows):
            raise ValueError("Workflow owners must be unique")
        return self


ROOT = Path(__file__).resolve().parents[2] / "scenarios"


def variants(sid, version):
    records = []
    for path in sorted((ROOT / sid / version / "variants").glob("*.json")):
        item = Variant.model_validate_json(path.read_text()).model_dump()
        if item["scenario_id"] != sid or item["scenario_version"] != version:
            raise ValueError("Variant path and content disagree")
        records.append({**item, "manifest_hash": digest(item)})
    if len(records) != 3 or len({v["id"] for v in records}) != 3:
        raise ValueError("Exactly three reviewed variants are required per scenario")
    return sorted(records, key=lambda v: ("baseline", "shared-work", "service-dependent").index(v["id"]))


def select_variant(sid, version, variant_id=None):
    found = next((v for v in variants(sid, version) if v["id"] == (variant_id or "baseline")), None)
    if not found:
        raise DomainError("Variant is not published for this scenario", 422)
    return copy.deepcopy(found)


def public_variant(v):
    return {k: v[k] for k in ("id", "version", "label", "manifest_hash")}


def apply_variant(world, config, seed):
    w = copy.deepcopy(world)
    old = w["access"].pop("sess_A")
    old["owner"] = config["browser_owner"]
    objective = config["objective_resource"]
    if objective not in w["documents"]:
        w["documents"][objective] = {
            "title": "Payroll Reconciliation", "classification": "confidential",
            "contents": "Synthetic Northstar payroll training document.",
        }
    old["documents"] = ["doc_ops_02"] + ([objective] if config["browser_objective_access"] else [])
    old["documents"] = list(dict.fromkeys(old["documents"]))
    w["access"][config["browser_handle"]] = old
    for i in range(config["concurrent_sessions"]):
        w["access"]["sess_concurrent_" + str(i)] = {
            **copy.deepcopy(old), "documents": list(old["documents"]),
        }
    if "key_reporting" in w["access"]:
        key = w["access"]["key_reporting"]
        key["owner"] = config["reporting_owner"]
        key["documents"] = ["doc_ops_02"] + ([objective] if config["reporting_objective_access"] else [])
    w["learning_config"] = {
        "variant_id": config["id"], "manifest_hash": config["manifest_hash"],
        "routes": [config["browser_handle"]] + (["key_reporting"] if "key_reporting" in w["access"] else []),
        "objective_resource": objective, "workflows": config["workflows"],
        "concurrent_handles": ["sess_concurrent_" + str(i) for i in range(config["concurrent_sessions"])],
        "background_denial": config["background_denial"], "seed": seed,
    }
    return w
