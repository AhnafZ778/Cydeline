"""Contract-boundary tests: red-agent vocabulary and DTO parity with ``contracts/``.

These tests are skipped when ``contracts/`` (Pydantic) is not importable, which
keeps ``tests/agent/`` runnable on a bare interpreter. When the canonical
package *is* present (CI, Saad's environment, the demo host after
``pip install -r contracts/requirements.txt``) they run and enforce:

* enum and handle-grammar parity,
* lossless Proposal round-trips,
* a complete ``AgentDecisionRecord`` for accepted, policy-rejected and timed-out
  decisions, including honest ``fallback_used`` provenance.
"""

from __future__ import annotations

from pathlib import Path
import sys
import unittest

REPO_ROOT = Path(__file__).resolve().parents[2]
_SRC = REPO_ROOT / "services" / "red-agent"
for entry in (str(_SRC), str(REPO_ROOT)):
    if entry not in sys.path:
        sys.path.insert(0, entry)

from fallback import DecisionOutcome  # noqa: E402
from observation import active_observation, contained_observation  # noqa: E402
import schemas  # noqa: E402
from validator import run_policy, validate_action  # noqa: E402

import contracts_adapter as adapter  # noqa: E402

_ACCEPTED_PROPOSAL = schemas.Proposal(
    role="access_operator",
    action="request_document",
    target_id="doc_finance_07",
    session_handle="sess_A",
    reason="The document is listed for this session.",
)

_REJECTED_MODEL_PROPOSAL = schemas.Proposal(
    role="adaptation_planner",
    action="request_document",
    target_id="doc_finance_07",
    session_handle="sess_A",
    reason="Trying the document anyway.",
)

_FALLBACK_PROPOSAL = schemas.Proposal(
    role="adaptation_planner",
    action="stop",
    target_id=None,
    session_handle=None,
    reason="The permitted session is revoked; stopping.",
)


def _metadata(observation) -> dict:
    return {
        "model_id": "qwen3:1.7b",
        "prompt_hash": "a" * 64,
        "observation_hash": observation.observation_hash,
    }


def _accepted_outcome() -> DecisionOutcome:
    observation = active_observation()
    return DecisionOutcome(
        proposal=_ACCEPTED_PROPOSAL,
        accepted=True,
        fallback_used=False,
        elapsed_ms=1234.6,
        validation=validate_action(_ACCEPTED_PROPOSAL, observation),
        metadata=_metadata(observation),
    )


def _policy_rejection_outcome(rejection_text: str | None = None) -> DecisionOutcome:
    observation = contained_observation()
    validation = schemas.ValidationResult(
        accepted=False,
        proposal=_REJECTED_MODEL_PROPOSAL,
        rejection=schemas.Rejection(
            stage=2,
            code=schemas.STAGE2_ACTION_NOT_PERMITTED_FOR_ROLE,
            message=rejection_text or "not in the role ceiling",
        ),
        policy=run_policy(observation).to_dict(),
    )
    return DecisionOutcome(
        proposal=_FALLBACK_PROPOSAL,
        accepted=False,
        fallback_used=True,
        elapsed_ms=900.2,
        validation=validation,
        fallback_reason="[fallback:policy_rejection]",
        metadata=_metadata(observation),
    )


def _timeout_outcome() -> DecisionOutcome:
    observation = contained_observation()
    validation = schemas.ValidationResult(
        accepted=False,
        proposal=None,
        rejection=schemas.Rejection(
            stage=0, code=schemas.FALLBACK_TIMEOUT, message="after 10000 ms"
        ),
        policy=run_policy(observation).to_dict(),
    )
    return DecisionOutcome(
        proposal=_FALLBACK_PROPOSAL,
        accepted=False,
        fallback_used=True,
        elapsed_ms=10000.4,
        validation=validation,
        fallback_reason="[fallback:timeout] after 10000 ms",
        metadata=_metadata(observation),
    )


