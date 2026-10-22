"""Increment S1 contract tests: enums, DTOs, mocks, scenario v1 and rubric v1.

Run from the repository root::

    python -m unittest discover -s tests/control -v
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
import unittest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from pydantic import ValidationError

from contracts import (
    CONTRACT_MODELS,
    AccessOutcome,
    AttackerAction,
    CANONICAL_ENUMS,
    DebriefResponse,
    DeclarationRequest,
    DefenderAction,
    DefenderActionResponse,
    EventEnvelope,
    EventPage,
    Mode,
    OPAQUE_HANDLE_PATTERN,
    Outcome,
    Role,
    RunState,
    SessionStatus,
    TARGET_ADAPTER_METHODS,
    Verification,
    VerificationResponse,
    assert_target_adapter,
)
from contracts.export_schemas import SCHEMA_DIR, render_enums, render_schemas
from contracts.mocks import (
    MOCK_MODELS,
    load_mock,
    mock_filenames,
    validate_mocks,
    validate_sse_frames,
)
from contracts.scenario import (
    canonical_json,
    load_rubric,
    load_scenario,
    scenario_fixture_hash,
    validate_scenario_config,
)

RED_AGENT_SCHEMAS = REPO_ROOT / "services" / "red-agent" / "schemas.py"


def _load_red_agent_schemas():
    if not RED_AGENT_SCHEMAS.is_file():
        return None
    spec = importlib.util.spec_from_file_location("red_agent_schemas_for_contracts", RED_AGENT_SCHEMAS)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class CanonicalEnumTests(unittest.TestCase):
    def test_canonical_enums_match_prd_8_1(self):
        self.assertEqual(
            CANONICAL_ENUMS["RunState"],
            (
                "created",
                "running",
                "contained",
                "verification_pending",
                "completed",
                "timed_out",
                "aborted",
                "technical_failure",
            ),
        )
        self.assertEqual(
            CANONICAL_ENUMS["Outcome"],
            (
                "defended_and_recovered",
                "contained_but_disrupted",
                "attacker_objective_reached",
                "timed_out_unresolved",
                "aborted",
                "technical_failure",
            ),
        )
        self.assertEqual(CANONICAL_ENUMS["Mode"], ("practice", "assessment"))
        self.assertEqual(
            CANONICAL_ENUMS["AttackerAction"],
            (
                "inspect_session_status",
                "list_accessible_documents",
                "request_document",
                "test_existing_session",
                "wait",
                "stop",
            ),
        )
        self.assertEqual(
            CANONICAL_ENUMS["DefenderAction"],
            (
                "revoke_session",
                "temporarily_disable_account",
                "require_reauthentication",
                "restore_account",
            ),
        )
        self.assertEqual(
            CANONICAL_ENUMS["Verification"],
            ("verify_suspicious_session_denied", "verify_benign_workflow"),
        )

    def test_enum_types_are_string_enums(self):
        for enum_type in (RunState, Outcome, Mode, AttackerAction, DefenderAction, Verification):
            for member in enum_type:
                self.assertIsInstance(member.value, str)


class RedAgentParityTests(unittest.TestCase):
    def setUp(self):
        self.red = _load_red_agent_schemas()

    def test_proposal_envelope_has_identical_five_fields(self):
        if self.red is None:
            self.skipTest("services/red-agent/schemas.py is not present")
        self.assertEqual(
            self.red.PROPOSAL_FIELDS,
            ("role", "action", "target_id", "session_handle", "reason"),
        )
        self.assertEqual(
            set(CONTRACT_MODELS["AttackerProposal"].model_fields),
            set(self.red.PROPOSAL_FIELDS),
        )

    def test_action_role_and_status_vocabularies_match(self):
        if self.red is None:
            self.skipTest("services/red-agent/schemas.py is not present")
        self.assertEqual(tuple(action.value for action in AttackerAction), self.red.ATTACKER_ACTIONS)
        self.assertEqual(tuple(role.value for role in Role), self.red.ROLES)
        self.assertEqual(tuple(status.value for status in SessionStatus), self.red.SESSION_STATUSES)
        self.assertEqual(set(outcome.value for outcome in AccessOutcome), set(self.red.LAST_RESULTS))

    def test_opaque_identifier_grammar_matches(self):
        if self.red is None:
            self.skipTest("services/red-agent/schemas.py is not present")
        self.assertEqual(OPAQUE_HANDLE_PATTERN, self.red.IDENTIFIER_PATTERN.pattern)


class ModelValidationTests(unittest.TestCase):
    def test_attacker_proposal_requires_exact_handles(self):
        valid = load_mock("attacker_proposal")
        self.assertEqual(valid["action"], "request_document")

        with self.assertRaises(ValidationError):
            CONTRACT_MODELS["AttackerProposal"].model_validate(
                {**valid, "target_id": None}
            )

        with self.assertRaises(ValidationError):
            CONTRACT_MODELS["AttackerProposal"].model_validate(
                {
                    "role": "scout",
                    "action": "wait",
                    "target_id": "doc_finance_07",
                    "session_handle": "sess_A",
                    "reason": "Waiting.",
                }
            )

    def test_attacker_proposal_rejects_unknown_fields(self):
        proposal = load_mock("attacker_proposal")
        with self.assertRaises(ValidationError):
            CONTRACT_MODELS["AttackerProposal"].model_validate(
                {**proposal, "url": "https://example.test/exfiltrate"}
            )

    def test_event_visibility_cannot_precede_occurrence(self):
        event = load_mock("event_page")["events"][4]
        with self.assertRaises(ValidationError):
            EventEnvelope.model_validate(
                {**event, "visible_at_utc": "2026-10-22T07:00:19Z"}
            )

    def test_event_requires_timezone(self):
        event = load_mock("event_page")["events"][0]
        with self.assertRaises(ValidationError):
            EventEnvelope.model_validate({**event, "timestamp_utc": "2026-10-22T06:59:58"})

    def test_utc_serialization_uses_z_suffix(self):
        event = EventEnvelope.model_validate(load_mock("event_page")["events"][0])
        payload = event.model_dump(mode="json")
        self.assertTrue(payload["timestamp_utc"].endswith("Z"))
        self.assertTrue(payload["visible_at_utc"].endswith("Z"))

    def test_event_page_rejects_non_monotonic_sequence_start(self):
        page = load_mock("event_page")
        with self.assertRaises(ValidationError):
            EventPage.model_validate(
                {**page, "events": [{**page["events"][0], "sequence": 0}]}
            )

    def test_declaration_rejects_duplicate_evidence_ids(self):
        payload = {
            "suspected_actor": "maya",
            "suspected_session": "sess_A",
            "rationale": "Suspicious activity from sess_A.",
            "event_ids": ["evt_0005", "evt_0005"],
        }
        with self.assertRaises(ValidationError):
            DeclarationRequest.model_validate(payload)

    def test_defender_action_requires_measured_timestamp_when_applied(self):
        action = load_mock("defender_action")
        with self.assertRaises(ValidationError):
            DefenderActionResponse.model_validate({**action, "applied_at": None})

    def test_verification_requires_both_probes(self):
        verification = load_mock("verification")
        with self.assertRaises(ValidationError):
            VerificationResponse.model_validate(
                {**verification, "checks": verification["checks"][:1], "all_passed": True}
            )

    def test_verification_all_passed_must_match_checks(self):
        verification = load_mock("verification")
        with self.assertRaises(ValidationError):
            VerificationResponse.model_validate({**verification, "all_passed": False})

    def test_debrief_total_must_equal_breakdown_sum(self):
        debrief = load_mock("debrief")
        with self.assertRaises(ValidationError):
            DebriefResponse.model_validate({**debrief, "score_total": 99})

    def test_debrief_requires_every_rubric_dimension(self):
        debrief = load_mock("debrief")
        with self.assertRaises(ValidationError):
            DebriefResponse.model_validate(
                {**debrief, "breakdown": debrief["breakdown"][:-1], "score_total": 88}
            )


class MockFixtureTests(unittest.TestCase):
    def test_every_mock_matches_its_canonical_model(self):
        validated = validate_mocks()
        self.assertEqual(set(validated), set(MOCK_MODELS))

    def test_sse_frames_are_monotonic_and_match_event_ids(self):
        frames = validate_sse_frames()
        sequences = [int(frame.id) for frame in frames]
        self.assertEqual(sequences, sorted(sequences))
        self.assertEqual(len(sequences), len(set(sequences)))
        for frame in frames:
            self.assertEqual(frame.id, str(frame.data.sequence))

    def test_mocks_never_contain_hidden_ground_truth_keys(self):
        forbidden = {
            "hidden_ground_truth",
            "answer_key",
            "compromised_session",
            "correct_scoped_containment",
            "do_not_serve_to_browser_or_model",
        }

        def walk(value, path):
            if isinstance(value, dict):
                for key, child in value.items():
                    self.assertNotIn(key, forbidden, f"hidden field {key!r} at {path}")
                    walk(child, f"{path}.{key}")
            elif isinstance(value, list):
                for index, child in enumerate(value):
                    walk(child, f"{path}[{index}]")

        for name in MOCK_MODELS:
            walk(load_mock(name), name)

    def test_mock_run_fixture_hash_matches_reviewed_scenario(self):
        run = load_mock("run")
        self.assertEqual(run["fixture_hash"], scenario_fixture_hash())

    def test_mock_files_are_declared(self):
        expected = set(f"{name}.json" for name in MOCK_MODELS) | {"sse_frames.jsonl", "README.md"}
        self.assertEqual(set(mock_filenames()), expected)


class ScenarioAndRubricTests(unittest.TestCase):
    def setUp(self):
        self.scenario = load_scenario()
        self.rubric = load_rubric()

    def test_scenario_passes_all_invariants(self):
        self.assertEqual(validate_scenario_config(self.scenario, self.rubric), [])

    def test_fixture_hash_is_stable(self):
        self.assertEqual(scenario_fixture_hash(self.scenario), scenario_fixture_hash(self.scenario))
        self.assertEqual(len(scenario_fixture_hash(self.scenario)), 64)

    def test_canonical_fixture_identifiers(self):
        users = {user["user_id"]: user for user in self.scenario["users"]}
        self.assertEqual(users["maya"]["email"], "maya@northstar.test")
        self.assertEqual(users["eli"]["email"], "eli@northstar.test")
        sessions = {session["session_handle"] for session in self.scenario["sessions"]}
        self.assertIn("sess_A", sessions)
        documents = {document["document_id"] for document in self.scenario["documents"]}
        self.assertIn("doc_finance_07", documents)

    def test_hidden_truth_is_server_only(self):
        truth = self.scenario["hidden_ground_truth"]
        self.assertEqual(truth["visibility"], "server_only")
        self.assertIs(truth["do_not_serve_to_browser_or_model"], True)

    def test_rubric_dimensions_sum_to_100(self):
        self.assertEqual(self.rubric["total_points"], 100)
        self.assertEqual(
            sum(dimension["max_points"] for dimension in self.rubric["dimensions"]),
            100,
        )
        self.assertEqual(
            {dimension["dimension"]: dimension["max_points"] for dimension in self.rubric["dimensions"]},
            {"recognition": 20, "containment": 25, "verification": 20, "continuity": 15, "proportionality": 10, "timeliness": 10},
        )

    def test_every_terminal_outcome_has_a_gate(self):
        gates = {gate["outcome"] for gate in self.rubric["outcome_gates"]}
        self.assertEqual(gates, set(outcome.value for outcome in Outcome))

    def test_attacker_objective_gate_requires_verified_target_read(self):
        gate = next(
            gate for gate in self.rubric["outcome_gates"] if gate["outcome"] == "attacker_objective_reached"
        )
        read = gate["when"]["verified_target_read"]
        self.assertEqual(read["session_handle"], "sess_A")
        self.assertEqual(read["resource_id"], "doc_finance_07")
        self.assertEqual(read["outcome"], "allowed")
        self.assertIs(read["any_time"], True)

    def test_timeliness_excludes_inference_latency(self):
        self.assertEqual(self.rubric["clock"]["type"], "virtual_scenario")
        self.assertIs(self.rubric["clock"]["exclude_model_inference"], True)


class TargetAdapterTests(unittest.TestCase):
    def test_protocol_declares_exactly_seven_methods(self):
        self.assertEqual(
            TARGET_ADAPTER_METHODS,
            (
                "create_fresh_target",
                "execute_allowlisted_attacker_action",
                "apply_defender_action",
                "get_target_events",
                "check_suspicious_session_denied",
                "check_benign_workflow",
                "destroy_target",
            ),
        )

    def test_complete_adapter_passes_structural_check(self):
        class CompleteAdapter:
            def create_fresh_target(self, run_id, seed, scenario_version):
                pass

            def execute_allowlisted_attacker_action(self, run_id, action, handles):
                pass

            def apply_defender_action(self, run_id, action, target):
                pass

            def get_target_events(self, run_id, cursor=None):
                pass

            def check_suspicious_session_denied(self, run_id):
                pass

            def check_benign_workflow(self, run_id):
                pass

            def destroy_target(self, run_id):
                pass

        assert_target_adapter(CompleteAdapter())

    def test_incomplete_adapter_is_rejected(self):
        class IncompleteAdapter:
            def create_fresh_target(self, run_id, seed, scenario_version):
                pass

        with self.assertRaises(TypeError):
            assert_target_adapter(IncompleteAdapter())


class SchemaExportTests(unittest.TestCase):
    def test_exported_schemas_are_current(self):
        for name, schema in render_schemas().items():
            path = SCHEMA_DIR / f"{name}.schema.json"
            self.assertTrue(path.is_file(), f"missing exported schema {path}")
            self.assertEqual(json.loads(path.read_text(encoding="utf-8")), schema)

    def test_exported_enum_vocabulary_is_current(self):
        path = SCHEMA_DIR / "enums.json"
        self.assertTrue(path.is_file())
        self.assertEqual(json.loads(path.read_text(encoding="utf-8")), render_enums())


if __name__ == "__main__":
    unittest.main()
