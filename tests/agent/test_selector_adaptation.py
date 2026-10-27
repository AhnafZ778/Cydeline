"""Tests for LocalAgent selector adaptation, prompt formulation, and route pivoting."""
from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest
from types import SimpleNamespace

_SRC = Path(__file__).resolve().parents[2] / "services" / "red-agent"
_ROOT = Path(__file__).resolve().parents[2]
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from services.range_runtime.agent import LocalAgent
from services.range_runtime.common import digest


class SelectorAdaptationTests(unittest.TestCase):
    def setUp(self):
        self.agent = LocalAgent()

    def test_selector_prompt_contains_unambiguous_priority_rules(self):
        """Verify selector prompt enforces explicit hierarchical rules."""
        state = {
            "run_id": "run_test_01",
            "ai_step": 0,
            "max_steps": 12,
            "next_role": "scout",
            "observed": {},
            "observed_documents": {},
            "scenario": {
                "routes": ["sess_C", "key_reporting"],
                "rubric": {},
                "objective_resource": "doc_payroll_03",
                "minimum_signals_before_first_protected_read": 2,
                "pivot_window_sec": 60,
            },
        }
        captured = {}

        class CaptureSelector:
            def chat(self, messages, **kwargs):
                captured["system"] = messages[0]["content"]
                captured["user"] = json.loads(messages[1]["content"])
                return SimpleNamespace(
                    text=json.dumps({"selected_access": "context_2"}),
                    model="test-selector",
                    done_reason="stop",
                    eval_count=13,
                    thinking_chars=0,
                )

        class ActionClient:
            def chat(self, messages, **kwargs):
                return SimpleNamespace(
                    text=json.dumps({
                        "role": "scout",
                        "action": "list_accessible_documents",
                        "session_handle": "key_reporting",
                        "target_id": None,
                        "reason": "Discover documents on key_reporting",
                    }),
                    model="test-action",
                    done_reason="stop",
                )

        self.agent.selector = CaptureSelector()
        self.agent.action_client = ActionClient()

        world = {
            "access": {
                "sess_C": {"status": "active", "owner": "maya"},
                "key_reporting": {"status": "active", "owner": "reporting"},
            },
            "users": {
                "maya": {"active": True},
                "reporting": {"active": True},
            },
        }

        # Case 1: Initial state (both unknown)
        res = self.agent.decide(state, world, ["list_accessible_documents", "wait", "stop"])
        self.assertIn("Never select a blocked context", captured["system"])
        self.assertIn("If all contexts are blocked, select null", captured["system"])
        self.assertEqual(captured["user"]["contexts"], {"context_1": "unknown", "context_2": "unknown"})
        self.assertEqual(res["selection"]["selected_access"], "key_reporting")

        # Case 2: sess_C is denied for objective resource doc_payroll_03
        state["observed_documents"] = {"sess_C": ["doc_ops_02"]}
        res2 = self.agent.decide(state, world, ["list_accessible_documents", "wait", "stop"])
        self.assertEqual(captured["user"]["contexts"], {"context_1": "denied", "context_2": "unknown"})
        self.assertEqual(res2["selection"]["selected_access"], "key_reporting")
        self.assertEqual(res2["selection"]["model_selected_context"], "context_2")

    def test_all_blocked_contexts_lead_to_clean_stop_proposal(self):
        """When selector returns null because all contexts are blocked, agent proposes stop."""
        state = {
            "run_id": "run_test_02",
            "ai_step": 3,
            "max_steps": 12,
            "next_role": "adaptation_planner",
            "observed": {"sess_C": "revoked", "key_reporting": "disabled"},
            "observed_documents": {},
            "scenario": {
                "routes": ["sess_C", "key_reporting"],
                "rubric": {},
                "objective_resource": "doc_payroll_03",
                "minimum_signals_before_first_protected_read": 2,
                "pivot_window_sec": 60,
            },
        }

        class NullSelector:
            def chat(self, messages, **kwargs):
                return SimpleNamespace(
                    text=json.dumps({"selected_access": None}),
                    model="test-selector",
                    done_reason="stop",
                    eval_count=10,
                    thinking_chars=0,
                )

        self.agent.selector = NullSelector()
        world = {
            "access": {
                "sess_C": {"status": "revoked", "owner": "maya"},
                "key_reporting": {"status": "disabled", "owner": "reporting"},
            },
            "users": {
                "maya": {"active": True},
                "reporting": {"active": False},
            },
        }

        res = self.agent.decide(state, world, ["wait", "stop"])
        self.assertTrue(res["accepted"])
        self.assertFalse(res["fallback_used"])
        self.assertEqual(res["proposal"]["action"], "stop")
        self.assertIsNone(res["proposal"]["session_handle"])
        self.assertIsNone(res["proposal"]["target_id"])
        self.assertEqual(res["proposal"]["reason"], "No usable access context selected.")


if __name__ == "__main__":
    unittest.main()
