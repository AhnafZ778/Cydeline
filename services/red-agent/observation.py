"""Sanitized attacker-visible observation builder (FR-B05, T-02, T-03).

The observation is the *only* channel from the trusted control plane into the
local model. It is built from an explicit allowlist of ten fields; anything else
— hidden scenario answer keys, learner scores, other runs' events, bearer
tokens, raw target URLs, future events — has no parameter, so it cannot leak by
accident.

Two defensive properties are enforced here:

1. **Whitelist, not blacklist.** ``Observation.from_dict`` refuses unknown keys
   instead of silently dropping them, because a caller that passes
   ``hidden_answer`` is misconfigured and must fail loudly.
2. **Opaque handles are validated, not sanitized.** A handle containing shell
   punctuation, a path or a URL means upstream data is untrusted or corrupt; the
   builder raises ``ObservationError`` rather than repairing it into something
   the model might still act on.

Import note: ``services/red-agent`` is a hyphenated *source root*, not an
importable package, so modules here are loaded top-level after inserting this
directory at the front of ``sys.path`` (see ``services/red-agent/README.md``).
"""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any, Iterable, Mapping, Sequence

if __package__:  # imported as part of a package (future contracts/ integration)
    from . import schemas as _s
else:  # imported as a top-level module from this source root
    import schemas as _s

# Session states in which the compromised session no longer grants access. Only
# a harmless status probe, a wait, or a stop remain legal.
_CONTAINED_STATUSES: frozenset[str] = frozenset({"revoked", "disabled", "expired"})

# Probing an unknown session is how the scout learns whether it is usable.
_PROBE_ACTIONS: frozenset[str] = frozenset(
    {"inspect_session_status", "test_existing_session"}
)


def derive_permitted_actions(
    role: str,
    current_session_status: str,
    steps_remaining: int,
) -> frozenset[str]:
    """Derive the actions that are legal for this role in this state.

    The result is the intersection of the role ceiling, the state gate and the
    global enum, with ``stop`` always available so the agent can never be forced
    into an illegal move. The control plane may narrow this further via
    ``permitted_actions``; it may never widen it, because
    :func:`validator.run_policy` intersects rather than unions.
    """

    if steps_remaining <= 0:
        return frozenset({"stop"})

    ceiling = _s.role_ceiling(role)
    if not ceiling:
        return frozenset({"stop"})

    if current_session_status in _CONTAINED_STATUSES:
        state_actions: frozenset[str] = frozenset(
            {"inspect_session_status", "wait", "stop"}
        )
    elif current_session_status == "unknown":
        state_actions = _PROBE_ACTIONS | {"wait", "stop"}
    else:  # active (or any future non-contained state) -> full enum
        state_actions = frozenset(_s.ATTACKER_ACTION_SET)

    return frozenset((ceiling & state_actions) | {"stop"})


def _validate_opaque_ids(values: Iterable[str], field_name: str) -> tuple[str, ...]:
    """Validate and de-duplicate an opaque identifier list, preserving order."""

    if isinstance(values, (str, bytes)):
        raise _s.ObservationError(
            f"{field_name} must be a sequence of identifiers, not a string"
        )

    seen: list[str] = []
    for value in values:
        if not _s.is_valid_identifier(value):
            raise _s.ObservationError(
                f"{field_name} contains a non-conforming opaque identifier: {value!r}"
            )
        if value not in seen:
            seen.append(value)
    return tuple(seen)


def _coerce_int(value: Any, field_name: str, *, minimum: int = 0) -> int:
    # bool is an int subclass; a boolean step counter is a caller bug.
    if isinstance(value, bool) or not isinstance(value, int):
        raise _s.ObservationError(
            f"{field_name} must be an integer, got {type(value).__name__}"
        )
    if value < minimum:
        raise _s.ObservationError(f"{field_name} must be >= {minimum}, got {value}")
    return value


@dataclass(frozen=True, slots=True)
class Observation:
    """Sanitized attacker-visible state handed to the local model.

    ``sanitized_fields`` is provenance for fields the builder had to neutralise
    (for example an unrecognised ``last_result`` collapsed to ``unknown``). It is
    never sent to the model and never included in ``observation_hash``.
    """

    run_handle: str
    assigned_role: str
    step: int
    steps_remaining: int
    session_handles: tuple[str, ...]
    allowed_target_ids: tuple[str, ...]
    last_action: str | None
    last_result: str
    current_session_status: str
    permitted_actions: tuple[str, ...]
    sanitized_fields: tuple[str, ...] = field(default=(), compare=False)

    # -- serialization -----------------------------------------------------
    def to_model_dict(self) -> dict[str, Any]:
        """Return exactly the ten allowlisted fields, in a stable order."""

        return {
            "run_handle": self.run_handle,
            "assigned_role": self.assigned_role,
            "step": self.step,
            "steps_remaining": self.steps_remaining,
            "session_handles": list(self.session_handles),
            "allowed_target_ids": list(self.allowed_target_ids),
            "last_action": self.last_action,
            "last_result": self.last_result,
            "current_session_status": self.current_session_status,
            "permitted_actions": list(self.permitted_actions),
        }

    def to_prompt_json(self) -> str:
        """Compact JSON rendering embedded in the role prompt."""

        return json.dumps(self.to_model_dict(), sort_keys=True, separators=(",", ":"))

    @property
    def observation_hash(self) -> str:
        """Stable SHA-256 of the model-visible payload (provenance, PRD 8.6)."""

        return _s.hash_payload(self.to_model_dict())

    @property
    def is_contained(self) -> bool:
        """True when the session no longer grants access."""

        return self.current_session_status in _CONTAINED_STATUSES

    # -- construction ------------------------------------------------------
    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "Observation":
        """Rebuild an observation from a trusted control-plane payload.

        Unknown keys are rejected: a payload carrying ``hidden_answer``,
        ``learner_score``, ``bearer_token`` or ``future_events`` is a defect in
        the caller, not something to quietly strip.
        """

        if not isinstance(payload, Mapping):
            raise _s.ObservationError(
                f"observation must be a mapping, got {type(payload).__name__}"
            )

        unknown = sorted(set(payload) - _s.OBSERVATION_FIELD_SET)
        if unknown:
            raise _s.ObservationError(
                f"observation contains non-allowlisted field(s): {unknown}"
            )

        missing = [name for name in _s.OBSERVATION_FIELDS if name not in payload]
        if missing:
            raise _s.ObservationError(
                f"observation is missing required field(s): {missing}"
            )

        return build_sanitized_observation(
            run_handle=payload["run_handle"],
            assigned_role=payload["assigned_role"],
            step=payload["step"],
            steps_remaining=payload["steps_remaining"],
            session_handles=payload["session_handles"],
            allowed_target_ids=payload["allowed_target_ids"],
            last_action=payload["last_action"],
            last_result=payload["last_result"],
            current_session_status=payload["current_session_status"],
            # Declared permissions are re-checked by the validator, which
            # intersects them with the derived policy.
            permitted_actions=payload["permitted_actions"],
        )


