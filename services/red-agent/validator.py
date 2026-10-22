"""Two-stage proposal validator: strict JSON schema, then run-policy allowlist.

Stage 1 (``parse_proposal_stage1``) answers *"is this a well-formed proposal?"*
Stage 2 (``validate_policy``) answers *"is this well-formed proposal legal right
now, for this role, in this state, within budget?"*

They are separate on purpose. Ollama's structured-output mode can guarantee JSON
syntax, but it cannot guarantee that ``request_document`` is a legal move after
the defender revoked ``sess_A``. Splitting the checks means a schema-constrained
model still cannot escape the run policy (FR-B03, FR-B04, T-01, T-03).

The validator is pure: no I/O, no clock, no randomness. The same proposal against
the same policy snapshot always yields the same verdict, which keeps the demo
auditable and the tests deterministic.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any, Mapping, Sequence

if __package__:  # imported as part of a package
    from . import observation as _observation
    from . import schemas as _s
else:  # imported as a top-level module from this source root
    import observation as _observation
    import schemas as _s

# Bound the payload the model may return. A 1.7B model cannot produce a
# legitimate proposal anywhere near this size; anything larger is an attack or a
# runaway generation.
MAX_PROPOSAL_JSON_LENGTH = 4000

_REQUIRED_FIELDS = _s.PROPOSAL_FIELDS


class _DuplicateKey(ValueError):
    """Raised by the JSON object hook when a key appears twice."""


def _reject_duplicate_keys(pairs: Sequence[tuple[str, Any]]) -> dict[str, Any]:
    seen: set[str] = set()
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in seen:
            raise _DuplicateKey(key)
        seen.add(key)
        result[key] = value
    return result


def strip_single_code_fence(payload: str) -> tuple[str, bool]:
    """Unwrap one Markdown code fence that wraps the *entire* payload.

    Small local models frequently wrap JSON in ```json fences even when told not
    to. Rejecting those outright would turn a cosmetic habit into a fallback on
    the demo stage, so the fence is removed once and the fact is recorded in the
    validation metadata. Prose *outside* the JSON is still rejected.
    """

    text = payload.strip()
    if not text.startswith("```") or not text.endswith("```"):
        return payload, False

    lines = text.splitlines()
    if len(lines) < 3:
        return payload, False
    if not lines[-1].strip() == "```":
        return payload, False

    body = "\n".join(lines[1:-1])
    return body, True


