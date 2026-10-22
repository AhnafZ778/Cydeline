"""Canonical Pydantic DTOs shared by Ahnaf, Tanvir, and Saad.

Every model forbids unknown fields so a contract drift fails loudly at the
boundary instead of silently passing through. Timestamps must be timezone-aware
and are serialized as UTC ``Z`` strings. Opaque handles are validated against
the same grammar the red-agent uses (max 32 characters, no URLs, paths or shell
punctuation).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    StringConstraints,
    field_validator,
    model_validator,
)

from .enums import (
    ACTION_REQUIRED_HANDLES,
    RUBRIC_MAX_POINTS,
    AccessOutcome,
    AttackerAction,
    DefenderAction,
    EventSource,
    EventType,
    HealthStatus,
    Mode,
    Outcome,
    Role,
    RunState,
    ScoreDimension,
    Verification,
)

CONTRACT_SCHEMA_VERSION = "1.0.0"

OPAQUE_HANDLE_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,31}$"
RECORD_ID_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$"
SHA256_HEX_PATTERN = r"^[a-f0-9]{64}$"

OpaqueHandle = Annotated[str, StringConstraints(pattern=OPAQUE_HANDLE_PATTERN)]
RecordId = Annotated[str, StringConstraints(pattern=RECORD_ID_PATTERN)]
Sha256Hex = Annotated[str, StringConstraints(pattern=SHA256_HEX_PATTERN)]
ReasonText = Annotated[str, StringConstraints(min_length=1, max_length=280)]
RationaleText = Annotated[str, StringConstraints(min_length=1, max_length=2000)]
IdempotencyKey = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_.:-]{8,128}$")]


def _require_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("timestamp must include a timezone")
    return value.astimezone(timezone.utc)


def _serialize_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


UtcDatetime = Annotated[
    datetime,
    AfterValidator(_require_utc),
    PlainSerializer(_serialize_utc, return_type=str, when_used="json"),
]


class ContractModel(BaseModel):
    """Immutable DTO base with strict field policy."""

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        str_strip_whitespace=True,
    )


class AttackerProposal(ContractModel):
    """Five-field proposal envelope from the red-agent (PRD 8.3)."""

    role: Role
    action: AttackerAction
    target_id: OpaqueHandle | None = None
    session_handle: OpaqueHandle | None = None
    reason: ReasonText

    @model_validator(mode="after")
    def _handles_match_action(self) -> "AttackerProposal":
        provided = {
            name
            for name in ("session_handle", "target_id")
            if getattr(self, name) is not None
        }
        required = ACTION_REQUIRED_HANDLES[self.action]
        if provided != required:
            raise ValueError(
                f"action {self.action.value!r} requires exactly {sorted(required)}; "
                f"got {sorted(provided)}"
            )
        return self


class EventEnvelope(ContractModel):
    """Canonical learner-visible event stored and streamed by the control plane."""

    event_id: RecordId
    run_id: RecordId
    sequence: int = Field(ge=1)
    timestamp_utc: UtcDatetime
    visible_at_utc: UtcDatetime
    source: EventSource
    event_type: EventType
    actor_id: OpaqueHandle
    session_handle: OpaqueHandle | None = None
    resource_id: OpaqueHandle | None = None
    outcome: AccessOutcome | None = None
    correlation_id: RecordId
    target_audit_id: RecordId | None = None
    learner_visible: bool = True

    @model_validator(mode="after")
    def _visible_after_occurred(self) -> "EventEnvelope":
        if self.visible_at_utc < self.timestamp_utc:
            raise ValueError("visible_at_utc cannot precede timestamp_utc")
        return self


class AgentDecisionRecord(ContractModel):
    """One validated or rejected red-agent turn, with provenance."""

    decision_id: RecordId
    run_id: RecordId
    step: int = Field(ge=0)
    role: Role
    model_id: str = Field(min_length=1, max_length=128)
    prompt_hash: Sha256Hex
    observation_hash: Sha256Hex
    proposed_json: dict[str, Any] | None = None
    accepted_action: AttackerAction | None = None
    rejection_reason: str | None = Field(default=None, max_length=1000)
    latency_ms: int = Field(ge=0)
    fallback_used: bool = False
    created_at: UtcDatetime

    @model_validator(mode="after")
    def _accepted_has_evidence(self) -> "AgentDecisionRecord":
        if self.accepted_action is not None and self.proposed_json is None:
            raise ValueError("accepted_action requires the proposed_json it came from")
        if self.accepted_action is not None and self.rejection_reason is not None:
            raise ValueError("a decision cannot be both accepted and rejected")
        return self


class DeclarationRequest(ContractModel):
    """Learner incident declaration; evidence must be visible in the same run."""

    suspected_actor: OpaqueHandle
    suspected_session: OpaqueHandle
    rationale: RationaleText
    event_ids: list[RecordId] = Field(min_length=1, max_length=50)

    @field_validator("event_ids")
    @classmethod
    def _unique_event_ids(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("event_ids must not contain duplicates")
        return value


class DeclarationResponse(ContractModel):
    """Server verdict for a declaration, including any rejected evidence IDs."""

    declaration_id: RecordId
    run_id: RecordId
    accepted: bool
    suspected_actor: OpaqueHandle
    suspected_session: OpaqueHandle
    rationale: RationaleText
    event_ids: list[RecordId] = Field(default_factory=list)
    rejected_event_ids: list[RecordId] = Field(default_factory=list)
    created_at: UtcDatetime

    @model_validator(mode="after")
    def _accepted_requires_evidence(self) -> "DeclarationResponse":
        if self.accepted and not self.event_ids:
            raise ValueError("accepted declaration requires at least one valid event_id")
        if not self.accepted and not self.rejected_event_ids:
            raise ValueError("rejected declaration requires at least one rejected event_id")
        return self


class DefenderActionRequest(ContractModel):
    """Idempotent containment request from the learner browser."""

    action: DefenderAction
    target_handle: OpaqueHandle
    idempotency_key: IdempotencyKey
    rationale: str | None = Field(default=None, max_length=500)


class DefenderActionResponse(ContractModel):
    """Measured result of a containment request, including idempotent replays."""

    action_id: RecordId
    run_id: RecordId
    action: DefenderAction
    target_handle: OpaqueHandle
    idempotency_key: IdempotencyKey
    requested_at: UtcDatetime
    applied_at: UtcDatetime | None = None
    applied: bool
    measured_result: dict[str, Any]
    target_audit_id: RecordId | None = None
    duplicate: bool = False

    @model_validator(mode="after")
    def _applied_has_timestamp(self) -> "DefenderActionResponse":
        if self.applied and self.applied_at is None:
            raise ValueError("applied action requires applied_at")
        if self.applied and self.target_audit_id is None:
            raise ValueError("applied action requires a measured target_audit_id")
        return self


class VerificationCheck(ContractModel):
    """One independently measured recovery probe."""

    verification: Verification
    passed: bool
    measured_result: dict[str, Any]
    target_audit_id: RecordId
    checked_at: UtcDatetime


class VerificationResponse(ContractModel):
    """Both mandatory probes. A single passing check is not recovery."""

    run_id: RecordId
    checks: list[VerificationCheck] = Field(min_length=2, max_length=2)
    all_passed: bool
    verified_at: UtcDatetime

    @model_validator(mode="after")
    def _both_checks_present(self) -> "VerificationResponse":
        present = {check.verification for check in self.checks}
        if present != set(Verification):
            raise ValueError("verification requires both canonical probes exactly once")
        if self.all_passed != all(check.passed for check in self.checks):
            raise ValueError("all_passed must equal the AND of every probe")
        return self


class ScoreComponent(ContractModel):
    """One rubric dimension with citable evidence."""

    dimension: ScoreDimension
    awarded: int = Field(ge=0)
    max_points: int = Field(gt=0)
    rule_id: str = Field(min_length=1, max_length=64)
    explanation: str = Field(min_length=1, max_length=500)
    evidence_ids: list[RecordId] = Field(default_factory=list)

    @model_validator(mode="after")
    def _awarded_within_max(self) -> "ScoreComponent":
        if self.awarded > self.max_points:
            raise ValueError("awarded cannot exceed max_points")
        return self


class DebriefResponse(ContractModel):
    """Deterministic scorecard. Outcome gates are already applied by the server."""

    run_id: RecordId
    rubric_version: str = Field(min_length=1, max_length=32)
    outcome: Outcome
    score_total: int = Field(ge=0, le=100)
    breakdown: list[ScoreComponent] = Field(min_length=6, max_length=6)
    outcome_gate: str | None = Field(default=None, max_length=64)
    first_suspicious_event_id: RecordId | None = None
    first_visible_at_utc: UtcDatetime | None = None
    effective_containment: bool
    benign_workflow_passed: bool
    fallback_used: bool
    evidence_event_ids: list[RecordId] = Field(default_factory=list)
    computed_at: UtcDatetime
    notes: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _breakdown_is_complete(self) -> "DebriefResponse":
        dimensions = [component.dimension for component in self.breakdown]
        if len(dimensions) != len(set(dimensions)):
            raise ValueError("breakdown must not repeat a dimension")
        if set(dimensions) != set(ScoreDimension):
            raise ValueError("breakdown must contain all six rubric dimensions")
        for component in self.breakdown:
            expected = RUBRIC_MAX_POINTS[component.dimension]
            if component.max_points != expected:
                raise ValueError(
                    f"{component.dimension.value} max_points must be {expected}"
                )
        if self.score_total != sum(component.awarded for component in self.breakdown):
            raise ValueError("score_total must equal the sum of awarded points")
        return self


class RunCreateRequest(ContractModel):
    """``POST /api/runs`` body."""

    mode: Mode = Mode.PRACTICE
    scenario_version: str = Field(default="v1", pattern=r"^v[0-9]+$")


class RunResponse(ContractModel):
    """Canonical run summary returned by create/start/reset."""

    run_id: RecordId
    scenario_id: str = Field(min_length=1, max_length=64)
    scenario_version: str = Field(min_length=1, max_length=32)
    mode: Mode
    state: RunState
    outcome: Outcome | None = None
    seed: int = Field(ge=0)
    fixture_hash: Sha256Hex
    created_at: UtcDatetime
    started_at: UtcDatetime | None = None
    ended_at: UtcDatetime | None = None


class EventPage(ContractModel):
    """``GET /api/runs/{id}/events`` backfill page."""

    run_id: RecordId
    events: list[EventEnvelope]
    next_cursor: int | None = Field(default=None, ge=1)
    has_more: bool = False


class SSEFrame(ContractModel):
    """One Server-Sent Event frame; ``id`` is the monotonic sequence."""

    id: str = Field(pattern=r"^[1-9][0-9]*$")
    event: str = Field(min_length=1, max_length=64)
    data: EventEnvelope

    @model_validator(mode="after")
    def _id_matches_sequence(self) -> "SSEFrame":
        if self.id != str(self.data.sequence):
            raise ValueError("SSE id must equal data.sequence")
        return self


class ReplayResponse(ContractModel):
    """Immutable recorded trace. Serving it must not call the target or model."""

    run_id: RecordId
    outcome: Outcome
    events: list[EventEnvelope]
    agent_decisions: list[AgentDecisionRecord]
    defender_actions: list[DefenderActionResponse]
    declarations: list[DeclarationResponse]
    verification_checks: list[VerificationCheck]
    debrief: DebriefResponse
    trace_hash: Sha256Hex
    replayed_at: UtcDatetime


class HealthResponse(ContractModel):
    """``GET /api/health`` response; never includes credentials or answer keys."""

    status: HealthStatus
    version: str = Field(min_length=1, max_length=32)
    services: dict[str, HealthStatus]
    checked_at: UtcDatetime


class ErrorResponse(ContractModel):
    """Canonical structured error envelope (PRD 8.4)."""

    code: str = Field(min_length=1, max_length=64)
    message: str = Field(min_length=1, max_length=1000)
    correlation_id: RecordId


CONTRACT_MODELS: dict[str, type[ContractModel]] = {
    "AttackerProposal": AttackerProposal,
    "EventEnvelope": EventEnvelope,
    "AgentDecisionRecord": AgentDecisionRecord,
    "DeclarationRequest": DeclarationRequest,
    "DeclarationResponse": DeclarationResponse,
    "DefenderActionRequest": DefenderActionRequest,
    "DefenderActionResponse": DefenderActionResponse,
    "VerificationCheck": VerificationCheck,
    "VerificationResponse": VerificationResponse,
    "ScoreComponent": ScoreComponent,
    "DebriefResponse": DebriefResponse,
    "RunCreateRequest": RunCreateRequest,
    "RunResponse": RunResponse,
    "EventPage": EventPage,
    "SSEFrame": SSEFrame,
    "ReplayResponse": ReplayResponse,
    "HealthResponse": HealthResponse,
    "ErrorResponse": ErrorResponse,
}


__all__ = [
    "AgentDecisionRecord",
    "CONTRACT_MODELS",
    "CONTRACT_SCHEMA_VERSION",
    "ContractModel",
    "DebriefResponse",
    "DeclarationRequest",
    "DeclarationResponse",
    "DefenderActionRequest",
    "DefenderActionResponse",
    "ErrorResponse",
    "EventEnvelope",
    "EventPage",
    "HealthResponse",
    "IdempotencyKey",
    "OPAQUE_HANDLE_PATTERN",
    "OpaqueHandle",
    "RECORD_ID_PATTERN",
    "ReplayResponse",
    "RunCreateRequest",
    "RunResponse",
    "SHA256_HEX_PATTERN",
    "SSEFrame",
    "ScoreComponent",
    "Sha256Hex",
    "UtcDatetime",
    "VerificationCheck",
    "VerificationResponse",
]
