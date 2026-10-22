"""Boundary adapter: stdlib-only red-agent core <-> canonical ``contracts/`` DTOs.

The core modules (``schemas``, ``validator``, ``observation``, ``fallback``,
``service``) deliberately depend on nothing outside the standard library so they
run on a bare interpreter before Ollama, Pydantic or the shared contracts are
installed. This module is the **only** place that names ``contracts.models`` and
``contracts.enums``; importing it without Pydantic available is safe, and every
call raises :class:`ContractUnavailable` with the underlying import error.

The control plane (Saad's ``apps/control-api/``) should:

1. call ``assert_vocabulary_parity()`` once at startup (fail fast on drift),
2. convert accepted/fallback outcomes with ``to_agent_decision_record()``,
3. convert validated proposals with ``to_attacker_proposal()`` before handing
   them to the target adapter.

Nothing here executes an action or performs I/O.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

if __package__:
    from . import schemas as _s
else:  # imported as a top-level module from this source root
    import schemas as _s

try:  # pragma: no cover - exercised by whichever environment has Pydantic
    from contracts import enums as _contract_enums
    from contracts import models as _contract_models

    CONTRACTS_AVAILABLE = True
    CONTRACTS_IMPORT_ERROR: str | None = None
except Exception as _exc:  # noqa: BLE001 - degraded mode is an explicit feature
    _contract_enums = None  # type: ignore[assignment]
    _contract_models = None  # type: ignore[assignment]
    CONTRACTS_AVAILABLE = False
    CONTRACTS_IMPORT_ERROR = f"{type(_exc).__name__}: {_exc}"

# AgentDecisionRecord.rejection_reason is capped at 1000 chars by the contract.
_MAX_REJECTION_LENGTH = 1000


class ContractUnavailable(_s.RedAgentError):
    """The canonical ``contracts`` package (or Pydantic) cannot be imported here."""


def _require_contracts() -> tuple[Any, Any]:
    if not CONTRACTS_AVAILABLE:
        raise ContractUnavailable(
            "contracts/ is not importable in this interpreter; install "
            "contracts/requirements.txt and run from the repository root "
            f"({CONTRACTS_IMPORT_ERROR})"
        )
    return _contract_models, _contract_enums


def assert_vocabulary_parity() -> dict[str, Any]:
    """Fail fast when the local red-agent vocabulary drifts from ``contracts/``.

    Returns a summary suitable for a ``/api/health`` details block. Raises
    :class:`ContractUnavailable` when the canonical package is missing and
    ``RedAgentError`` when a value differs.
    """

    models, enums = _require_contracts()

    mismatches: list[str] = []

    def compare(name: str, local: tuple[str, ...], canonical: tuple[str, ...]) -> None:
        if tuple(local) != tuple(canonical):
            mismatches.append(f"{name}: local={list(local)} canonical={list(canonical)}")

    compare(
        "AttackerAction",
        _s.ATTACKER_ACTIONS,
        tuple(action.value for action in enums.AttackerAction),
    )
    compare("Role", _s.ROLES, tuple(role.value for role in enums.Role))
    compare(
        "SessionStatus",
        _s.SESSION_STATUSES,
        tuple(status.value for status in enums.SessionStatus),
    )
    compare(
        "AccessOutcome",
        _s.LAST_RESULTS,
        tuple(outcome.value for outcome in enums.AccessOutcome),
    )

    if _s.IDENTIFIER_PATTERN.pattern != models.OPAQUE_HANDLE_PATTERN:
        mismatches.append(
            "opaque handle grammar: "
            f"local={_s.IDENTIFIER_PATTERN.pattern!r} "
            f"canonical={models.OPAQUE_HANDLE_PATTERN!r}"
        )

    local_handles = {
        action: sorted(fields)
        for action, fields in _s.ACTION_REQUIRED_FIELDS.items()
    }
    canonical_handles = {
        action.value: sorted(handles)
        for action, handles in enums.ACTION_REQUIRED_HANDLES.items()
    }
    if local_handles != canonical_handles:
        mismatches.append(
            "required handles per action: "
            f"local={local_handles} canonical={canonical_handles}"
        )

    if mismatches:
        raise _s.RedAgentError(
            "red-agent vocabulary drifted from contracts/: " + "; ".join(mismatches)
        )

    return {
        "contract_schema_version": models.CONTRACT_SCHEMA_VERSION,
        "red_agent_schema_version": _s.RED_AGENT_SCHEMA_VERSION,
        "roles": len(_s.ROLES),
        "actions": len(_s.ATTACKER_ACTIONS),
        "statuses": len(_s.SESSION_STATUSES),
        "outcomes": len(_s.LAST_RESULTS),
    }


def to_attacker_proposal(proposal: _s.Proposal) -> Any:
    """Convert a locally validated proposal into the canonical DTO.

    Pydantic re-validates the envelope (enum membership, opaque-handle grammar,
    handle/action consistency, reason length), so a drift between the local
    dataclass and ``contracts/`` fails here rather than in the target adapter.
    """

    models, _ = _require_contracts()
    return models.AttackerProposal(
        role=proposal.role,
        action=proposal.action,
        target_id=proposal.target_id,
        session_handle=proposal.session_handle,
        reason=proposal.reason,
    )


def from_attacker_proposal(dto: Any) -> _s.Proposal:
    """Convert a canonical proposal DTO back into the local envelope."""

    _require_contracts()
    return _s.Proposal(
        role=dto.role.value,
        action=dto.action.value,
        target_id=dto.target_id,
        session_handle=dto.session_handle,
        reason=dto.reason,
    )


def to_agent_decision_record(
    outcome: Any,
    *,
    decision_id: str,
    run_id: str,
    step: int,
    created_at: datetime | None = None,
) -> Any:
    """Convert one bounded decision outcome into ``AgentDecisionRecord``.

    Provenance is taken from the outcome metadata, never re-derived, so the
    stored record matches the hashes the decision was actually made against.
    ``proposed_json`` carries the model's parsed proposal even when policy
    rejected it; ``accepted_action`` is only set for an accepted decision.
    """

    models, _ = _require_contracts()

    metadata = outcome.metadata or {}
    model_id = metadata.get("model_id")
    prompt_hash = metadata.get("prompt_hash")
    observation_hash = metadata.get("observation_hash")
    missing = [
        name
        for name, value in (
            ("model_id", model_id),
            ("prompt_hash", prompt_hash),
            ("observation_hash", observation_hash),
        )
        if not value
    ]
    if missing:
        raise _s.RedAgentError(
            "decision outcome is missing required provenance: " + ", ".join(missing)
        )

    parsed = outcome.validation.proposal
    proposed_json = parsed.to_dict() if parsed is not None else None
    if outcome.accepted and proposed_json is None:
        raise _s.RedAgentError(
            "accepted decision has no parsed proposal; cannot build a decision record"
        )

    rejection = outcome.validation.rejection_reason
    if rejection is not None and len(rejection) > _MAX_REJECTION_LENGTH:
        rejection = rejection[:_MAX_REJECTION_LENGTH]

    return models.AgentDecisionRecord(
        decision_id=decision_id,
        run_id=run_id,
        step=step,
        role=outcome.proposal.role,
        model_id=str(model_id),
        prompt_hash=prompt_hash,
        observation_hash=observation_hash,
        proposed_json=proposed_json,
        accepted_action=outcome.proposal.action if outcome.accepted else None,
        rejection_reason=rejection,
        latency_ms=max(0, int(round(outcome.elapsed_ms))),
        fallback_used=outcome.fallback_used,
        created_at=created_at or datetime.now(timezone.utc),
    )


__all__ = [
    "CONTRACTS_AVAILABLE",
    "CONTRACTS_IMPORT_ERROR",
    "ContractUnavailable",
    "assert_vocabulary_parity",
    "from_attacker_proposal",
    "to_agent_decision_record",
    "to_attacker_proposal",
]
