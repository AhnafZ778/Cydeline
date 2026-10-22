"""Bounded decision execution with explicitly tagged deterministic fallback.

A 1.7B model on a laptop CPU will occasionally time out, emit prose, or propose a
move that policy forbids. None of those may hang or misrepresent the exercise
(FR-B06, T-10, AT-05). This module guarantees three things:

1. **Bounded wall clock.** ``run_bounded`` returns or raises within the per-turn
   budget, using a daemon thread so a wedged HTTP call can never block
   interpreter shutdown.
2. **Always-legal output.** ``deterministic_fallback`` returns a proposal that is
   legal for the current role and state, with ``stop`` as the unconditional last
   resort.
3. **Honest provenance.** ``fallback_used`` and ``fallback_reason`` live on the
   service result, never inside the five-field proposal envelope. The model
   cannot emit ``fallback_used`` and a fallback cannot impersonate a live model
   decision.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import threading
import time
from typing import Any, Callable, Mapping

if __package__:  # imported as part of a package
    from . import observation as _observation
    from . import schemas as _s
    from . import validator as _validator
else:  # imported as a top-level module from this source root
    import observation as _observation
    import schemas as _s
    import validator as _validator

# Per-turn budget. The PRD targets <=10s for the first decision on demo hardware
# and C owns scenario pacing, so the default leaves headroom for one retry while
# still guaranteeing the UI never waits longer than this.
DEFAULT_TIMEOUT_MS = 10_000

# Raw model text kept for the audit trace is truncated; PRD 8.3 prefers hashes
# over raw prompt storage, and a runaway generation should not bloat SQLite.
MAX_TRACE_TEXT = 500


@dataclass(slots=True)
class DecisionOutcome:
    """Result of one bounded decision turn.

    ``validation`` always carries the policy snapshot that was applied, so a
    rejection is reproducible after the run has advanced.
    """

    proposal: _s.Proposal
    accepted: bool
    fallback_used: bool
    elapsed_ms: float
    validation: _s.ValidationResult
    fallback_reason: str | None = None
    model_output: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def action_payload(self) -> dict[str, Any]:
        """Projection handed to the target adapter (never raw model text)."""

        return _s.approved_action(self.proposal)

    def to_trace(self) -> dict[str, Any]:
        """Row shaped for ``agent_decisions`` (PRD 8.6)."""

        return {
            "role": self.proposal.role,
            "proposed_json": self.proposal.to_dict(),
            "accepted_action": self.proposal.action if self.accepted else None,
            "rejection_reason": self.validation.rejection_reason,
            "latency_ms": round(self.elapsed_ms, 3),
            "fallback_used": self.fallback_used,
            "fallback_reason": self.fallback_reason,
            "observation_hash": self.metadata.get("observation_hash"),
            "prompt_hash": self.metadata.get("prompt_hash"),
            "model_id": self.metadata.get("model_id"),
        }


def run_bounded(
    fn: Callable[[], Any],
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
    *,
    clock: Callable[[], float] = time.monotonic,
) -> Any:
    """Run ``fn`` and return its value, or raise once ``timeout_ms`` elapses.

    The worker thread is a daemon and is *abandoned* on timeout rather than
    killed (Python cannot safely kill threads). That is acceptable because the
    only work it performs is one HTTP call to a local Ollama instance whose
    result is then discarded by the caller; the process is never blocked at exit.
    """

    if timeout_ms <= 0:
        raise ValueError("timeout_ms must be positive")

    outcome: dict[str, Any] = {}
    finished = threading.Event()

    def _worker() -> None:
        try:
            outcome["value"] = fn()
        except BaseException as exc:  # noqa: BLE001 - re-raised on the caller thread
            outcome["error"] = exc
        finally:
            finished.set()

    started = clock()
    worker = threading.Thread(
        target=_worker, name="red-agent-decision", daemon=True
    )
    worker.start()

    if not finished.wait(timeout_ms / 1000.0):
        raise _s.TimeoutBudgetExceeded(
            f"model decision exceeded the {timeout_ms} ms budget "
            f"(elapsed {int((clock() - started) * 1000)} ms)"
        )

    if "error" in outcome:
        error = outcome["error"]
        if isinstance(error, _s.RedAgentError):
            raise error
        raise _s.ModelInvocationError(str(error)) from error

    return outcome.get("value")


def _first_handle(observation_or_policy: Any) -> str | None:
    handles = getattr(observation_or_policy, "session_handles", None)
    if handles:
        return handles[0]
    allowed = getattr(observation_or_policy, "allowed_session_handles", None)
    if allowed:
        return sorted(allowed)[0]
    return None


def _fallback_candidates(
    policy: _validator.PolicyView,
) -> tuple[tuple[str, str | None, str], ...]:
    """Deterministic preference order: (action, target_id, reason)."""

    handle = _first_handle(policy)

    def has(action: str) -> bool:
        return action in policy.allowed_actions

    contained = policy.current_session_status in {"revoked", "disabled", "expired"}

    if policy.steps_remaining <= 0:
        return (("stop", None, "The permitted step budget is exhausted."),)

    if contained:
        # A status probe is the only remaining legal way to observe the
        # defender's change; it is harmless and cannot touch a document.
        return tuple(
            candidate
            for candidate in (
                (
                    "inspect_session_status",
                    None,
                    "The permitted session is no longer active; re-checking status.",
                )
                if has("inspect_session_status") and handle
                else None,
                ("wait", None, "The permitted session is unavailable; waiting."),
                ("stop", None, "The permitted session is unavailable; stopping."),
            )
            if candidate is not None
        )

    return tuple(
        candidate
        for candidate in (
            ("wait", None, "Holding this turn without a target action."),
            ("stop", None, "Ending the permitted action sequence."),
        )
        if candidate is not None
    )


def deterministic_fallback(
    observation_or_policy: "_observation.Observation | _validator.PolicyView",
    reason_code: str,
    *,
    detail: str | None = None,
    role: str | None = None,
) -> tuple[_s.Proposal, str]:
    """Return an in-policy fallback proposal and its human-readable reason.

    Deterministic by construction: no clock, no randomness, no model. The same
    state always yields the same fallback, which is what makes "fallback_used"
    meaningful in the debrief rather than a second black box.
    """

    policy = (
        observation_or_policy
        if isinstance(observation_or_policy, _validator.PolicyView)
        else _validator.run_policy(observation_or_policy)
    )
    assigned_role = role or policy.role

    note = f"[fallback:{reason_code}]" + (f" {detail}" if detail else "")

    for action, target_id, reason in _fallback_candidates(policy):
        candidate = _s.Proposal(
            role=assigned_role,
            action=action,
            target_id=target_id,
            session_handle=_first_handle(policy)
            if "session_handle" in _s.ACTION_REQUIRED_FIELDS[action]
            else None,
            reason=reason,
        )
        if _validator.validate_policy(candidate, policy) is None:
            return candidate, note

    # ``stop`` is unioned into every policy, so this is unreachable unless the
    # policy construction itself regressed. Fail loudly rather than emit an
    # illegal move into the run.
    raise _s.RedAgentError(
        "no legal fallback action exists for this policy; this indicates a "
        f"policy-construction defect: {policy.to_dict()}"
    )


def decide_with_fallback(
    model_callable: Callable[[], str | Mapping[str, Any]],
    observation: "_observation.Observation",
    *,
    timeout_ms: int = DEFAULT_TIMEOUT_MS,
    clock: Callable[[], float] = time.monotonic,
    metadata: Mapping[str, Any] | None = None,
) -> DecisionOutcome:
    """Ask the model, validate the answer, fall back safely if anything fails.

    Failure classification is intentionally coarse and explicit, because the
    debrief distinguishes "the model chose badly" (policy rejection) from "the
    model never answered" (timeout) from "the model answered with garbage"
    (schema rejection).
    """

    policy = _validator.run_policy(observation)
    base_metadata: dict[str, Any] = dict(metadata or {})
    base_metadata["observation_hash"] = observation.observation_hash

    started = clock()

    def _elapsed_ms() -> float:
        return (clock() - started) * 1000.0

    def _fallback(reason_code: str, detail: str, validation: _s.ValidationResult,
                  raw: str | None) -> DecisionOutcome:
        proposal, note = deterministic_fallback(
            policy, reason_code, detail=detail, role=observation.assigned_role
        )
        # Re-validate the fallback so a future policy change cannot silently
        # start emitting illegal "safe" moves.
        fallback_validation = _validator.validate_action(proposal, policy)
        if not fallback_validation.accepted:  # pragma: no cover - defensive
            raise _s.RedAgentError(
                "deterministic fallback failed its own validation: "
                f"{fallback_validation.rejection_reason}"
            )
        return DecisionOutcome(
            proposal=proposal,
            accepted=False,
            fallback_used=True,
            elapsed_ms=_elapsed_ms(),
            validation=validation,
            fallback_reason=note,
            model_output=raw,
            metadata={**base_metadata, "fallback_action": proposal.action},
        )

    try:
        raw = run_bounded(model_callable, timeout_ms, clock=clock)
    except _s.TimeoutBudgetExceeded as exc:
        empty = _s.ValidationResult(
            accepted=False,
            policy=policy.to_dict(),
            metadata={"error": "timeout"},
            rejection=_s.Rejection(stage=0, code=_s.FALLBACK_TIMEOUT, message=str(exc)),
        )
        return _fallback(_s.FALLBACK_TIMEOUT, f"after {timeout_ms} ms", empty, None)
    except _s.ModelInvocationError as exc:
        empty = _s.ValidationResult(
            accepted=False,
            policy=policy.to_dict(),
            metadata={"error": "model_error"},
            rejection=_s.Rejection(stage=0, code=_s.FALLBACK_MODEL_ERROR, message=str(exc)),
        )
        return _fallback(_s.FALLBACK_MODEL_ERROR, "model call failed", empty, None)
    except _s.RedAgentError as exc:
        empty = _s.ValidationResult(
            accepted=False,
            policy=policy.to_dict(),
            metadata={"error": "unexpected_error"},
            rejection=_s.Rejection(
                stage=0, code=_s.FALLBACK_UNEXPECTED_ERROR, message=str(exc)
            ),
        )
        return _fallback(_s.FALLBACK_UNEXPECTED_ERROR, "bounded runner failed", empty, None)

    raw_text = raw if isinstance(raw, str) else None
    trace_text = raw_text[:MAX_TRACE_TEXT] if raw_text else None

    validation = _validator.validate_action(raw, policy)
    if validation.accepted:
        assert validation.proposal is not None  # narrowing for type checkers
        return DecisionOutcome(
            proposal=validation.proposal,
            accepted=True,
            fallback_used=False,
            elapsed_ms=_elapsed_ms(),
            validation=validation,
            fallback_reason=None,
            model_output=trace_text,
            metadata=base_metadata,
        )

    rejection = validation.rejection
    code = rejection.code if rejection else "unknown"
    if rejection is not None and rejection.stage == 1:
        reason_code = (
            _s.FALLBACK_INVALID_JSON
            if code
            in {
                _s.STAGE1_NON_JSON,
                _s.STAGE1_PROSE_OUTSIDE_JSON,
                _s.STAGE1_DUPLICATE_KEYS,
                _s.STAGE1_NOT_OBJECT,
            }
            else _s.FALLBACK_SCHEMA_REJECTION
        )
    else:
        reason_code = _s.FALLBACK_POLICY_REJECTION

    return _fallback(reason_code, validation.rejection_reason or code, validation, trace_text)
