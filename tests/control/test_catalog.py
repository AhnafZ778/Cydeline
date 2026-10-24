"""The published scenario artifacts are the single definition of a scenario version."""

import copy
import json
import shutil
import tempfile
import typing
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from contracts.runtime import AssignmentRequest, LiveRunCreate
from contracts.scenario import load_scenario
from services.range_runtime import catalog
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.api import create_control
from services.range_runtime.target import create_target, initial_world

from test_live_control import TestAgent


def literal_values(model, field):
    """Allowed values of a plain ``Literal[...]`` request field."""
    annotation = model.model_fields[field].annotation
    assert typing.get_origin(annotation) is typing.Literal, field
    return set(typing.get_args(annotation))


class CatalogArtifactTests(unittest.TestCase):
    def test_catalog_matches_request_contracts_and_target_worlds(self):
        published = {(s["scenario_id"], s["version"]) for s in catalog.SCENARIOS}
        self.assertEqual(
            {sid for sid, _ in published}, literal_values(LiveRunCreate, "scenario_id")
        )
        self.assertEqual(
            {v for _, v in published},
            literal_values(AssignmentRequest, "scenario_version"),
        )
        for s in catalog.SCENARIOS:
            self.assertTrue(
                set(s["routes"]) <= set(initial_world(s["version"])["access"]),
                s["version"],
            )

    def test_v1_live_pacing_agrees_with_the_frozen_scenario_file(self):
        frozen = load_scenario()
        v1 = catalog.lookup("stolen-session", "v1")
        self.assertEqual(v1["max_steps"], frozen["defaults"]["max_attacker_steps"])
        self.assertEqual(
            v1["minimum_signals_before_first_protected_read"],
            frozen["pacing"]["minimum_signals_before_first_protected_read"],
        )
        self.assertEqual(
            v1["first_read_sec"],
            frozen["pacing"]["minimum_virtual_seconds_before_first_protected_read"],
        )

    def test_learner_projection_hides_pacing_routes_and_rubric(self):
        for s in catalog.SCENARIOS:
            public = catalog.manifest(s)
            self.assertFalse(catalog.PRIVATE_KEYS & set(public))
            self.assertNotIn("rubric", public)
            self.assertNotIn("manifest_hash", public)
        client = TestClient(
            create_control(
                Path(tempfile.mkdtemp()) / "c.db", None, TestAgent(), auto=False
            )
        )
        body = json.dumps(client.get("/api/scenarios").json())
        for private in (
            "first_read_sec",
            "pivot_window_sec",
            "key_reporting",
            "rubric",
        ):
            self.assertNotIn(private, body)

    def test_rubric_weights_come_from_the_artifact_and_match_the_scorer(self):
        for s in catalog.SCENARIOS:
            dims = tuple(
                (d["dimension"], d["max_points"]) for d in s["rubric"]["dimensions"]
            )
            self.assertEqual(dims, catalog.SCORER_DIMENSIONS)


class MalformedArtifactTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        shutil.copytree(catalog.SCENARIO_ROOT, self.root, dirs_exist_ok=True)
        self.v2 = self.root / "northstar-breach/v2"

    def tearDown(self):
        self.tmp.cleanup()

    def edit(self, name, change):
        path = self.v2 / name
        data = json.loads(path.read_text())
        change(data)
        path.write_text(json.dumps(data))

    def test_unmodified_copy_loads(self):
        self.assertEqual(len(catalog.load_catalog(self.root)), len(catalog.SCENARIOS))

    def test_rubric_the_scorer_does_not_implement_is_refused(self):
        def reweight(r):
            r["dimensions"]["recognition"] = 30
            r["dimensions"]["timeliness"] = 0

        self.edit("rubric.json", reweight)
        with self.assertRaisesRegex(catalog.CatalogError, "not implemented"):
            catalog.load_catalog(self.root)

    def test_missing_or_mistyped_fields_and_wrong_location_are_refused(self):
        original = (self.v2 / "manifest.json").read_text()
        for change in (
            lambda m: m.pop("first_read_sec"),
            lambda m: m.update(duration_sec="720"),
            lambda m: m.update(duration_sec=True),
            lambda m: m.update(routes=["key_reporting"]),
            lambda m: m.update(routes=[]),
            lambda m: m.update(version="v9"),
            lambda m: m.update(lead_update_sec=0),
        ):
            (self.v2 / "manifest.json").write_text(original)
            self.edit("manifest.json", change)
            with self.assertRaises(catalog.CatalogError):
                catalog.load_catalog(self.root)

    def test_duplicate_or_empty_catalog_is_refused(self):
        empty = Path(tempfile.mkdtemp())
        with self.assertRaises(catalog.CatalogError):
            catalog.load_catalog(empty)


class RunPinsPublishedVersionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        path = Path(self.tmp.name)
        self.tc = TestClient(
            create_target(path / "t.db", "test"), headers={"x-range-secret": "test"}
        )
        self.app = create_control(
            path / "c.db", HttpTargetAdapter(self.tc), TestAgent(), auto=False
        )
        self.client = TestClient(self.app)
        self.engine = self.app.state.engine

    def tearDown(self):
        self.client.close()
        self.tc.close()
        self.tmp.cleanup()

    def test_run_records_manifest_rubric_hashes_and_scores_against_them(self):
        rid = self.client.post(
            "/api/runs",
            json={"scenario_id": "northstar-breach", "scenario_version": "v2"},
        ).json()["run_id"]
        pinned = self.engine.store.get("scenario_versions", rid)
        v2 = catalog.lookup("northstar-breach", "v2")
        self.assertEqual(pinned["manifest_hash"], v2["manifest_hash"])
        self.assertEqual(pinned["rubric_hash"], v2["rubric"]["hash"])
        self.assertEqual(pinned["rubric_version"], "live-1.1")
        self.client.post(f"/api/runs/{rid}/abort")
        score = self.client.get(f"/api/runs/{rid}/debrief").json()
        self.assertEqual(score["rubric_version"], "live-1.1")
        self.assertEqual(
            [(d["dimension"], d["max_points"]) for d in score["breakdown"]],
            list(catalog.SCORER_DIMENSIONS),
        )

    def test_legacy_run_record_is_completed_from_the_same_published_version(self):
        v1 = catalog.lookup("stolen-session", "v1")
        legacy = {
            k: v for k, v in v1.items() if k in {"first_read_sec", "max_steps", "title"}
        }
        record = {
            "scenario_id": "stolen-session",
            "scenario_version": "v1",
            "scenario": legacy,
        }
        merged = catalog.spec(record)
        self.assertEqual(merged["routes"], ["sess_A"])
        self.assertEqual(merged["rubric"]["version"], v1["rubric"]["version"])
        stored = copy.deepcopy(record)
        stored["scenario"]["first_read_sec"] = 99
        self.assertEqual(catalog.spec(stored)["first_read_sec"], 99)


if __name__ == "__main__":
    unittest.main()
