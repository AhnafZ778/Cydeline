"""Trusted Target Adapter contract (PRD 8.5).

The adapter is the only path from the control plane into the isolated target.
It is never exposed to the learner browser or the model. Both an in-process
adapter (unit/integration tests) and an HTTP adapter (``compose.yaml``) must
implement this exact method set.
"""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable

from pydantic import Field

from .enums import AccessOutcome, AttackerAction, DefenderAction, EventType, Verification
from .models import (
    ContractModel,
    OpaqueHandle,
    RecordId,
    Sha256Hex,
    UtcDatetime,
)


class AttackerHandles(ContractModel):
    """Opaque handles for one allowlisted attacker action."""

    session_handle: OpaqueHandle | None = None
    target_id: OpaqueHandle | None = None


class TargetProvisionResult(ContractModel):
    """Result of ``create_fresh_target``."""

    target_instance_id: RecordId
    run_id: RecordId
    fixture_hash: Sha256Hex
    created_at: UtcDatetime


class AttackerActionResult(ContractModel):
    """Measured HTTP result of an allowlisted attacker action."""

    request_id: RecordId
    run_id: RecordId
    action: AttackerAction
    http_status: int = Field(ge=100, le=599)
    outcome: AccessOutcome
    result: dict[str, Any]
    target_audit_id: RecordId
    session_handle: OpaqueHandle | None = None
    target_id: OpaqueHandle | None = None


class DefenderActionResult(ContractModel):
    """Measured state transition produced by a defender action."""

    run_id: RecordId
    action: DefenderAction
    target_handle: OpaqueHandle
    applied: bool
    verified_result: dict[str, Any]
    target_audit_id: RecordId
    state_transition: dict[str, str] = Field(default_factory=dict)
    applied_at: UtcDatetime


class TargetAuditEntry(ContractModel):
    """Target-local audit record; observed evidence, not a learner alert."""

    audit_id: RecordId
    run_id: RecordId
    correlation_id: RecordId
    occurred_at: UtcDatetime
    actor_id: OpaqueHandle
    event_type: EventType
    outcome: AccessOutcome
    session_handle: OpaqueHandle | None = None
    resource_id: OpaqueHandle | None = None
    action: str | None = Field(default=None, max_length=64)
    detail: dict[str, Any] = Field(default_factory=dict)


class ProbeResult(ContractModel):
    """Measured output of one verification probe."""

    verification: Verification
    passed: bool
    measured_result: dict[str, Any]
    target_audit_id: RecordId
    checked_at: UtcDatetime


class TeardownProof(ContractModel):
    """Proof that a target instance and all its handles were destroyed."""

    run_id: RecordId
    destroyed: bool
    proof: str = Field(min_length=1, max_length=128)
    destroyed_at: UtcDatetime


@runtime_checkable
class TargetAdapter(Protocol):
    """Seven-method trusted interface implemented by ``apps/target-api``."""

    def create_fresh_target(
        self, run_id: str, seed: int, scenario_version: str
    ) -> TargetProvisionResult:
        ...

    def execute_allowlisted_attacker_action(
        self, run_id: str, action: AttackerAction, handles: AttackerHandles
    ) -> AttackerActionResult:
        ...

    def apply_defender_action(
        self, run_id: str, action: DefenderAction, target: str
    ) -> DefenderActionResult:
        ...

    def get_target_events(
        self, run_id: str, cursor: int | None = None
    ) -> list[TargetAuditEntry]:
        ...

    def check_suspicious_session_denied(self, run_id: str) -> ProbeResult:
        ...

    def check_benign_workflow(self, run_id: str) -> ProbeResult:
        ...

    def destroy_target(self, run_id: str) -> TeardownProof:
        ...


TARGET_ADAPTER_METHODS: tuple[str, ...] = (
    "create_fresh_target",
    "execute_allowlisted_attacker_action",
    "apply_defender_action",
    "get_target_events",
    "check_suspicious_session_denied",
    "check_benign_workflow",
    "destroy_target",
)


def assert_target_adapter(candidate: object) -> None:
    """Raise ``TypeError`` when ``candidate`` is missing an adapter method."""

    missing = [
        name for name in TARGET_ADAPTER_METHODS if not callable(getattr(candidate, name, None))
    ]
    if missing:
        raise TypeError(f"TargetAdapter is missing callable(s): {missing}")


__all__ = [
    "AttackerActionResult",
    "AttackerHandles",
    "DefenderActionResult",
    "ProbeResult",
    "TARGET_ADAPTER_METHODS",
    "TargetAdapter",
    "TargetAuditEntry",
    "TargetProvisionResult",
    "TeardownProof",
    "assert_target_adapter",
]
