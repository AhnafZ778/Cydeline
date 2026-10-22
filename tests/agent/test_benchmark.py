"""B3 tests: benchmark corpus, scoring thresholds and model-card rendering.

No live model is required. The pure functions are exercised directly, and the
runner is exercised through an injected fake service that returns canonical
outcomes from ``fallback.DecisionOutcome``. Live numbers are produced only by
``services/red-agent/benchmark.py``.
"""

from __future__ import annotations

from pathlib import Path
import sys
import tempfile
import unittest

_SRC = Path(__file__).resolve().parents[2] / "services" / "red-agent"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import benchmark  # noqa: E402
from fallback import DecisionOutcome  # noqa: E402
import schemas  # noqa: E402
from validator import run_policy, validate_action  # noqa: E402


def _proposal_for(action: str, role: str, observation) -> schemas.Proposal:
    requires = schemas.ACTION_REQUIRED_FIELDS[action]
    return schemas.Proposal(
        role=role,
        action=action,
        target_id="doc_finance_07" if "target_id" in requires else None,
        session_handle=(
            observation.session_handles[0] if "session_handle" in requires else None
        ),
        reason="Benchmark fixture decision.",
    )


def _outcome(
    action: str,
    role: str,
    observation,
    *,
    accepted: bool = True,
    fallback_used: bool = False,
    latency_ms: float = 100.0,
) -> DecisionOutcome:
    proposal = _proposal_for(action, role, observation)
    validation = validate_action(proposal, observation)
    return DecisionOutcome(
        proposal=proposal,
        accepted=accepted and validation.accepted,
        fallback_used=fallback_used,
        elapsed_ms=latency_ms,
        validation=validation,
        fallback_reason=None if accepted else "[fallback:timeout] after 10000 ms",
        metadata={"done_reason": "stop", "thinking_chars": 0},
    )


class FakeService:
    """Deterministic stand-in for ``RedAgentService``."""

    def __init__(self, *, adapt: bool = True, all_fallback: bool = False):
        self.adapt = adapt
        self.all_fallback = all_fallback
        self.observations = []

    def choose_action(self, run_id, role, observation):
        self.observations.append(observation)
        if observation.is_contained:
            return _outcome(
                "stop" if self.adapt else "inspect_session_status",
                role,
                observation,
                accepted=not self.all_fallback,
                fallback_used=self.all_fallback,
            )
        policy = run_policy(observation)
        candidates = sorted(policy.allowed_actions - {"stop"})
        action = candidates[0] if candidates else "stop"
        return _outcome(
            action,
            role,
            observation,
            accepted=not self.all_fallback,
            fallback_used=self.all_fallback,
        )


class CorpusTests(unittest.TestCase):
    def test_thirty_trials_cover_every_role_and_status(self):
        observations = benchmark.build_schema_observations()
        self.assertEqual(len(observations), 30)
        self.assertEqual({o.assigned_role for o in observations}, set(schemas.ROLES))
        self.assertEqual(
            {o.current_session_status for o in observations},
            set(schemas.SESSION_STATUSES),
        )

    def test_ten_pairs_are_pre_then_post_containment(self):
        self.assertEqual(len(benchmark.PAIR_SPECS), 10)
        for index, spec in enumerate(benchmark.PAIR_SPECS, start=1):
            pre, post = benchmark.build_pair(spec, run_handle=f"run_pair_{index:02d}")
            self.assertFalse(pre.is_contained)
            self.assertTrue(post.is_contained)
            self.assertEqual(pre.run_handle, post.run_handle)
            self.assertEqual(post.assigned_role, "adaptation_planner")

    def test_every_corpus_observation_has_a_nonempty_legal_policy(self):
        for observation in benchmark.build_schema_observations():
            policy = run_policy(observation)
            self.assertTrue(policy.allowed_actions)
            self.assertIn("stop", policy.allowed_actions)


