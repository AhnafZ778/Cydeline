"""Canonical cross-segment enums for Sentinel Loop (Gate G0).

The six enums in the first block are frozen by
``01_PRODUCT_REQUIREMENTS_DOCUMENT.md`` section 8.1 and
``Agent_Instructions/references/PLAN_PHASE.md``. Changing a value requires a
PRD amendment plus an update to ``context/contracts/master-integration.contract.md``.

The supporting vocabularies below are shared implementation vocabulary, not
canonical product enums. They are versioned with ``CONTRACT_SCHEMA_VERSION``.
"""

from __future__ import annotations

from enum import Enum


class RunState(str, Enum):
    """Lifecycle state of a single exercise run."""

    CREATED = "created"
    RUNNING = "running"
    CONTAINED = "contained"
    VERIFICATION_PENDING = "verification_pending"
    COMPLETED = "completed"
    TIMED_OUT = "timed_out"
    ABORTED = "aborted"
    TECHNICAL_FAILURE = "technical_failure"


class Outcome(str, Enum):
    """Terminal verdict. Outcome gates override the raw score."""

    DEFENDED_AND_RECOVERED = "defended_and_recovered"
    CONTAINED_BUT_DISRUPTED = "contained_but_disrupted"
    ATTACKER_OBJECTIVE_REACHED = "attacker_objective_reached"
    TIMED_OUT_UNRESOLVED = "timed_out_unresolved"
    ABORTED = "aborted"
    TECHNICAL_FAILURE = "technical_failure"


class Mode(str, Enum):
    """Assessment mode. Hints are unavailable in ``assessment``."""

    PRACTICE = "practice"
    ASSESSMENT = "assessment"


class AttackerAction(str, Enum):
    """Closed attacker action enum. The model can request nothing else."""

    INSPECT_SESSION_STATUS = "inspect_session_status"
    LIST_ACCESSIBLE_DOCUMENTS = "list_accessible_documents"
    REQUEST_DOCUMENT = "request_document"
    TEST_EXISTING_SESSION = "test_existing_session"
    WAIT = "wait"
    STOP = "stop"


class DefenderAction(str, Enum):
    """Closed defender action enum accepted from the learner browser."""

    REVOKE_SESSION = "revoke_session"
    TEMPORARILY_DISABLE_ACCOUNT = "temporarily_disable_account"
    REQUIRE_REAUTHENTICATION = "require_reauthentication"
    RESTORE_ACCOUNT = "restore_account"


class Verification(str, Enum):
    """The two mandatory, independently measured recovery probes."""

    VERIFY_SUSPICIOUS_SESSION_DENIED = "verify_suspicious_session_denied"
    VERIFY_BENIGN_WORKFLOW = "verify_benign_workflow"


class Role(str, Enum):
    """Sequential logical roles played by the single local model."""

    SCOUT = "scout"
    ACCESS_OPERATOR = "access_operator"
    ADAPTATION_PLANNER = "adaptation_planner"


class SessionStatus(str, Enum):
    """Attacker-visible session status vocabulary."""

    ACTIVE = "active"
    UNKNOWN = "unknown"
    REVOKED = "revoked"
    DISABLED = "disabled"
    EXPIRED = "expired"


class AccessOutcome(str, Enum):
    """Measured target result vocabulary, shared with the red-agent."""

    ALLOWED = "allowed"
    DENIED = "denied"
    LISTED = "listed"
    PROBED = "probed"
    NONE = "none"
    ERROR = "error"
    UNKNOWN = "unknown"


class EventSource(str, Enum):
    """Origin of a canonical event in the control-plane store."""

    TARGET_ACCESS = "target-access"
    CONTROL_PLANE = "control-plane"
    MODEL = "model"
    DEFENDER = "defender"
    SYSTEM = "system"


class EventType(str, Enum):
    """Canonical event type names rendered in the learner-visible feed."""

    RUN_CREATED = "run.created"
    RUN_STARTED = "run.started"
    RUN_COMPLETED = "run.completed"
    RUN_RESET = "run.reset"
    SESSION_STATUS = "session.status"
    SESSION_REVOKED = "session.revoked"
    SESSION_REAUTH_REQUIRED = "session.reauth_required"
    DOCUMENT_LIST = "document.list"
    DOCUMENT_ACCESS = "document.access"
    ACCOUNT_DISABLED = "account.disabled"
    ACCOUNT_RESTORED = "account.restored"
    BENIGN_WORKFLOW = "benign.workflow"
    AGENT_DECISION = "agent.decision"
    DECLARATION_SUBMITTED = "declaration.submitted"
    VERIFICATION_CHECK = "verification.check"
    SCORE_COMPUTED = "score.computed"


class HealthStatus(str, Enum):
    """Health vocabulary for ``GET /api/health``."""

    OK = "ok"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


class ScoreDimension(str, Enum):
    """The six reviewed 100-point rubric dimensions."""

    RECOGNITION = "recognition"
    CONTAINMENT = "containment"
    VERIFICATION = "verification"
    CONTINUITY = "continuity"
    PROPORTIONALITY = "proportionality"
    TIMELINESS = "timeliness"


CANONICAL_ENUMS: dict[str, tuple[str, ...]] = {
    "RunState": tuple(item.value for item in RunState),
    "Outcome": tuple(item.value for item in Outcome),
    "Mode": tuple(item.value for item in Mode),
    "AttackerAction": tuple(item.value for item in AttackerAction),
    "DefenderAction": tuple(item.value for item in DefenderAction),
    "Verification": tuple(item.value for item in Verification),
}

RUBRIC_MAX_POINTS: dict[ScoreDimension, int] = {
    ScoreDimension.RECOGNITION: 20,
    ScoreDimension.CONTAINMENT: 25,
    ScoreDimension.VERIFICATION: 20,
    ScoreDimension.CONTINUITY: 15,
    ScoreDimension.PROPORTIONALITY: 10,
    ScoreDimension.TIMELINESS: 10,
}


def enum_values(enum_type: type[Enum]) -> tuple[str, ...]:
    """Return the definition-order values of ``enum_type``."""

    return tuple(member.value for member in enum_type)


ACTION_REQUIRED_HANDLES: dict[AttackerAction, frozenset[str]] = {
    AttackerAction.INSPECT_SESSION_STATUS: frozenset({"session_handle"}),
    AttackerAction.LIST_ACCESSIBLE_DOCUMENTS: frozenset({"session_handle"}),
    AttackerAction.REQUEST_DOCUMENT: frozenset({"session_handle", "target_id"}),
    AttackerAction.TEST_EXISTING_SESSION: frozenset({"session_handle"}),
    AttackerAction.WAIT: frozenset(),
    AttackerAction.STOP: frozenset(),
}


__all__ = [
    "ACTION_REQUIRED_HANDLES",
    "AccessOutcome",
    "AttackerAction",
    "CANONICAL_ENUMS",
    "DefenderAction",
    "EventSource",
    "EventType",
    "HealthStatus",
    "Mode",
    "Outcome",
    "RUBRIC_MAX_POINTS",
    "Role",
    "RunState",
    "ScoreDimension",
    "SessionStatus",
    "Verification",
    "enum_values",
]