def parse_proposal_stage1(
    payload: str | Mapping[str, Any],
) -> tuple[_s.Proposal | None, _s.Rejection | None, dict[str, Any]]:
    """Parse and schema-check a raw model response.

    Returns ``(proposal, rejection, metadata)``. Exactly one of ``proposal`` and
    ``rejection`` is non-``None``.
    """

    metadata: dict[str, Any] = {"schema_normalizations": []}

    if isinstance(payload, Mapping):
        data: Any = dict(payload)
        metadata["source"] = "mapping"
    elif isinstance(payload, str):
        metadata["source"] = "text"
        raw = payload
        if len(raw) > MAX_PROPOSAL_JSON_LENGTH:
            return None, _reject1(
                _s.STAGE1_INVALID_TYPE,
                f"payload exceeds {MAX_PROPOSAL_JSON_LENGTH} characters",
            ), metadata
        body, unfenced = strip_single_code_fence(raw)
        if unfenced:
            metadata["schema_normalizations"].append("code_fence")
        try:
            data = json.loads(body, object_pairs_hook=_reject_duplicate_keys)
        except _DuplicateKey as exc:
            return None, _reject1(
                _s.STAGE1_DUPLICATE_KEYS, f"duplicate JSON key: {exc}"
            ), metadata
        except json.JSONDecodeError as exc:
            code = (
                _s.STAGE1_PROSE_OUTSIDE_JSON
                if "Extra data" in exc.msg
                else _s.STAGE1_NON_JSON
            )
            return (
                None,
                _reject1(code, f"not a single JSON object: {exc.msg} at pos {exc.pos}"),
                metadata,
            )
    else:
        return None, _reject1(
            _s.STAGE1_INVALID_TYPE,
            f"proposal payload must be text or a mapping, got {type(payload).__name__}",
        ), metadata

    if not isinstance(data, Mapping):
        return None, _reject1(
            _s.STAGE1_NOT_OBJECT, f"top-level JSON value is {type(data).__name__}, not an object"
        ), metadata

    keys = set(data)
    unknown = sorted(keys - _s.PROPOSAL_FIELD_SET)
    if unknown:
        return None, _reject1(
            _s.STAGE1_UNKNOWN_FIELD,
            f"additionalProperties=false violated by field(s): {unknown}",
        ), metadata

    missing = [name for name in _REQUIRED_FIELDS if name not in data]
    if missing:
        return None, _reject1(
            _s.STAGE1_MISSING_FIELD, f"missing required field(s): {missing}"
        ), metadata

    role = data["role"]
    action = data["action"]
    target_id = data["target_id"]
    session_handle = data["session_handle"]
    reason = data["reason"]

    if not isinstance(role, str) or role not in _s.ROLE_SET:
        return None, _reject1(
            _s.STAGE1_INVALID_ENUM, f"role must be one of {list(_s.ROLES)}, got {role!r}"
        ), metadata

    if not isinstance(action, str) or action not in _s.ATTACKER_ACTION_SET:
        return None, _reject1(
            _s.STAGE1_INVALID_ENUM,
            f"action must be one of {list(_s.ATTACKER_ACTIONS)}, got {action!r}",
        ), metadata

    for name, value in (("target_id", target_id), ("session_handle", session_handle)):
        if value is None:
            continue
        if not isinstance(value, str):
            return None, _reject1(
                _s.STAGE1_INVALID_TYPE,
                f"{name} must be a string or null, got {type(value).__name__}",
            ), metadata
        if not _s.is_valid_identifier(value):
            return None, _reject1(
                _s.STAGE1_INVALID_TYPE,
                f"{name} is not an opaque identifier from the observation allowlist",
            ), metadata

    if not isinstance(reason, str):
        return None, _reject1(
            _s.STAGE1_INVALID_TYPE,
            f"reason must be a string, got {type(reason).__name__}",
        ), metadata

    cleaned_reason, redacted = _s.sanitize_reason(reason)
    if not cleaned_reason:
        return None, _reject1(
            _s.STAGE1_INVALID_REASON, "reason must be a non-empty single sentence"
        ), metadata
    if redacted:
        metadata["reason_redacted"] = True

    proposal = _s.Proposal(
        role=role,
        action=action,
        target_id=target_id,
        session_handle=session_handle,
        reason=cleaned_reason,
    )
    return proposal, None, metadata


def _reject1(code: str, message: str) -> _s.Rejection:
    return _s.Rejection(stage=1, code=code, message=message)


def _reject2(code: str, message: str) -> _s.Rejection:
    return _s.Rejection(stage=2, code=code, message=message)


@dataclass(frozen=True, slots=True)
class PolicyView:
    """An immutable snapshot of the rules a proposal is judged against.

    Detached from ``Observation`` so a verdict can be replayed from a stored
    snapshot without re-deriving state, and so Stage 2 can be tested without
    constructing an observation.
    """

    role: str
    step: int
    steps_remaining: int
    current_session_status: str
    allowed_actions: frozenset[str]
    allowed_session_handles: frozenset[str]
    allowed_target_ids: frozenset[str]
    run_handle: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "role": self.role,
            "run_handle": self.run_handle,
            "step": self.step,
            "steps_remaining": self.steps_remaining,
            "current_session_status": self.current_session_status,
            "allowed_actions": sorted(self.allowed_actions),
            "allowed_session_handles": sorted(self.allowed_session_handles),
            "allowed_target_ids": sorted(self.allowed_target_ids),
        }