def build_sanitized_observation(
    *,
    run_handle: str,
    assigned_role: str,
    step: int,
    steps_remaining: int,
    session_handles: Sequence[str],
    allowed_target_ids: Sequence[str],
    last_action: str | None = None,
    last_result: str = "none",
    current_session_status: str = "active",
    permitted_actions: Sequence[str] | None = None,
) -> Observation:
    """Build a sanitized observation from attacker-visible facts only.

    ``permitted_actions`` is normally derived from role + session status + budget.
    When the control plane supplies it explicitly the shape is still validated
    here, and the validator intersects it with the derived policy.
    """

    if not _s.is_valid_identifier(run_handle):
        raise _s.ObservationError(
            f"run_handle is not a valid opaque handle: {run_handle!r}"
        )
    if assigned_role not in _s.ROLE_SET:
        raise _s.ObservationError(
            f"assigned_role is not a canonical role: {assigned_role!r}"
        )

    step_value = _coerce_int(step, "step")
    remaining_value = _coerce_int(steps_remaining, "steps_remaining")

    sanitized: list[str] = []

    if current_session_status not in _s.SESSION_STATUS_SET:
        # Fail closed: an unrecognised status must never be rendered as "active".
        raise _s.ObservationError(
            f"current_session_status is not canonical: {current_session_status!r}"
        )

    if last_action is None or last_action in _s.ATTACKER_ACTION_SET:
        resolved_last_action: str | None = last_action
    else:
        resolved_last_action = None
        sanitized.append("last_action")

    resolved_last_result = last_result
    if last_result not in _s.LAST_RESULT_SET:
        resolved_last_result = "unknown"
        sanitized.append("last_result")

    handles = _validate_opaque_ids(session_handles, "session_handles")
    targets = _validate_opaque_ids(allowed_target_ids, "allowed_target_ids")

    if permitted_actions is None:
        resolved_permitted = tuple(
            sorted(
                derive_permitted_actions(
                    assigned_role, current_session_status, remaining_value
                )
            )
        )
    else:
        if isinstance(permitted_actions, (str, bytes)):
            raise _s.ObservationError(
                "permitted_actions must be a sequence of actions, not a string"
            )
        unknown_actions = sorted(
            {
                action
                for action in permitted_actions
                if action not in _s.ATTACKER_ACTION_SET
            }
        )
        if unknown_actions:
            raise _s.ObservationError(
                f"permitted_actions contains non-canonical action(s): {unknown_actions}"
            )
        resolved_permitted = tuple(dict.fromkeys(permitted_actions))

    return Observation(
        run_handle=run_handle,
        assigned_role=assigned_role,
        step=step_value,
        steps_remaining=remaining_value,
        session_handles=handles,
        allowed_target_ids=targets,
        last_action=resolved_last_action,
        last_result=resolved_last_result,
        current_session_status=current_session_status,
        permitted_actions=resolved_permitted,
        sanitized_fields=tuple(sanitized),
    )


def active_observation(
    *,
    run_handle: str = "run_0001",
    assigned_role: str = "access_operator",
    step: int = 2,
    steps_remaining: int = 4,
    session_handle: str = "sess_A",
    target_id: str = "doc_finance_07",
    last_action: str = "list_accessible_documents",
) -> Observation:
    """Convenience builder for the pre-containment observation (paired A/B, B3)."""

    return build_sanitized_observation(
        run_handle=run_handle,
        assigned_role=assigned_role,
        step=step,
        steps_remaining=steps_remaining,
        session_handles=[session_handle],
        allowed_target_ids=[target_id],
        last_action=last_action,
        last_result="listed",
        current_session_status="active",
    )


def contained_observation(
    *,
    run_handle: str = "run_0001",
    assigned_role: str = "adaptation_planner",
    step: int = 4,
    steps_remaining: int = 2,
    session_handle: str = "sess_A",
    target_id: str = "doc_finance_07",
    last_action: str = "test_existing_session",
) -> Observation:
    """Convenience builder for the post-revocation observation (paired A/B, B3)."""

    return build_sanitized_observation(
        run_handle=run_handle,
        assigned_role=assigned_role,
        step=step,
        steps_remaining=steps_remaining,
        session_handles=[session_handle],
        allowed_target_ids=[target_id],
        last_action=last_action,
        last_result="denied",
        current_session_status="revoked",
    )
