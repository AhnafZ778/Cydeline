import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from services.range_runtime import progress
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.api import create_control
from services.range_runtime.target import create_target
from test_live_control import TestAgent


def run(**kw):
    base = {
        "run_id": "run_a",
        "scenario_id": "stolen-session",
        "scenario_version": "v1",
        "mode": "practice",
        "assistance": "coached",
        "state": "completed",
        "outcome": "defended_and_recovered",
        "owner": "learner_1",
        "terminal_reason": None,
        "ended_at": "2026-10-23T00:00:00Z",
    }
    return {**base, **kw}


def score(total=90, fallback=False, awards=None):
    awards = awards or dict(zip(progress.DIMENSIONS, (20, 25, 20, 15, 10, 0)))
    maxima = dict(zip(progress.DIMENSIONS, (20, 25, 20, 15, 10, 10)))
    return {
        "score_total": total,
        "fallback_used": fallback,
        "breakdown": [
            {"dimension": d, "awarded": awards[d], "max_points": maxima[d]}
            for d in progress.DIMENSIONS
        ],
        "model_provenance": {"total_decisions": 5, "median_latency_ms": 700},
    }


class ProgressRuleTests(unittest.TestCase):
    def view(self, r, s=None):
        return progress.attempt_view(r, score() if s is None else s)

    def test_only_finished_unbranched_modelled_attempts_count(self):
        counted = self.view(run())
        self.assertTrue(counted["counts_toward_progress"])
        self.assertTrue(
            self.view(run(state="timed_out", outcome="timed_out_unresolved"))[
                "counts_toward_progress"
            ]
        )
        cases = {
            "branch": run(branch_from={"run_id": "run_b", "checkpoint_id": "cp"}),
            "aborted outcome": run(state="aborted", outcome="aborted"),
            "aborted reason": run(terminal_reason="aborted"),
            "technical": run(state="technical_failure", outcome="technical_failure"),
            "running": run(state="running", outcome=None),
        }
        for name, r in cases.items():
            v = self.view(r)
            self.assertFalse(v["counts_toward_progress"], name)
            self.assertTrue(v["exclusion_reason"], name)
        fallback = self.view(run(), score(fallback=True))
        self.assertFalse(fallback["counts_toward_progress"])
        self.assertIn("local model was unavailable", fallback["exclusion_reason"])
        self.assertIn(
            "No recorded score", progress.attempt_view(run(), None)["exclusion_reason"]
        )

    def test_conditions_are_separate_and_never_pooled(self):
        attempts = [
            self.view(
                run(run_id="a", mode="assessment", assistance="blind"),
                score(40, awards=dict(zip(progress.DIMENSIONS, (10, 10, 10, 5, 5, 0)))),
            ),
            self.view(run(run_id="b", assistance="independent"), score(90)),
            self.view(run(run_id="c", assistance="coached"), score(90)),
            self.view(
                run(run_id="d", assistance="coached"),
                score(90, awards=dict(zip(progress.DIMENSIONS, (10, 10, 10, 5, 5, 0)))),
            ),
        ]
        out = progress.summarize(attempts)
        self.assertEqual(
            set(out["competency"]),
            {"assessment", "practice-independent", "practice-coached"},
        )
        self.assertEqual(
            out["competency"]["assessment"]["dimensions"]["recognition"]["average_pct"],
            50,
        )
        self.assertEqual(
            out["competency"]["practice-independent"]["dimensions"]["recognition"][
                "average_pct"
            ],
            100,
        )
        # two coached attempts average 100% and 50%; assessment never leaks into the coached mean
        self.assertEqual(
            out["competency"]["practice-coached"]["dimensions"]["recognition"][
                "average_pct"
            ],
            75,
        )
        self.assertEqual(out["competency"]["practice-coached"]["attempts"], 2)

    def test_excluded_attempts_never_enter_any_average_or_adversary_rate(self):
        good = self.view(run(run_id="a"), score(80))
        branch = self.view(
            run(run_id="b", branch_from={"run_id": "a", "checkpoint_id": "cp"}),
            score(100),
        )
        failed = self.view(
            run(run_id="c", state="technical_failure", outcome="technical_failure"),
            score(0),
        )
        fallback = self.view(
            run(run_id="d", outcome="attacker_objective_reached"),
            score(10, fallback=True),
        )
        out = progress.summarize([good, branch, failed, fallback])
        self.assertEqual((out["counted"], out["excluded"]), (1, 3))
        self.assertEqual(out["competency"]["practice-coached"]["mean_score"], 80.0)
        self.assertEqual(out["adversary"]["objective_reached"], 0)
        self.assertEqual(out["adversary"]["excluded_for_model_fallback"], 1)
        self.assertEqual(out["by_scenario"][0]["attempts"], 1)

    def test_empty_history_has_no_invented_numbers(self):
        out = progress.summarize([])
        self.assertEqual(out["competency"], {})
        self.assertEqual(out["by_scenario"], [])
        self.assertIsNone(out["adversary"]["median_decision_latency_ms"])


class ProgressApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        path = Path(self.tmp.name)
        self.tc = TestClient(
            create_target(path / "t.db", "test"), headers={"x-range-secret": "test"}
        )
        self.app = create_control(
            path / "c.db",
            HttpTargetAdapter(self.tc),
            TestAgent(),
            auto=False,
            instructor_pin="pin-test",
        )
        self.c = TestClient(self.app)
        self.e = self.app.state.engine

    def tearDown(self):
        self.c.close()
        self.tc.close()
        self.tmp.cleanup()

    def shift(self, body=None, finish="abort"):
        rid = self.c.post("/api/runs", json=body or {}).json()["run_id"]
        self.c.post(f"/api/runs/{rid}/start")
        self.c.post(f"/api/runs/{rid}/{finish}")
        return rid

    def test_progress_lists_every_ended_attempt_but_counts_only_valid_ones(self):
        aborted = self.shift()
        assessed = self.shift({"mode": "assessment"}, "finish")
        practice = self.shift({"assistance": "independent"}, "finish")
        replay = self.c.get(f"/api/runs/{aborted}/replay").json()
        branch = self.c.post(
            f"/api/runs/{aborted}/branches",
            json={"checkpoint_id": replay["checkpoints"][0]["id"]},
        ).json()["run_id"]
        self.c.post(f"/api/runs/{branch}/abort")
        running = self.c.post("/api/runs", json={}).json()["run_id"]
        data = self.c.get("/api/progress").json()
        by_id = {a["run_id"]: a for a in data["attempts"]}
        self.assertNotIn(running, by_id)
        self.assertFalse(by_id[aborted]["counts_toward_progress"])
        self.assertFalse(by_id[branch]["counts_toward_progress"])
        self.assertTrue(by_id[branch]["branch"])
        self.assertTrue(by_id[assessed]["counts_toward_progress"])
        self.assertEqual(by_id[assessed]["condition"], "assessment")
        self.assertEqual(by_id[practice]["condition"], "practice-independent")
        self.assertEqual(data["counted"], 2)
        self.assertEqual(data["excluded"], 2)
        self.assertEqual(
            set(data["competency"]), {"assessment", "practice-independent"}
        )
        self.assertIn("not comparable", data["policy"])

    def test_learners_only_see_their_own_attempts_and_instructors_see_all(self):
        mine = self.shift(finish="finish")
        other = TestClient(self.app)
        self.assertEqual(other.get("/api/progress").json()["attempts"], [])
        other.post("/api/session", json={"code": "pin-test"})
        self.assertEqual(
            [a["run_id"] for a in other.get("/api/progress").json()["attempts"]], [mine]
        )
        other.close()


if __name__ == "__main__":
    unittest.main()