def run_policy(observation: "_observation.Observation") -> PolicyView:
    """Compute the effective allowlist for one turn.

    Effective actions are the **intersection** of the derived policy (role
    ceiling ∩ session-state gate ∩ budget) and the control plane's declared
    ``permitted_actions``. The control plane may therefore narrow autonomy but
    can never widen it, which keeps the model's blast radius bounded by state
    rather than by prompt text.

    ``stop`` is unioned back in unconditionally: halting is always safe, and a
    validator that can leave the agent with *no* legal move would turn every
    awkward state into an unlogged technical failure.
    """

    derived = _observation.derive_permitted_actions(
        observation.assigned_role,
        observation.current_session_status,
        observation.steps_remaining,
    )
    declared = frozenset(observation.permitted_actions)
    effective = frozenset((derived & declared) | {"stop"})

    return PolicyView(
        role=observation.assigned_role,
        step=observation.step,
        steps_remaining=observation.steps_remaining,
        current_session_status=observation.current_session_status,
        allowed_actions=effective,
        allowed_session_handles=frozenset(observation.session_handles),
        allowed_target_ids=frozenset(observation.allowed_target_ids),
        run_handle=observation.run_handle,
    )


def validate_policy(
    proposal: _s.Proposal,
    policy: PolicyView,
) -> _s.Rejection | None:
    """Stage 2: reject any proposal that is not legal under ``policy``."""

    action = proposal.action

    if proposal.role != policy.role:
        return _reject2(
            _s.STAGE2_ROLE_MISMATCH,
            f"proposal role {proposal.role!r} does not match assigned role {policy.role!r}",
        )

    if action not in _s.ATTACKER_ACTION_SET:
        return _reject2(_s.STAGE2_UNKNOWN_ACTION, f"action {action!r} is outside the enum")

    if action not in _s.role_ceiling(policy.role):
        return _reject2(
            _s.STAGE2_ACTION_NOT_PERMITTED_FOR_ROLE,
            f"action {action!r} is not in the capability ceiling for role {policy.role!r}",
        )

    if policy.steps_remaining <= 0 and action != "stop":
        return _reject2(
            _s.STAGE2_BUDGET_EXHAUSTED,
            f"no steps remaining; only 'stop' is legal, got {action!r}",
        )

    if (
        policy.current_session_status in {"revoked", "disabled", "expired"}
        and action in _s.SESSION_DEPENDENT_ACTIONS
    ):
        return _reject2(
            _s.STAGE2_ACTION_BLOCKED_BY_STATUS,
            f"action {action!r} needs a live session but status is "
            f"{policy.current_session_status!r}",
        )

    if action not in policy.allowed_actions:
        return _reject2(
            _s.STAGE2_ACTION_NOT_PERMITTED,
            f"action {action!r} is not in this turn's permitted actions "
            f"{sorted(policy.allowed_actions)}",
        )

    required = _s.ACTION_REQUIRED_FIELDS[action]

    # -- session_handle ----------------------------------------------------
    if "session_handle" in required:
        if proposal.session_handle is None:
            return _reject2(
                _s.STAGE2_MISSING_SESSION_HANDLE,
                f"action {action!r} requires a session_handle",
            )
        if proposal.session_handle not in policy.allowed_session_handles:
            return _reject2(
                _s.STAGE2_UNKNOWN_SESSION_HANDLE,
                f"session_handle {proposal.session_handle!r} is not in the "
                "observation allowlist (handles are matched verbatim)",
            )
    elif proposal.session_handle is not None:
        return _reject2(
            _s.STAGE2_UNEXPECTED_SESSION_HANDLE,
            f"action {action!r} takes no session_handle, got "
            f"{proposal.session_handle!r}",
        )

    # -- target_id ---------------------------------------------------------
    if "target_id" in required:
        if proposal.target_id is None:
            return _reject2(
                _s.STAGE2_MISSING_TARGET_ID,
                f"action {action!r} requires a target_id",
            )
        if proposal.target_id not in policy.allowed_target_ids:
            return _reject2(
                _s.STAGE2_UNKNOWN_TARGET_ID,
                f"target_id {proposal.target_id!r} is not in the observation "
                "allowlist (ids are matched verbatim)",
            )
    elif proposal.target_id is not None:
        return _reject2(
            _s.STAGE2_UNEXPECTED_TARGET_ID,
            f"action {action!r} takes no target_id, got {proposal.target_id!r}",
        )

    return None


