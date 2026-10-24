"""Versioned live SOC requests. Frozen v1 enums remain available unchanged."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .models import IdempotencyKey, OpaqueHandle, RecordId


class StrictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LiveRunCreate(StrictRequest):
    scenario_id: Literal["stolen-session", "northstar-breach"] = "stolen-session"
    scenario_version: Literal["v1", "v2"] | None = None
    mode: Literal["practice", "assessment"] = "practice"
    assistance: Literal["coached", "independent", "blind"] = "coached"
    seed: int = Field(default=20261022, ge=0, le=2147483647)
    variant_id: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9-]{0,39}$")


class LiveDefense(StrictRequest):
    action: Literal[
        "revoke_session",
        "require_reauthentication",
        "temporarily_disable_account",
        "restore_account",
        "revoke_api_credential",
    ]
    target_handle: OpaqueHandle
    idempotency_key: IdempotencyKey


class TimelineEntry(StrictRequest):
    event_id: RecordId
    note: str = Field(max_length=2000)


class SavedQuery(StrictRequest):
    name: str = Field(min_length=1, max_length=80)
    query: str = Field(max_length=1000)


class WorkspacePatch(StrictRequest):
    revision: int = Field(ge=0)
    note: str | None = Field(default=None, max_length=20000)
    hypothesis: str | None = Field(default=None, max_length=2000)
    hypothesis_status: Literal["open", "supported", "rejected"] | None = None
    evidence_ids: list[RecordId] | None = Field(default=None, max_length=100)
    timeline: list[TimelineEntry] | None = Field(default=None, max_length=100)
    saved_queries: list[SavedQuery] | None = Field(default=None, max_length=50)


class QueryRequest(StrictRequest):
    query: str = Field(default="", max_length=1000)


class BranchRequest(StrictRequest):
    checkpoint_id: RecordId


class SessionRequest(StrictRequest):
    code: str = Field(min_length=1, max_length=128)


class AlertRequest(StrictRequest):
    status: Literal["new", "investigating", "closed"]
    verdict: Literal["true_positive", "false_positive"] | None = None
    comment: str | None = Field(default=None, max_length=4000)
    revision: int | None = Field(default=None, ge=0)


class HandoffRequest(StrictRequest):
    recipient_id: RecordId | None = None
    owner: str = Field(min_length=1, max_length=80)
    role: Literal["triage", "response", "forensics"]
    hypothesis: str = Field(min_length=1, max_length=2000)
    next_step: str = Field(min_length=1, max_length=2000)


# Public response DTOs are separate from frozen v1 fixtures. Assessment omits
# optional adversary fields rather than populating them with invented values.
from typing import Any

from .models import DebriefResponse, EventEnvelope


class NetworkTelemetry(StrictRequest):
    src_ip: str
    user_agent: str
    http_method: str
    path: str
    status_code: int = Field(ge=100, le=599)
    latency_ms: float = Field(ge=0)
    bytes: int | None = None


class LiveEvent(EventEnvelope):
    source: Literal[
        "target-access",
        "control-plane",
        "system",
        "model",
        "defender",
        "red-agent",
        "control-defender",
    ]
    outcome: (
        Literal[
            "allowed",
            "denied",
            "listed",
            "probed",
            "none",
            "error",
            "unknown",
            "applied",
            "verified",
            "failed",
        ]
        | None
    ) = None
    event_type: str
    virtual_clock_sec: float = Field(ge=0)
    network: NetworkTelemetry | None = None
    decision_id: RecordId | None = None
    parent_event_id: RecordId | None = None
    agent_meta: dict[str, Any] | None = None


class LiveSnapshot(StrictRequest):
    run_id: RecordId
    scenario_id: str
    scenario_version: str
    scenario: dict[str, Any]
    mode: Literal["practice", "assessment"]
    assistance: str
    state: str
    outcome: str | None
    created_at: str
    started_at: str | None
    ended_at: str | None
    virtual_clock_sec: float
    remaining_sec: float
    paused: bool
    state_revision: int
    fixture_hash: str
    seed: int
    declaration: dict[str, Any] | None
    verification: dict[str, Any] | None
    applied_actions: list[dict[str, Any]]
    business: list[dict[str, Any]]
    disrupted_seconds: float
    terminal_reason: str | None
    last_sequence: int
    workspace: dict[str, Any]
    model_status: str
    ai_unavailable: bool = False
    awaiting_begin: bool = False
    variant: dict[str, Any] | None = None
    branch_from: dict[str, Any] | None = None
    ai_step: int | None = None
    ai_steps_remaining: int | None = None
    current_ai_role: str | None = None
    last_ai_decision: dict[str, Any] | None = None


class LiveDebrief(DebriefResponse):
    model_provenance: dict[str, Any]
    containment_time_delta_sec: float | None
    containment_target_sec: int | None = None
    disrupted_seconds: float


RUNTIME_MODELS = {
    m.__name__: m
    for m in [
        LiveRunCreate,
        LiveDefense,
        WorkspacePatch,
        LiveEvent,
        LiveSnapshot,
        LiveDebrief,
        QueryRequest,
        BranchRequest,
        AlertRequest,
        HandoffRequest,
    ]
}


class CohortRequest(StrictRequest):
    name: str = Field(min_length=1, max_length=80)
    member_ids: list[RecordId] = Field(min_length=1, max_length=100)


class AssignmentRequest(StrictRequest):
    title: str = Field(min_length=1, max_length=120)
    cohort_id: RecordId
    scenario_id: Literal["stolen-session", "northstar-breach"]
    scenario_version: Literal["v1", "v2"]
    mode: Literal["practice", "assessment"] = "practice"
    assistance: Literal["coached", "independent", "blind"] = "coached"


class InjectRequest(StrictRequest):
    sender: Literal["Shift lead", "Operations desk", "Employee support"]
    message: str = Field(min_length=1, max_length=2000)


RUNTIME_MODELS.update(
    {m.__name__: m for m in [CohortRequest, AssignmentRequest, InjectRequest]}
)


class AssistantRequest(StrictRequest):
    event_ids: list[RecordId] = Field(default_factory=list, max_length=12)
    level: Literal["explain", "nudge", "guide"] = "explain"
    request_id: IdempotencyKey | None = None
    question: str = Field(min_length=1, max_length=1000)


class AssistantReview(StrictRequest):
    status: Literal["corroborated", "disputed", "needs_more_evidence"]
    note: str = Field(min_length=1, max_length=2000)


RUNTIME_MODELS.update({m.__name__: m for m in [AssistantRequest, AssistantReview]})


class CaseCreate(StrictRequest):
    alert_id: RecordId
    idempotency_key: IdempotencyKey


class CaseArtifact(StrictRequest):
    type: Literal["IP Address", "URL", "Domain", "Access Handle", "Other"]
    value: str = Field(min_length=1, max_length=1000)
    event_ids: list[RecordId] = Field(min_length=1, max_length=100)


class CasePatch(StrictRequest):
    revision: int = Field(ge=0)
    note: str | None = Field(default=None, max_length=20000)
    scope: str | None = Field(default=None, max_length=4000)
    report: str | None = Field(default=None, max_length=8000)
    artifacts: list[CaseArtifact] | None = Field(default=None, max_length=100)
    start_playbook: bool = False
    complete_step: (
        Literal[
            "evidence", "scope", "declaration", "containment", "recovery", "reporting"
        ]
        | None
    ) = None


RUNTIME_MODELS.update({m.__name__: m for m in [CaseCreate, CasePatch, CaseArtifact]})


class WorksheetFields(StrictRequest):
    observation: str = Field(default="", max_length=4000)
    hypothesis: str = Field(default="", max_length=4000)
    supporting_evidence: str = Field(default="", max_length=4000)
    contradicting_evidence: str = Field(default="", max_length=4000)
    scope_uncertainty: str = Field(default="", max_length=4000)
    action_impact: str = Field(default="", max_length=4000)
    verification_handoff: str = Field(default="", max_length=4000)


class WorksheetPatch(StrictRequest):
    revision: int = Field(ge=0)
    save_id: IdempotencyKey
    fields: WorksheetFields
    evidence_ids: list[RecordId] = Field(default_factory=list, max_length=100)


RUNTIME_MODELS.update({m.__name__: m for m in [WorksheetPatch, WorksheetFields]})


class CoachSupport(StrictRequest):
    source_id: str = Field(min_length=1, max_length=100)
    field: str = Field(min_length=1, max_length=80)
    quote: str = Field(min_length=1, max_length=500)


class CoachClaim(StrictRequest):
    kind: Literal["fact", "hypothesis"]
    # Four bounded supports plus their source/field labels must survive API revalidation.
    text: str = Field(min_length=1, max_length=3000)
    evidence_ids: list[RecordId] = Field(max_length=4)
    supports: list[CoachSupport] = Field(min_length=1, max_length=4)


class CoachAnalysis(StrictRequest):
    claims: list[CoachClaim] = Field(min_length=1, max_length=2)
    next_question: str = Field(min_length=1, max_length=300)
    query_focus: Literal["session", "user", "resource", "outcome"] | None = None


RUNTIME_MODELS.update({m.__name__: m for m in [CoachSupport, CoachClaim, CoachAnalysis]})
