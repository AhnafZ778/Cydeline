"""Public service surface consumed by Saad's `apps/control-api/` (FR-B01/B02/B05).

Two functions matter to the outside world:

* ``choose_action(run_id, role, observation) -> ProposalResult``
* ``validate_action(proposal, observation) -> ValidationResult``

Everything else here is wiring: prompt assembly, provenance capture, and the
bounded-timeout fallback handoff. The service never executes an action, never
talks to the target, and never returns free-form model text as an instruction —
only a validated five-field proposal plus provenance.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import time
from typing import Any, Callable, Mapping

if __package__:
    from . import fallback as _fallback
    from . import observation as _observation
    from . import ollama_client as _ollama
    from . import prompts as _prompts
    from . import schemas as _s
    from . import validator as _validator
else:  # imported as a top-level module from this source root
    import fallback as _fallback
    import observation as _observation
    import ollama_client as _ollama
    import prompts as _prompts
    import schemas as _s
    import validator as _validator

# Public alias: the contract and PRD call this object ``ProposalResult``.
ProposalResult = _fallback.DecisionOutcome

# Re-exported so the control plane can do a single import:
#     from service import choose_action, validate_action
validate_action = _validator.validate_action
run_policy = _validator.run_policy
build_sanitized_observation = _observation.build_sanitized_observation


@dataclass(frozen=True, slots=True)
class ServiceInfo:
    """Non-secret runtime description for ``GET /api/health`` style endpoints."""

    model: str
    base_url: str
    timeout_ms: int
    prompt_version: str
    schema_version: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "model": self.model,
            "base_url": self.base_url,
            "timeout_ms": self.timeout_ms,
            "prompt_version": self.prompt_version,
            "schema_version": self.schema_version,
            "roles": list(_s.ROLES),
            "actions": list(_s.ATTACKER_ACTIONS),
        }


class RedAgentService:
    """Bounded local adversary decision service.

    The client is injectable so the decision loop can be exercised without Ollama
    (unit tests, CI, offline demo rehearsal) while production uses the real HTTP
    client with the same code path.
    """

    def __init__(
        self,
        client: _ollama.OllamaClient | None = None,
        *,
        config: _ollama.OllamaConfig | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._config = config or (client.config if client else _ollama.OllamaConfig.from_env())
        self._client = client or _ollama.OllamaClient(self._config)
        self._clock = clock
        self._digest: str | None = None

    # -- introspection -----------------------------------------------------
    @property
    def config(self) -> _ollama.OllamaConfig:
        return self._config

    def info(self) -> ServiceInfo:
        return ServiceInfo(
            model=self._config.model,
            base_url=self._config.normalised_base_url,
            timeout_ms=self._config.timeout_ms,
            prompt_version=_prompts.PROMPT_VERSION,
            schema_version=_s.RED_AGENT_SCHEMA_VERSION,
        )

    def health(self) -> dict[str, Any]:
        """Runtime reachability + whether the configured model is actually pulled."""

        return self._client.health()

    # -- decision ----------------------------------------------------------
    def choose_action(
        self,
        run_id: str,
        role: str,
        observation: "_observation.Observation | Mapping[str, Any]",
    ) -> ProposalResult:
        """Ask the local model for the next action, then validate it.

        Raises ``RedAgentError`` only for *caller* defects (wrong run, wrong role,
        untrusted observation). Model failures never raise: they return a
        proposal tagged ``fallback_used`` so the run continues and the debrief
        stays honest.
        """

        resolved = self._coerce_observation(observation)

        if not _s.is_valid_identifier(run_id):
            raise _s.RedAgentError(f"run_id is not a valid opaque handle: {run_id!r}")
        if resolved.run_handle != run_id:
            # Applying a proposal to the wrong run would corrupt correlation.
            raise _s.RedAgentError(
                f"run_id {run_id!r} does not match observation run_handle "
                f"{resolved.run_handle!r}"
            )
        if role not in _s.ROLE_SET:
            raise _s.RedAgentError(f"Unknown role: {role!r}")
        if role != resolved.assigned_role:
            raise _s.RedAgentError(
                f"role {role!r} does not match observation assigned_role "
                f"{resolved.assigned_role!r}"
            )

        messages = _prompts.build_messages(role, resolved.to_prompt_json())
        prompt_hash = _prompts.prompt_hash(role)
        captured: dict[str, Any] = {}

        def _call_model() -> str:
            reply = self._client.chat(
                messages, format_schema=_prompts.PROPOSAL_JSON_SCHEMA
            )
            captured["reply"] = reply
            return reply.text

        metadata: dict[str, Any] = {
            "run_id": run_id,
            "role": role,
            "model_id": self._config.model,
            "prompt_hash": prompt_hash,
            "prompt_version": _prompts.PROMPT_VERSION,
            "schema_version": _s.RED_AGENT_SCHEMA_VERSION,
            "model_digest": self._digest or "unresolved",
        }

        outcome = _fallback.decide_with_fallback(
            _call_model,
            resolved,
            timeout_ms=self._config.timeout_ms,
            clock=self._clock,
            metadata=metadata,
        )

        reply = captured.get("reply")
        if isinstance(reply, _ollama.ModelReply):
            outcome.metadata["model_id"] = reply.model
            outcome.metadata["model_latency_ms"] = round(reply.latency_ms, 3)
            outcome.metadata["eval_count"] = reply.eval_count
            outcome.metadata["prompt_eval_count"] = reply.prompt_eval_count
            outcome.metadata["total_duration_ms"] = reply.total_duration_ms
            outcome.metadata["done_reason"] = reply.done_reason
            outcome.metadata["thinking_chars"] = reply.thinking_chars
        else:
            outcome.metadata["model_latency_ms"] = None

        outcome.metadata["timeout_ms"] = self._config.timeout_ms
        outcome.metadata["attempted_model_call"] = bool(captured)
        return outcome

    async def achoose_action(
        self,
        run_id: str,
        role: str,
        observation: "_observation.Observation | Mapping[str, Any]",
    ) -> ProposalResult:
        """Async wrapper for the control plane's event loop.

        The blocking HTTP call runs in a worker thread; the per-turn budget is
        still enforced by ``decide_with_fallback`` inside ``choose_action``.
        """

        return await asyncio.to_thread(self.choose_action, run_id, role, observation)

    # -- helpers -----------------------------------------------------------
    def resolve_model_digest(self) -> str | None:
        """Look up the pulled model digest once and cache it for provenance."""

        if self._digest is None:
            self._digest = self._client.resolve_digest()
        return self._digest

    @staticmethod
    def _coerce_observation(
        observation: "_observation.Observation | Mapping[str, Any]",
    ) -> "_observation.Observation":
        if isinstance(observation, _observation.Observation):
            return observation
        if isinstance(observation, Mapping):
            return _observation.Observation.from_dict(observation)
        raise _s.RedAgentError(
            "observation must be an Observation or an observation mapping, got "
            f"{type(observation).__name__}"
        )


_default_service: RedAgentService | None = None


def default_service() -> RedAgentService:
    """Lazily construct the process-wide service from environment configuration."""

    global _default_service
    if _default_service is None:
        _default_service = RedAgentService()
    return _default_service


def choose_action(
    run_id: str,
    role: str,
    observation: "_observation.Observation | Mapping[str, Any]",
) -> ProposalResult:
    """Module-level convenience wrapper around ``default_service()``."""

    return default_service().choose_action(run_id, role, observation)