def _as_policy(
    target: "PolicyView | _observation.Observation | Mapping[str, Any]",
) -> PolicyView:
    """Normalise an Observation / observation dict / policy snapshot."""

    if isinstance(target, PolicyView):
        return target
    if isinstance(target, _observation.Observation):
        return run_policy(target)
    if isinstance(target, Mapping):
        if "allowed_actions" in target:
            required = (
                "role",
                "step",
                "steps_remaining",
                "current_session_status",
                "allowed_actions",
                "allowed_session_handles",
                "allowed_target_ids",
            )
            missing = [key for key in required if key not in target]
            if missing:
                raise _s.RedAgentError(
                    f"policy snapshot is missing required key(s): {missing}"
                )
            return PolicyView(
                role=str(target["role"]),
                step=int(target["step"]),
                steps_remaining=int(target["steps_remaining"]),
                current_session_status=str(target["current_session_status"]),
                allowed_actions=frozenset(target["allowed_actions"]),
                allowed_session_handles=frozenset(target["allowed_session_handles"]),
                allowed_target_ids=frozenset(target["allowed_target_ids"]),
                run_handle=str(target.get("run_handle", "")),
            )
        return run_policy(_observation.Observation.from_dict(target))
    raise _s.RedAgentError(
        "validate_action() expects an Observation, observation mapping or policy "
        f"snapshot, got {type(target).__name__}"
    )


def validate_action(
    proposal: "str | Mapping[str, Any] | _s.Proposal",
    observation: "PolicyView | _observation.Observation | Mapping[str, Any]",
) -> _s.ValidationResult:
    """Full two-stage validation. The only supported entry point.

    ``proposal`` may be the raw model text, a parsed mapping or a ``Proposal``.
    ``observation`` may be an ``Observation``, an observation-shaped mapping from
    the control plane, or a ``PolicyView`` / policy snapshot produced by
    :func:`run_policy`.
    """

    policy = _as_policy(observation)

    if isinstance(proposal, _s.Proposal):
        parsed, rejection, metadata = (
            proposal,
            None,
            {"source": "proposal", "schema_normalizations": []},
        )
    else:
        parsed, rejection, metadata = parse_proposal_stage1(proposal)

    if rejection is not None or parsed is None:
        return _s.ValidationResult(
            accepted=False,
            proposal=None,
            rejection=rejection,
            policy=policy.to_dict(),
            metadata=metadata,
        )

    policy_rejection = validate_policy(parsed, policy)
    if policy_rejection is not None:
        return _s.ValidationResult(
            accepted=False,
            proposal=parsed,
            rejection=policy_rejection,
            policy=policy.to_dict(),
            metadata=metadata,
        )

    return _s.ValidationResult(
        accepted=True,
        proposal=parsed,
        rejection=None,
        policy=policy.to_dict(),
        metadata=metadata,
    )


def assert_no_accepted_violations(
    cases: Sequence[tuple[str | Mapping[str, Any], Any]],
) -> int:
    """Return how many adversarial proposals were (wrongly) accepted.

    Shared by the fuzz tests and the B3 benchmark so both report the same
    number, and so the release gate "0 accepted out-of-policy actions" has a
    single implementation.
    """

    violations = 0
    for proposal, observation in cases:
        if validate_action(proposal, observation).accepted:
            violations += 1
    return violations