class ScoringTests(unittest.TestCase):
    def test_percentile_is_nearest_rank(self):
        values = [10, 20, 30, 40, 50]
        self.assertEqual(benchmark.percentile(values, 0.5), 30)
        self.assertEqual(benchmark.percentile(values, 0.95), 50)
        self.assertEqual(benchmark.percentile([], 0.95), 0.0)

    def test_schema_summary_passes_at_the_minimum(self):
        rows = [
            {"accepted": i < 28, "out_of_policy": False, "fallback_used": i >= 28,
             "latency_ms": 1000 + i}
            for i in range(30)
        ]
        summary = benchmark.summarize_schema(rows)
        self.assertEqual(summary["valid"], 28)
        self.assertTrue(summary["pass"])
        self.assertTrue(summary["zero_out_of_policy_pass"])
        self.assertEqual(summary["fallbacks"], 2)

    def test_schema_summary_fails_below_the_minimum(self):
        rows = [
            {"accepted": i < 27, "out_of_policy": False, "fallback_used": False,
             "latency_ms": 500}
            for i in range(30)
        ]
        self.assertFalse(benchmark.summarize_schema(rows)["pass"])

    def test_any_accepted_out_of_policy_row_fails_the_gate(self):
        rows = [
            {"accepted": True, "out_of_policy": i == 3, "fallback_used": False,
             "latency_ms": 500}
            for i in range(30)
        ]
        summary = benchmark.summarize_schema(rows)
        self.assertFalse(summary["zero_out_of_policy_pass"])

    def test_adaptation_summary_threshold(self):
        passing = [{"adapted": i < 8, "post_action": "stop",
                    "pre_fallback_used": False, "post_fallback_used": False}
                   for i in range(10)]
        failing = [{"adapted": i < 7, "post_action": "stop",
                    "pre_fallback_used": False, "post_fallback_used": False}
                   for i in range(10)]
        self.assertTrue(benchmark.summarize_adaptation(passing)["pass"])
        self.assertFalse(benchmark.summarize_adaptation(failing)["pass"])

    def test_out_of_policy_detection_catches_a_widened_action(self):
        observation = benchmark.build_schema_observations()[0]
        # Simulate an upstream regression that marks an illegal proposal
        # accepted; the benchmark's gate must still catch it.
        widened = DecisionOutcome(
            proposal=_proposal_for("request_document", "scout", observation),
            accepted=True,
            fallback_used=False,
            elapsed_ms=10.0,
            validation=validate_action(
                _proposal_for("request_document", "scout", observation), observation
            ),
            metadata={},
        )
        self.assertFalse(widened.validation.accepted)
        self.assertTrue(benchmark._is_out_of_policy(widened, observation))

    def test_out_of_policy_detection_ignores_rejected_proposals(self):
        observation = benchmark.build_schema_observations()[0]
        rejected = _outcome("request_document", "scout", observation, accepted=False)
        self.assertFalse(benchmark._is_out_of_policy(rejected, observation))


class RunnerTests(unittest.TestCase):
    def test_schema_runner_marks_every_valid_trial_accepted(self):
        rows = benchmark.run_schema_benchmark(FakeService())
        self.assertEqual(len(rows), 30)
        self.assertTrue(all(row["accepted"] for row in rows))
        self.assertEqual(sum(row["out_of_policy"] for row in rows), 0)

    def test_adaptation_runner_counts_valid_adaptations(self):
        rows = benchmark.run_adaptation_benchmark(FakeService(adapt=True))
        self.assertEqual(len(rows), 10)
        self.assertTrue(all(row["adapted"] for row in rows))

    def test_adaptation_runner_rejects_repetition(self):
        rows = benchmark.run_adaptation_benchmark(FakeService(adapt=False))
        self.assertFalse(any(row["adapted"] for row in rows))

    def test_report_verdict_requires_all_three_gates(self):
        environment = {
            "generated_at": "2026-01-01T00:00:00+00:00",
            "model": {"name": "qwen3:1.7b"},
            "environment": {"platform": "test"},
        }
        schema_rows = benchmark.run_schema_benchmark(FakeService())
        adaptation_rows = benchmark.run_adaptation_benchmark(FakeService(adapt=True))
        report = benchmark.build_report(environment, schema_rows, adaptation_rows)
        self.assertEqual(report["verdict"], "PASS")

    def test_written_card_contains_measured_numbers(self):
        environment = {
            "generated_at": "2026-01-01T00:00:00+00:00",
            "model": {
                "name": "qwen3:1.7b",
                "digest": "abc",
                "parameter_size": "2.0B",
                "quantization_level": "Q4_K_M",
                "base_url": "http://127.0.0.1:11434",
                "thinking_enabled": False,
                "temperature": 0.0,
                "seed": 42,
                "num_predict": 180,
                "timeout_ms": 10000,
            },
            "environment": {
                "platform": "test-platform",
                "machine": "x86_64",
                "python": "3.14",
                "cpu_count": 8,
            },
        }
        report = benchmark.build_report(
            environment,
            benchmark.run_schema_benchmark(FakeService()),
            benchmark.run_adaptation_benchmark(FakeService(adapt=True)),
        )
        card = benchmark.render_model_card(report)
        self.assertIn("**PASS**", card)
        self.assertIn("30/30", card)
        self.assertIn("10/10", card)
        self.assertIn("Q4_K_M", card)

        with tempfile.TemporaryDirectory() as tmp:
            json_out = Path(tmp) / "BENCHMARK.json"
            md_out = Path(tmp) / "MODEL_CARD.md"
            benchmark.write_outputs(report, json_out=json_out, md_out=md_out)
            self.assertTrue(json_out.is_file())
            self.assertTrue(md_out.is_file())
            self.assertIn("Model Card", md_out.read_text())


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
