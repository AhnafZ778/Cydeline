"""Loader and invariant checker for ``scenarios/stolen-session/v1``.

The scenario JSON is the reviewed configuration for *The Stolen Session*.
``hidden_ground_truth`` lives in the same server-side file but is marked
``server_only`` and must never be served to the learner browser or the model.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .enums import (
    RUBRIC_MAX_POINTS,
    AttackerAction,
    DefenderAction,
    Outcome,
    Verification,
    enum_values,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
SCENARIO_ROOT = REPO_ROOT / "scenarios" / "stolen-session" / "v1"
SCENARIO_PATH = SCENARIO_ROOT / "scenario.json"
RUBRIC_PATH = SCENARIO_ROOT / "rubric.json"

EXPECTED_SCENARIO_ID = "stolen-session"
EXPECTED_SCENARIO_VERSION = "v1"

REQUIRED_USERS = {
    "maya": "maya@northstar.test",
    "eli": "eli@northstar.test",
}
REQUIRED_SESSIONS = {"sess_A", "sess_eli"}
REQUIRED_DOCUMENTS = {"doc_finance_07", "doc_ops_02", "doc_handbook_01"}
REQUIRED_DEFENDER_ACTIONS = {action.value for action in DefenderAction}
REQUIRED_VERIFICATIONS = {verification.value for verification in Verification}
REQUIRED_OUTCOMES = {outcome.value for outcome in Outcome}


class ScenarioValidationError(ValueError):
    """Raised when a reviewed scenario or rubric drifts from the contract."""


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise ScenarioValidationError(f"missing scenario file: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ScenarioValidationError(f"{path} is not valid JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise ScenarioValidationError(f"{path} must contain a JSON object")
    return payload


def load_scenario() -> dict[str, Any]:
    """Return the scenario v1 configuration."""

    return _read_json(SCENARIO_PATH)


def load_rubric() -> dict[str, Any]:
    """Return the 100-point rubric configuration."""

    return _read_json(RUBRIC_PATH)


def canonical_json(payload: Any) -> str:
    """Deterministic JSON used for fixture and trace hashes."""

    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def scenario_fixture_hash(scenario: dict[str, Any] | None = None) -> str:
    """SHA-256 over the canonical scenario content.

    The target records this hash at ``create_fresh_target`` so a reset can prove
    it restored the reviewed fixture rather than a mutated one (FR-A06, AT-08).
    """

    return hashlib.sha256(canonical_json(scenario or load_scenario()).encode("utf-8")).hexdigest()


def validate_scenario_config(
    scenario: dict[str, Any], rubric: dict[str, Any]
) -> list[str]:
    """Return every invariant violation. An empty list means the config is valid."""

    errors: list[str] = []

    if scenario.get("scenario_id") != EXPECTED_SCENARIO_ID:
        errors.append(f"scenario_id must be {EXPECTED_SCENARIO_ID!r}")
    if scenario.get("version") != EXPECTED_SCENARIO_VERSION:
        errors.append(f"version must be {EXPECTED_SCENARIO_VERSION!r}")
    if scenario.get("fictional") is not True:
        errors.append("scenario must remain a fictional organization")

    organization = scenario.get("organization", {})
    if organization.get("domain") != "northstar.test":
        errors.append("organization.domain must be 'northstar.test'")

    users = scenario.get("users", [])
    user_by_id = {user.get("user_id"): user for user in users}
    for user_id, email in REQUIRED_USERS.items():
        user = user_by_id.get(user_id)
        if user is None:
            errors.append(f"missing user {user_id!r}")
        elif user.get("email") != email:
            errors.append(f"user {user_id!r} must use {email!r}")

    sessions = scenario.get("sessions", [])
    session_by_handle = {session.get("session_handle"): session for session in sessions}
    for handle in REQUIRED_SESSIONS:
        if handle not in session_by_handle:
            errors.append(f"missing session {handle!r}")
    sess_a = session_by_handle.get("sess_A", {})
    if sess_a.get("user_id") != "maya":
        errors.append("sess_A must belong to maya")
    if sess_a.get("status") != "active":
        errors.append("sess_A must start active")
    if session_by_handle.get("sess_eli", {}).get("user_id") != "eli":
        errors.append("sess_eli must belong to eli")

    documents = scenario.get("documents", [])
    document_by_id = {document.get("document_id"): document for document in documents}
    for document_id in REQUIRED_DOCUMENTS:
        if document_id not in document_by_id:
            errors.append(f"missing document {document_id!r}")
    finance = document_by_id.get("doc_finance_07", {})
    if finance.get("protected") is not True:
        errors.append("doc_finance_07 must be protected")
    maya_role = user_by_id.get("maya", {}).get("role")
    if maya_role and maya_role not in finance.get("allowed_roles", []):
        errors.append("doc_finance_07 must be readable by Maya's role")

    policy = scenario.get("access_policy", {})
    for key in (
        "require_active_session",
        "require_active_account",
        "deny_after_session_revocation",
        "deny_after_account_disable",
        "reauth_invalidates_existing_sessions",
    ):
        if policy.get(key) is not True:
            errors.append(f"access_policy.{key} must be true")

    attacker = scenario.get("attacker_budget", {})
    allowlisted = set(attacker.get("allowlisted_actions", []))
    unknown_attacker = allowlisted - set(enum_values(AttackerAction))
    if unknown_attacker:
        errors.append(f"attacker_budget has non-canonical actions: {sorted(unknown_attacker)}")
    if AttackerAction.REQUEST_DOCUMENT.value not in allowlisted:
        errors.append("attacker_budget must allow request_document")

    defender_actions = scenario.get("defender_actions", [])
    configured_defender = {entry.get("action") for entry in defender_actions}
    missing_defender = REQUIRED_DEFENDER_ACTIONS - configured_defender
    if missing_defender:
        errors.append(f"missing defender actions: {sorted(missing_defender)}")
    unknown_defender = configured_defender - REQUIRED_DEFENDER_ACTIONS
    if unknown_defender:
        errors.append(f"non-canonical defender actions: {sorted(unknown_defender)}")

    benign = scenario.get("benign_workflows", [])
    if not any(
        workflow.get("user_id") == "eli"
        and workflow.get("target_id") == "doc_ops_02"
        and workflow.get("must_pass") is True
        for workflow in benign
    ):
        errors.append("benign_workflows must include Eli's required doc_ops_02 read")

    required_checks = set(scenario.get("verification", {}).get("required_checks", []))
    if required_checks != REQUIRED_VERIFICATIONS:
        errors.append("verification.required_checks must contain both canonical probes")
    if scenario.get("verification", {}).get("both_required_for_recovery") is not True:
        errors.append("verification.both_required_for_recovery must be true")

    pacing = scenario.get("pacing", {})
    if pacing.get("minimum_signals_before_first_protected_read", 0) < 1:
        errors.append("pacing requires at least one visible signal before a protected read")
    if pacing.get("minimum_virtual_seconds_before_first_protected_read", 0) < 1:
        errors.append("pacing requires a non-zero virtual observation window")

    truth = scenario.get("hidden_ground_truth", {})
    if truth.get("visibility") != "server_only":
        errors.append("hidden_ground_truth.visibility must be 'server_only'")
    if truth.get("do_not_serve_to_browser_or_model") is not True:
        errors.append("hidden_ground_truth must be marked do_not_serve_to_browser_or_model")
    if truth.get("compromised_session") != "sess_A":
        errors.append("hidden_ground_truth.compromised_session must be 'sess_A'")
    if truth.get("protected_resource") != "doc_finance_07":
        errors.append("hidden_ground_truth.protected_resource must be 'doc_finance_07'")
    if truth.get("benign_user") != "eli":
        errors.append("hidden_ground_truth.benign_user must be 'eli'")

    if rubric.get("rubric_id") != "stolen-session-v1":
        errors.append("rubric_id must be 'stolen-session-v1'")
    if rubric.get("total_points") != 100:
        errors.append("rubric.total_points must be 100")

    dimensions = rubric.get("dimensions", [])
    configured = {entry.get("dimension"): entry for entry in dimensions}
    if set(configured) != {dimension.value for dimension in RUBRIC_MAX_POINTS}:
        errors.append("rubric must define exactly the six canonical dimensions")
    for dimension, expected in RUBRIC_MAX_POINTS.items():
        entry = configured.get(dimension.value, {})
        if entry.get("max_points") != expected:
            errors.append(f"{dimension.value} must award at most {expected} points")
    if sum(entry.get("max_points", 0) for entry in dimensions) != 100:
        errors.append("rubric dimension maxima must sum to 100")

    clock = rubric.get("clock", {})
    if clock.get("type") != "virtual_scenario":
        errors.append("rubric.clock.type must be 'virtual_scenario'")
    if clock.get("exclude_model_inference") is not True:
        errors.append("rubric must exclude model inference from timeliness")

    gates = {gate.get("outcome") for gate in rubric.get("outcome_gates", [])}
    missing_outcomes = REQUIRED_OUTCOMES - gates
    if missing_outcomes:
        errors.append(f"outcome_gates missing terminal outcomes: {sorted(missing_outcomes)}")

    return errors


def load_validated() -> tuple[dict[str, Any], dict[str, Any]]:
    """Load both files and raise ``ScenarioValidationError`` on any drift."""

    scenario = load_scenario()
    rubric = load_rubric()
    errors = validate_scenario_config(scenario, rubric)
    if errors:
        raise ScenarioValidationError("; ".join(errors))
    return scenario, rubric


__all__ = [
    "EXPECTED_SCENARIO_ID",
    "EXPECTED_SCENARIO_VERSION",
    "RUBRIC_PATH",
    "REPO_ROOT",
    "SCENARIO_PATH",
    "SCENARIO_ROOT",
    "ScenarioValidationError",
    "canonical_json",
    "load_rubric",
    "load_scenario",
    "load_validated",
    "scenario_fixture_hash",
    "validate_scenario_config",
]
