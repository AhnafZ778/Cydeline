"""Canonical enums, schema constants and result types for the bounded red-agent.

This module is the single source of truth for the *attacker-side* contract:

* the six permitted ``AttackerAction`` values (PRD 8.1),
* the three sequential logical roles (PRD 9.2),
* the strict five-field proposal envelope (PRD 8.3),
* rejection codes shared by the two-stage validator.

Design notes
------------
The red-agent never talks to the network, the filesystem or the shell. A proposal
is a *request for permission*, not an executed action. Nothing in this module
performs I/O, so it is safe to import from the control plane test-suite.

The module is deliberately dependency-free (standard library only) so that
``tests/agent/`` runs on a bare Python interpreter before Ollama is installed.
``contracts/models.py`` (owned by Saad) will eventually hold the canonical
Pydantic DTOs; until that increment lands, these lightweight dataclasses are the
local contract and ``Proposal.to_dict()`` is the wire shape to keep in sync.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import hashlib
import json
import re
from typing import Any, Mapping, Sequence

# Bumped whenever the proposal envelope or policy semantics change.
RED_AGENT_SCHEMA_VERSION = "1.0.0"

# --- PRD 8.1 canonical attacker actions (closed enum, do not extend casually) ---
ATTACKER_ACTIONS: tuple[str, ...] = (
    "inspect_session_status",
    "list_accessible_documents",
    "request_document",
    "test_existing_session",
    "wait",
    "stop",
)
ATTACKER_ACTION_SET: frozenset[str] = frozenset(ATTACKER_ACTIONS)

# --- PRD 9.2 three sequential logical roles on one model instance ---
ROLES: tuple[str, ...] = ("scout", "access_operator", "adaptation_planner")
ROLE_SET: frozenset[str] = frozenset(ROLES)

# Role capability ceilings. The effective permission for a turn is the
# intersection of this ceiling, the state-derived gate and the observation's
# declared ``permitted_actions`` (see ``validator.run_policy``).
#
# ``adaptation_planner`` is intentionally narrow: its job is to react to a
# defender action (probe / wait / stop). A restored session is re-opened by a
# fresh ``scout`` or ``access_operator`` turn owned by the control plane, which
# keeps the adaptation claim honest instead of letting one role do everything.
ROLE_ALLOWED_ACTIONS: dict[str, frozenset[str]] = {
    "scout": frozenset(
        {
            "inspect_session_status",
            "list_accessible_documents",
            "test_existing_session",
            "wait",
            "stop",
        }
    ),
    "access_operator": frozenset(
        {
            "inspect_session_status",
            "list_accessible_documents",
            "request_document",
            "test_existing_session",
            "wait",
            "stop",
        }
    ),
    "adaptation_planner": frozenset(
        {"inspect_session_status", "test_existing_session", "wait", "stop"}
    ),
}

# Which envelope fields each action must carry. Handles are never optional
# "extra credit": a ``wait`` proposal that also carries a target is malformed.
ACTION_REQUIRED_FIELDS: dict[str, tuple[str, ...]] = {
    "inspect_session_status": ("session_handle",),
    "list_accessible_documents": ("session_handle",),
    "request_document": ("session_handle", "target_id"),
    "test_existing_session": ("session_handle",),
    "wait": (),
    "stop": (),
}

# --- Attacker-visible session status vocabulary -------------------------------
SESSION_STATUSES: tuple[str, ...] = (
    "active",
    "unknown",
    "revoked",
    "disabled",
    "expired",
)
SESSION_STATUS_SET: frozenset[str] = frozenset(SESSION_STATUSES)

# Actions that *require* a live session to be meaningful.
SESSION_DEPENDENT_ACTIONS: frozenset[str] = frozenset(
    {
        "list_accessible_documents",
        "request_document",
        "test_existing_session",
    }
)

# --- Attacker-visible last-result vocabulary ---------------------------------
LAST_RESULTS: tuple[str, ...] = (
    "allowed",
    "denied",
    "listed",
    "probed",
    "none",
    "error",
    "unknown",
)
LAST_RESULT_SET: frozenset[str] = frozenset(LAST_RESULTS)

# Opaque identifier grammar. Handles are matched *verbatim* against the
# observation allowlist, so this pattern is a defence-in-depth assertion rather
# than the primary control. It intentionally forbids ``/``, whitespace, quotes,
# semicolons and pipes, which blocks URLs, paths, shell fragments and
# prompt-injection punctuation. The 32-character cap matters too: the observation
# carries no free-text field at all, so a smuggled instruction can only ride in a
# handle, and no useful injection instruction fits in 32 identifier characters.
IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,31}$")

# Substrings that must never survive into an accepted proposal reason. The reason
# is non-authoritative, so matches are redacted (not rejected) and surfaced as
# provenance metadata.
UNSAFE_REASON_PATTERN = re.compile(
    r"(https?://|ftp://|file://|/etc/|/bin/|\.\./|[;&|`$<>\\]"
    r"|\brm\s+-|\bsudo\b|\bcurl\b|\bwget\b|\bbash\b|\bsh\s+-c|\bnc\s+-)",
    re.IGNORECASE,
)

REASON_MAX_LENGTH = 280
REDACTED_REASON = "[redacted: unsafe content removed]"

PROPOSAL_FIELDS: tuple[str, ...] = (
    "role",
    "action",
    "target_id",
    "session_handle",
    "reason",
)
PROPOSAL_FIELD_SET: frozenset[str] = frozenset(PROPOSAL_FIELDS)

OBSERVATION_FIELDS: tuple[str, ...] = (
    "run_handle",
    "assigned_role",
    "step",
    "steps_remaining",
    "session_handles",
    "allowed_target_ids",
    "last_action",
    "last_result",
    "current_session_status",
    "permitted_actions",
)
OBSERVATION_FIELD_SET: frozenset[str] = frozenset(OBSERVATION_FIELDS)


class RedAgentError(Exception):
    """Base class for red-agent domain errors."""


class ObservationError(RedAgentError):
    """Raised when sanitized observation input cannot be trusted."""


class TimeoutBudgetExceeded(RedAgentError):
    """Raised when a model decision exceeds its per-turn time budget."""


class ModelInvocationError(RedAgentError):
    """Raised when the local model call fails at the transport layer."""


# --- Stage 1 (JSON/schema) rejection codes -----------------------------------
STAGE1_NON_JSON = "non_json_payload"
STAGE1_DUPLICATE_KEYS = "duplicate_json_keys"
STAGE1_PROSE_OUTSIDE_JSON = "prose_outside_json"
STAGE1_NOT_OBJECT = "not_a_json_object"
STAGE1_MISSING_FIELD = "missing_field"
STAGE1_UNKNOWN_FIELD = "unknown_field"
STAGE1_INVALID_TYPE = "invalid_type"
STAGE1_INVALID_ENUM = "invalid_enum"
STAGE1_INVALID_REASON = "invalid_reason"

# --- Stage 2 (policy) rejection codes ----------------------------------------
STAGE2_ROLE_MISMATCH = "role_mismatch"
STAGE2_UNKNOWN_ACTION = "unknown_action"
STAGE2_ACTION_NOT_PERMITTED_FOR_ROLE = "action_not_permitted_for_role"
STAGE2_ACTION_NOT_PERMITTED = "action_not_in_permitted_actions"
STAGE2_BUDGET_EXHAUSTED = "budget_exhausted"
STAGE2_ACTION_BLOCKED_BY_STATUS = "action_blocked_by_session_status"
STAGE2_MISSING_SESSION_HANDLE = "missing_session_handle"
STAGE2_UNEXPECTED_SESSION_HANDLE = "unexpected_session_handle"
STAGE2_UNKNOWN_SESSION_HANDLE = "unknown_session_handle"
STAGE2_MISSING_TARGET_ID = "missing_target_id"
STAGE2_UNEXPECTED_TARGET_ID = "unexpected_target_id"
STAGE2_UNKNOWN_TARGET_ID = "unknown_target_id"
STAGE2_MALFORMED_IDENTIFIER = "malformed_identifier"

# --- Fallback provenance codes -----------------------------------------------
FALLBACK_TIMEOUT = "timeout"
FALLBACK_MODEL_ERROR = "model_error"
FALLBACK_INVALID_JSON = "invalid_json"
FALLBACK_POLICY_REJECTION = "policy_rejection"
FALLBACK_SCHEMA_REJECTION = "schema_rejection"
FALLBACK_UNEXPECTED_ERROR = "unexpected_error"


def canonical_json(payload: Any) -> str:
    """Serialize ``payload`` deterministically for hashing."""

    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
        default=str,
    )


def sha256_hex(text: str) -> str:
    """Return the lowercase hex SHA-256 digest of ``text``."""

    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def hash_payload(payload: Any) -> str:
    """Return a stable SHA-256 digest for a JSON-serializable payload.

    Used for ``observation_hash`` and ``prompt_hash`` provenance, so it must not
    depend on dict insertion order.
    """

    return sha256_hex(canonical_json(payload))


def is_valid_identifier(value: Any) -> bool:
    """Return True when ``value`` is an acceptable opaque handle or target id."""

    return isinstance(value, str) and bool(IDENTIFIER_PATTERN.match(value))


def sanitize_reason(reason: str) -> tuple[str, bool]:
    """Return ``(reason, redacted)`` for a non-authoritative proposal reason.

    The reason is never used for authorization, scoring or success claims, so a
    suspicious reason is redacted and flagged rather than treated as a policy
    violation. Control characters are always stripped.
    """

    cleaned = "".join(ch for ch in reason if ch.isprintable()).strip()
    if not cleaned:
        return "", True
    redacted = bool(UNSAFE_REASON_PATTERN.search(cleaned))
    if redacted:
        return REDACTED_REASON, True
    if len(cleaned) > REASON_MAX_LENGTH:
        return cleaned[:REASON_MAX_LENGTH].rstrip(), True
    return cleaned, False


@dataclass(frozen=True, slots=True)
class Proposal:
    """A model-proposed, *not yet approved* attacker action.

    Mirrors PRD 8.3 exactly: five fields, no extras. ``fallback_used`` is
    deliberately absent — it is service provenance, and letting the model emit
    it would let a hallucination impersonate a deterministic fallback.
    """

    role: str
    action: str
    target_id: str | None
    session_handle: str | None
    reason: str

    def to_dict(self) -> dict[str, Any]:
        """Return the canonical five-field wire envelope."""

        return {
            "role": self.role,
            "action": self.action,
            "target_id": self.target_id,
            "session_handle": self.session_handle,
            "reason": self.reason,
        }

    @property
    def fingerprint(self) -> str:
        """Stable hash of the proposal payload, useful in traces."""

        return hash_payload(self.to_dict())


@dataclass(frozen=True, slots=True)
class Rejection:
    """Why a proposal was refused, with enough detail for the audit trace."""

    stage: int
    code: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        return {"stage": self.stage, "code": self.code, "message": self.message}


@dataclass(frozen=True, slots=True)
class ValidationResult:
    """Outcome of the two-stage validator.

    ``policy`` is the effective allowlist snapshot the decision was judged
    against; storing it makes a rejection reproducible after the run advances.
    """

    accepted: bool
    proposal: Proposal | None = None
    rejection: Rejection | None = None
    policy: Mapping[str, Any] = field(default_factory=dict)
    metadata: Mapping[str, Any] = field(default_factory=dict)

    @property
    def rejection_code(self) -> str | None:
        return self.rejection.code if self.rejection else None

    @property
    def rejection_reason(self) -> str | None:
        """Human-readable rejection text for ``agent_decisions.rejection_reason``."""

        if self.rejection is None:
            return None
        return f"stage{self.rejection.stage}:{self.rejection.code}: {self.rejection.message}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "accepted": self.accepted,
            "proposal": self.proposal.to_dict() if self.proposal else None,
            "rejection": self.rejection.to_dict() if self.rejection else None,
            "policy": dict(self.policy),
            "metadata": dict(self.metadata),
        }


def approved_action(proposal: Proposal) -> dict[str, Any]:
    """Map an accepted proposal to the enum + handles the adapter will execute.

    Saad's ``execute_allowlisted_attacker_action(run_id, action, handles)``
    receives only this projection, never free-form model text.
    """

    return {
        "action": proposal.action,
        "target_id": proposal.target_id,
        "session_handle": proposal.session_handle,
    }


def role_ceiling(role: str) -> frozenset[str]:
    """Return the static action ceiling for ``role`` (empty for unknown roles)."""

    return ROLE_ALLOWED_ACTIONS.get(role, frozenset())


def assert_known_roles(roles: Sequence[str]) -> None:
    """Raise when a role list drifts from the canonical set."""

    unknown = [role for role in roles if role not in ROLE_SET]
    if unknown:
        raise RedAgentError(f"Unknown role(s): {unknown!r}")
