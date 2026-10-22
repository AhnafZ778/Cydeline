"""Bounded timeout + tagged deterministic fallback tests (FR-B06, AT-05, T-10).

Two invariants are load-bearing for the demo:

* a wedged or hallucinating model never hangs the run, and
* every recovery is labelled ``fallback_used`` outside the proposal envelope, so
  a fallback can never be mistaken for live autonomy.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
import time
import unittest

_SRC = Path(__file__).resolve().parents[2] / "services" / "red-agent"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from observation import (  # noqa: E402
    active_observation,
    build_sanitized_observation,
    contained_observation,
)
import schemas  # noqa: E402
from fallback import (  # noqa: E402
    DecisionOutcome,
    decide_with_fallback,
    deterministic_fallback,
    run_bounded,
)
from validator import run_policy, validate_action  # noqa: E402


def _revoked_without_handles():
    return build_sanitized_observation(
        run_handle="run_0001",
        assigned_role="adaptation_planner",
        step=4,
        steps_remaining=2,
        session_handles=[],
        allowed_target_ids=[],
        last_action="test_existing_session",
        last_result="denied",
        current_session_status="revoked",
    )


class DeterministicFallbackTests(unittest.TestCase):
    def test_contained_state_probes_instead_of_touching_documents(self):
        proposal, note = deterministic_fallback(contained_observation(), "timeout")
        self.assertEqual(proposal.action, "inspect_session_status")
        self.assertEqual(proposal.session_handle, "sess_A")
        self.assertIsNone(proposal.target_id)
        self.assertEqual(proposal.role, "adaptation_planner")
        self.assertIn("fallback:timeout", note)

    def test_contained_state_without_handles_waits(self):
        proposal, _ = deterministic_fallback(_revoked_without_handles(), "timeout")
        self.assertEqual(proposal.action, "wait")
        self.assertIsNone(proposal.session_handle)

    def test_exhausted_budget_stops(self):
        proposal, _ = deterministic_fallback(
            active_observation(steps_remaining=0), "timeout"
        )
        self.assertEqual(proposal.action, "stop")
        self.assertIsNone(proposal.session_handle)
        self.assertIsNone(proposal.target_id)

    def test_active_state_holds_with_wait(self):
        proposal, _ = deterministic_fallback(active_observation(), "timeout")
        self.assertEqual(proposal.action, "wait")

    def test_fallback_is_deterministic(self):
        first, _ = deterministic_fallback(contained_observation(), "timeout")
        second, _ = deterministic_fallback(contained_observation(), "timeout")
        self.assertEqual(first.to_dict(), second.to_dict())

    def test_every_fallback_passes_the_validator(self):
        observations = [
            active_observation(),
            active_observation(steps_remaining=0),
            contained_observation(),
            _revoked_without_handles(),
            build_sanitized_observation(
                run_handle="run_0001",
                assigned_role="scout",
                step=1,
                steps_remaining=3,
                session_handles=["sess_A"],
                allowed_target_ids=["doc_finance_07"],
                last_action=None,
                last_result="none",
                current_session_status="unknown",
            ),
        ]
        for observation in observations:
            with self.subTest(role=observation.assigned_role,
                              status=observation.current_session_status,
                              budget=observation.steps_remaining):
                proposal, _ = deterministic_fallback(observation, "timeout")
                result = validate_action(proposal, observation)
                self.assertTrue(result.accepted, result.rejection_reason)

    def test_fallback_accepts_a_policy_view(self):
        observation = contained_observation()
        policy = run_policy(observation)
        proposal, _ = deterministic_fallback(policy, "model_error")
        self.assertTrue(validate_action(proposal, policy).accepted)


class BoundedRunnerTests(unittest.TestCase):
    def test_returns_value_under_budget(self):
        self.assertEqual(run_bounded(lambda: "ok", 500), "ok")

    def test_timeout_is_bounded_in_wall_clock(self):
        started = time.monotonic()
        with self.assertRaises(schemas.TimeoutBudgetExceeded):
            run_bounded(lambda: time.sleep(3), 150)
        elapsed = time.monotonic() - started
        self.assertLess(elapsed, 0.75, f"timeout overshoot: {elapsed:.3f}s")

    def test_domain_errors_are_propagated(self):
        def boom():
            raise schemas.ModelInvocationError("ollama unreachable")

        with self.assertRaises(schemas.ModelInvocationError):
            run_bounded(boom, 500)

    def test_unexpected_errors_are_wrapped(self):
        def boom():
            raise RuntimeError("socket reset")

        with self.assertRaises(schemas.ModelInvocationError):
            run_bounded(boom, 500)

    def test_non_positive_budget_is_rejected(self):
        with self.assertRaises(ValueError):
            run_bounded(lambda: "ok", 0)


class DecideWithFallbackTests(unittest.TestCase):
    def _valid_json(self, action="inspect_session_status", role="adaptation_planner",
                    target_id=None, session_handle="sess_A"):
        return json.dumps(
            {
                "role": role,
                "action": action,
                "target_id": target_id,
                "session_handle": session_handle,
                "reason": "The permitted session is revoked.",
            }
        )

    def test_live_model_decision_is_not_tagged_as_fallback(self):
        outcome = decide_with_fallback(
            lambda: self._valid_json(), contained_observation(), timeout_ms=500
        )
        self.assertIsInstance(outcome, DecisionOutcome)
        self.assertTrue(outcome.accepted)
        self.assertFalse(outcome.fallback_used)
        self.assertIsNone(outcome.fallback_reason)
        self.assertEqual(outcome.proposal.action, "inspect_session_status")

    def test_timeout_falls_back_and_is_bounded(self):
        started = time.monotonic()
        outcome = decide_with_fallback(
            lambda: time.sleep(3), contained_observation(), timeout_ms=150
        )
        elapsed = time.monotonic() - started
        self.assertLess(elapsed, 0.75)
        self.assertTrue(outcome.fallback_used)
        self.assertFalse(outcome.accepted)
        self.assertIn(schemas.FALLBACK_TIMEOUT, outcome.fallback_reason)
        self.assertGreater(outcome.elapsed_ms, 100)

    def test_invalid_json_falls_back_with_json_reason(self):
        outcome = decide_with_fallback(
            lambda: "I would like to request the finance document, please.",
            contained_observation(),
            timeout_ms=500,
        )
        self.assertTrue(outcome.fallback_used)
        self.assertIn(schemas.FALLBACK_INVALID_JSON, outcome.fallback_reason)
        self.assertIn("stage1", outcome.validation.rejection_reason)

    def test_out_of_policy_proposal_falls_back_with_policy_reason(self):
        out_of_policy = self._valid_json(
            action="request_document",
            role="adaptation_planner",
            target_id="doc_finance_07",
        )
        outcome = decide_with_fallback(
            lambda: out_of_policy, contained_observation(), timeout_ms=500
        )
        self.assertTrue(outcome.fallback_used)
        self.assertIn(schemas.FALLBACK_POLICY_REJECTION, outcome.fallback_reason)
        self.assertEqual(outcome.proposal.action, "inspect_session_status")

    def test_model_crash_falls_back_with_model_error(self):
        def boom():
            raise RuntimeError("connection refused")

        outcome = decide_with_fallback(boom, contained_observation(), timeout_ms=500)
        self.assertTrue(outcome.fallback_used)
        self.assertIn(schemas.FALLBACK_MODEL_ERROR, outcome.fallback_reason)

    def test_provenance_never_leaks_into_the_proposal_envelope(self):
        outcome = decide_with_fallback(
            lambda: "garbage", contained_observation(), timeout_ms=500
        )
        envelope = outcome.proposal.to_dict()
        self.assertEqual(sorted(envelope), sorted(schemas.PROPOSAL_FIELDS))
        self.assertNotIn("fallback_used", envelope)
        self.assertNotIn("fallback_reason", envelope)
        self.assertTrue(outcome.fallback_used)

    def test_trace_row_shape_matches_agent_decisions_columns(self):
        outcome = decide_with_fallback(
            lambda: "garbage", contained_observation(), timeout_ms=500
        )
        trace = outcome.to_trace()
        for column in (
            "role",
            "proposed_json",
            "accepted_action",
            "rejection_reason",
            "latency_ms",
            "fallback_used",
            "observation_hash",
            "model_id",
            "prompt_hash",
        ):
            self.assertIn(column, trace)
        self.assertIsNone(trace["accepted_action"])
        self.assertTrue(trace["fallback_used"])
        self.assertEqual(trace["observation_hash"], contained_observation().observation_hash)

    def test_action_payload_is_the_adapter_projection(self):
        outcome = decide_with_fallback(
            lambda: self._valid_json(), contained_observation(), timeout_ms=500
        )
        self.assertEqual(
            outcome.action_payload,
            {
                "action": "inspect_session_status",
                "target_id": None,
                "session_handle": "sess_A",
            },
        )

    def test_fallback_output_is_always_legal_for_every_state(self):
        states = [
            active_observation(),
            active_observation(steps_remaining=0),
            contained_observation(),
            _revoked_without_handles(),
        ]
        for observation in states:
            with self.subTest(status=observation.current_session_status,
                              budget=observation.steps_remaining):
                outcome = decide_with_fallback(
                    lambda: "not json", observation, timeout_ms=500
                )
                self.assertTrue(outcome.fallback_used)
                self.assertTrue(
                    validate_action(outcome.proposal, observation).accepted
                )


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
