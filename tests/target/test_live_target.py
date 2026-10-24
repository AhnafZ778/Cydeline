import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from contracts.adapter import AttackerHandles, assert_target_adapter
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.target import create_target


class TargetTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.client = TestClient(
            create_target(Path(self.tmp.name) / "target.db", "test-secret"),
            headers={"x-range-secret": "test-secret"},
        )
        self.a = HttpTargetAdapter(self.client)
        self.a.create_fresh_target("run_test", 1, "v1")

    def tearDown(self):
        self.client.close()
        self.tmp.cleanup()

    def test_actual_denial_and_fresh_employee_continuity(self):
        assert_target_adapter(self.a)
        self.assertEqual(
            self.a.execute_allowlisted_attacker_action(
                "run_test",
                "request_document",
                AttackerHandles(session_handle="sess_A", target_id="doc_finance_07"),
            ).http_status,
            200,
        )
        self.a.defend("run_test", "revoke_session", "sess_A", "response_1")
        r = self.a.request("run_test", "request_document", "sess_A", "doc_finance_07")
        self.assertEqual(r["http_status"], 401)
        self.assertTrue(r["target_audit_id"])
        self.assertTrue(self.a.check_benign_workflow("run_test").passed)

    def test_broad_disable_breaks_maya_restore_does_not_revive_intruder(self):
        self.a.defend("run_test", "temporarily_disable_account", "maya", "response_2")
        p = self.a.check_benign_workflow("run_test")
        self.assertFalse(p.passed)
        self.assertTrue(
            next(x for x in p.measured_result["workflows"] if x["user_id"] == "eli")[
                "passed"
            ]
        )
        self.a.defend("run_test", "restore_account", "maya", "response_3")
        self.assertTrue(self.a.check_benign_workflow("run_test").passed)
        self.assertEqual(
            self.a.request("run_test", "request_document", "sess_A", "doc_finance_07")[
                "http_status"
            ],
            401,
        )

    def test_idempotency_and_ten_disposable_targets(self):
        first = self.a.defend("run_test", "revoke_session", "sess_A", "same_key")
        self.assertEqual(
            first, self.a.defend("run_test", "revoke_session", "sess_A", "same_key")
        )
        self.assertEqual(
            self.client.post(
                "/targets/run_test/defense",
                json={
                    "action": "restore_account",
                    "target_handle": "maya",
                    "idempotency_key": "same_key",
                },
            ).status_code,
            409,
        )
        for i in range(10):
            rid = f"run_reset_{i}"
            p = self.a.create_fresh_target(rid, 7, "v1")
            self.assertTrue(p.fixture_hash)
            self.a.defend(rid, "revoke_session", "sess_A", "reset_key")
            self.a.destroy_target(rid)
            self.assertEqual(
                self.client.get(f"/targets/{rid}/checkpoint").status_code, 404
            )

    def test_real_secondary_access_remains_after_primary_revoke(self):
        self.a.create_fresh_target("run_branch", 1, "v2")
        self.a.defend("run_branch", "revoke_session", "sess_A", "revoke_primary")
        self.assertFalse(self.a.check_suspicious_session_denied("run_branch").passed)
        self.a.defend(
            "run_branch", "revoke_api_credential", "key_reporting", "revoke_secondary"
        )
        self.assertTrue(self.a.check_suspicious_session_denied("run_branch").passed)
        self.assertTrue(self.a.check_benign_workflow("run_branch").passed)

    def test_target_auth_and_operation_allowlist(self):
        self.assertEqual(TestClient(self.client.app).get("/health").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/targets/run_test/request", json={"action": "shell"}
            ).status_code,
            422,
        )

    def test_all_v1_adapter_actions_and_audits_match_frozen_protocol(self):
        for action in [
            "inspect_session_status",
            "test_existing_session",
            "list_accessible_documents",
            "request_document",
            "wait",
            "stop",
        ]:
            handles = (
                AttackerHandles()
                if action in {"wait", "stop"}
                else AttackerHandles(
                    session_handle="sess_A",
                    target_id="doc_finance_07"
                    if action == "request_document"
                    else None,
                )
            )
            result = self.a.execute_allowlisted_attacker_action(
                "run_test", action, handles
            )
            self.assertTrue(result.target_audit_id)
        self.a.apply_defender_action("run_test", "revoke_session", "sess_A")
        self.assertGreater(len(self.a.get_target_events("run_test")), 6)