@unittest.skipUnless(
    adapter.CONTRACTS_AVAILABLE,
    f"contracts/ not importable here ({adapter.CONTRACTS_IMPORT_ERROR})",
)
class ParityTests(unittest.TestCase):
    def test_vocabulary_parity(self):
        summary = adapter.assert_vocabulary_parity()
        self.assertEqual(summary["roles"], 3)
        self.assertEqual(summary["actions"], 6)
        self.assertEqual(summary["statuses"], 5)
        self.assertEqual(summary["outcomes"], 7)
        self.assertRegex(summary["contract_schema_version"], r"^\d+\.\d+\.\d+$")

    def test_proposal_round_trip_is_lossless(self):
        dto = adapter.to_attacker_proposal(_ACCEPTED_PROPOSAL)
        restored = adapter.from_attacker_proposal(dto)
        self.assertEqual(restored.to_dict(), _ACCEPTED_PROPOSAL.to_dict())

    def test_canonical_dto_rejects_handle_on_wait(self):
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            adapter.to_attacker_proposal(
                schemas.Proposal(
                    role="scout",
                    action="wait",
                    target_id="doc_finance_07",
                    session_handle=None,
                    reason="Should not carry a target.",
                )
            )

    def test_canonical_dto_rejects_noncanonical_handle(self):
        from pydantic import ValidationError

        with self.assertRaises(ValidationError):
            adapter.to_attacker_proposal(
                schemas.Proposal(
                    role="scout",
                    action="inspect_session_status",
                    target_id=None,
                    session_handle="http://evil.test/sess_A",
                    reason="Malformed handle.",
                )
            )


@unittest.skipUnless(
    adapter.CONTRACTS_AVAILABLE,
    f"contracts/ not importable here ({adapter.CONTRACTS_IMPORT_ERROR})",
)
class DecisionRecordTests(unittest.TestCase):
    def test_accepted_outcome_becomes_a_complete_record(self):
        outcome = _accepted_outcome()
        record = adapter.to_agent_decision_record(
            outcome, decision_id="dec_001", run_id="run_0001", step=3
        )
        self.assertEqual(record.role.value, "access_operator")
        self.assertEqual(record.accepted_action.value, "request_document")
        self.assertIsNone(record.rejection_reason)
        self.assertFalse(record.fallback_used)
        self.assertEqual(record.latency_ms, 1235)
        self.assertEqual(record.proposed_json["target_id"], "doc_finance_07")
        self.assertEqual(record.prompt_hash, "a" * 64)
        self.assertEqual(record.observation_hash, outcome.metadata["observation_hash"])

        wire = record.model_dump(mode="json")
        self.assertEqual(wire["role"], "access_operator")
        self.assertEqual(wire["accepted_action"], "request_document")
        self.assertTrue(wire["created_at"].endswith("Z"))

    def test_policy_rejection_keeps_the_model_proposal_and_tags_fallback(self):
        record = adapter.to_agent_decision_record(
            _policy_rejection_outcome(),
            decision_id="dec_002",
            run_id="run_0001",
            step=4,
        )
        self.assertIsNone(record.accepted_action)
        self.assertTrue(record.fallback_used)
        self.assertEqual(record.proposed_json["action"], "request_document")
        self.assertIn("stage2", record.rejection_reason or "")

    def test_timeout_record_has_no_proposal_and_is_honest(self):
        record = adapter.to_agent_decision_record(
            _timeout_outcome(), decision_id="dec_003", run_id="run_0001", step=4
        )
        self.assertIsNone(record.accepted_action)
        self.assertIsNone(record.proposed_json)
        self.assertTrue(record.fallback_used)
        self.assertIn(schemas.FALLBACK_TIMEOUT, record.rejection_reason or "")

    def test_long_rejection_is_truncated_to_the_contract_cap(self):
        record = adapter.to_agent_decision_record(
            _policy_rejection_outcome("x" * 2000),
            decision_id="dec_004",
            run_id="run_0001",
            step=4,
        )
        self.assertEqual(len(record.rejection_reason or ""), 1000)

    def test_missing_provenance_fails_loudly(self):
        outcome = _accepted_outcome()
        outcome.metadata.pop("prompt_hash")
        with self.assertRaises(schemas.RedAgentError):
            adapter.to_agent_decision_record(
                outcome, decision_id="dec_005", run_id="run_0001", step=1
            )


class DegradedModeTests(unittest.TestCase):
    def test_unavailable_contracts_raise_a_domain_error(self):
        original_available = adapter.CONTRACTS_AVAILABLE
        original_error = adapter.CONTRACTS_IMPORT_ERROR
        try:
            adapter.CONTRACTS_AVAILABLE = False
            adapter.CONTRACTS_IMPORT_ERROR = "simulated missing dependency"
            with self.assertRaises(adapter.ContractUnavailable):
                adapter.assert_vocabulary_parity()
            with self.assertRaises(adapter.ContractUnavailable):
                adapter.to_attacker_proposal(_ACCEPTED_PROPOSAL)
        finally:
            adapter.CONTRACTS_AVAILABLE = original_available
            adapter.CONTRACTS_IMPORT_ERROR = original_error

    def test_core_modules_do_not_require_the_contract_package(self):
        for name in (
            "schemas",
            "observation",
            "validator",
            "fallback",
            "prompts",
            "ollama_client",
            "service",
            "benchmark",
        ):
            __import__(name)


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
