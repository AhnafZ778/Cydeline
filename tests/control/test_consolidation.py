"""Single SOC console authority: real evidence, case races and fail-closed AI turns."""

import unittest
from fastapi.testclient import TestClient
import test_live_control as baseline
from test_live_control import TestAgent


class ConsolidationTests(unittest.TestCase):
    setUp = baseline.LiveControlTests.setUp
    tearDown = baseline.LiveControlTests.tearDown
    url = baseline.LiveControlTests.url
    signal = baseline.LiveControlTests.signal
    declaration = baseline.LiveControlTests.declaration
    defend = baseline.LiveControlTests.defend

    def snap(self):
        return self.c.get("/api/runs/" + self.rid).json()

    def opened_case(self):
        self.signal()
        a = self.snap()["workspace"]["alerts"][0]
        self.assertEqual(
            self.c.post(
                self.url("cases"),
                json={"alert_id": a["id"], "idempotency_key": "case_attempt_1"},
            ).status_code,
            422,
        )
        owned = self.c.post(
            self.url("alerts/" + a["id"]),
            json={"status": "investigating", "revision": 0},
        )
        self.assertEqual(owned.status_code, 200)
        owned = owned.json()["workspace"]["alerts"][0]
        self.assertEqual(owned["owner_id"], self.c.get("/api/session").json()["id"])
        result = self.c.post(
            self.url("cases"),
            json={"alert_id": a["id"], "idempotency_key": "case_attempt_1"},
        )
        self.assertEqual(result.status_code, 200, result.text)
        return a, result.json()["workspace"]["cases"][0]

    def patch(self, **patch):
        case = self.snap()["workspace"]["cases"][0]
        return self.c.patch(
            self.url("cases/case_main"), json={"revision": case["revision"], **patch}
        )

    def test_case_creation_is_idempotent_links_one_incident_and_is_authorized(self):
        a, case = self.opened_case()
        for key in ("case_attempt_1", "case_attempt_2"):
            result = self.c.post(
                self.url("cases"), json={"alert_id": a["id"], "idempotency_key": key}
            )
            self.assertEqual(result.status_code, 200)
            self.assertEqual(
                result.json()["workspace"]["cases"][0]["revision"], case["revision"]
            )
        self.assertEqual(len(self.c.get(self.url("cases")).json()["cases"]), 1)
        self.assertEqual(self.snap()["workspace"]["alerts"][0]["case_id"], "case_main")
        other = TestClient(self.app)
        self.addCleanup(other.close)
        self.assertEqual(
            other.post(
                self.url("cases"),
                json={"alert_id": a["id"], "idempotency_key": "case_attempt_3"},
            ).status_code,
            404,
        )
        self.assertEqual(
            other.patch(
                self.url("cases/case_main"), json={"revision": 0, "note": "forged"}
            ).status_code,
            404,
        )

    def test_case_revision_and_artifact_evidence_validation_preserve_notes(self):
        a, case = self.opened_case()
        payload = {"revision": case["revision"], "note": "Analyst draft"}
        self.assertEqual(
            self.c.patch(self.url("cases/case_main"), json=payload).status_code, 200
        )
        self.assertEqual(
            self.c.patch(self.url("cases/case_main"), json=payload).status_code, 409
        )
        self.assertEqual(
            self.patch(
                artifacts=[
                    {
                        "type": "IP Address",
                        "value": "203.0.113.57",
                        "event_ids": ["evt_forged"],
                    }
                ]
            ).status_code,
            422,
        )
        self.assertEqual(
            self.patch(
                artifacts=[
                    {
                        "type": "IP Address",
                        "value": "203.0.113.57",
                        "event_ids": a["event_ids"],
                    }
                ]
            ).status_code,
            200,
        )
        self.assertEqual(self.snap()["workspace"]["cases"][0]["note"], "Analyst draft")

    def test_playbook_requires_evidence_actual_response_recovery_and_reporting(self):
        a, case = self.opened_case()
        self.assertEqual(
            self.patch(start_playbook=True, complete_step="recovery").status_code, 422
        )
        self.assertEqual(
            self.patch(start_playbook=True, complete_step="evidence").status_code, 422
        )
        ws = self.snap()["workspace"]
        self.c.patch(
            self.url("workspace"),
            json={"revision": ws["revision"], "evidence_ids": a["event_ids"]},
        )
        self.assertEqual(
            self.patch(start_playbook=True, complete_step="evidence").status_code, 200
        )
        self.assertEqual(
            self.patch(
                scope="Reviewed browser access and source change.",
                complete_step="scope",
            ).status_code,
            200,
        )
        self.assertEqual(self.patch(complete_step="declaration").status_code, 422)
        self.declaration()
        self.assertEqual(self.patch(complete_step="declaration").status_code, 200)
        self.assertEqual(self.patch(complete_step="containment").status_code, 422)
        self.defend()
        self.assertEqual(self.patch(complete_step="containment").status_code, 200)
        self.assertEqual(self.patch(complete_step="recovery").status_code, 422)
        self.assertTrue(
            self.c.post(self.url("verify?continue_investigation=true")).json()[
                "all_passed"
            ]
        )
        self.assertEqual(self.snap()["state"], "contained")
        self.assertEqual(self.patch(complete_step="recovery").status_code, 200)
        self.assertEqual(self.patch(complete_step="reporting").status_code, 422)
        self.assertEqual(
            self.patch(
                report="Source change investigated, access revoked and both checks passed.",
                complete_step="reporting",
            ).status_code,
            200,
        )
        self.assertEqual(self.snap()["workspace"]["cases"][0]["status"], "closed")
        self.c.post(self.url("finish"))
        self.assertEqual(
            self.c.get(self.url("debrief")).json()["outcome"], "defended_and_recovered"
        )
        self.assertEqual(self.patch(note="Cannot change replay").status_code, 409)

    def test_alert_closure_requires_comment_and_does_not_contain_or_end(self):
        a, _ = self.opened_case()
        self.assertEqual(
            self.c.post(
                self.url("alerts/" + a["id"]),
                json={"status": "closed", "verdict": "true_positive"},
            ).status_code,
            422,
        )
        res = self.c.post(
            self.url("alerts/" + a["id"]),
            json={
                "status": "closed",
                "verdict": "true_positive",
                "comment": "Investigated source change",
            },
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["state"], "running")
        self.assertFalse(res.json()["applied_actions"])
        self.assertEqual(
            res.json()["workspace"]["alerts"][0]["closure_comment"],
            "Investigated source change",
        )
        self.assertEqual(self.c.get(self.url("debrief")).status_code, 409)

    def test_old_server_notes_and_handoffs_are_preserved_without_browser_import(self):
        ws = self.e.store.get("workspace", self.rid)
        ws["note"] = "Earlier server notebook"
        ws["cases"] = [
            {
                "id": "case_main",
                "title": "Earlier case",
                "owner": "Bob",
                "role": "triage",
                "status": "open",
                "notes": [
                    {
                        "from": "Alice",
                        "hypothesis": "Source changed",
                        "next_step": "Review access",
                        "at": "earlier",
                    }
                ],
            }
        ]
        self.e.store.put("workspace", self.rid, self.rid, ws)
        s = self.snap()
        self.assertTrue(s["workspace"]["cases"][0]["opened"])
        self.assertEqual(s["workspace"]["note"], "Earlier server notebook")
        self.assertEqual(s["workspace"]["cases"][0]["notes"][0]["from"], "Alice")
        self.assertEqual(self.patch(note="Continued investigation").status_code, 200)
        self.assertEqual(
            self.snap()["workspace"]["cases"][0]["notes"][0]["next_step"],
            "Review access",
        )

    def test_unavailable_model_blocks_create_and_start_without_provision_or_clock(self):
        self.c.post(self.url("abort"))

        class Down(TestAgent):
            def health(self):
                return {"reachable": False, "model_present": False}

        self.e.agent = Down()
        before = len(self.e.store.runs())
        self.assertEqual(self.c.post("/api/runs", json={}).status_code, 503)
        self.assertEqual(len(self.e.store.runs()), before)
        self.e.agent = TestAgent()
        created = self.c.post("/api/runs", json={}).json()
        self.e.agent = Down()
        self.assertEqual(
            self.c.post("/api/runs/" + created["run_id"] + "/start").status_code, 503
        )
        self.assertEqual(self.e.store.run(created["run_id"])["state"], "created")

    def test_mid_run_failure_pauses_assessment_and_retry_executes_pending_turn_once(
        self,
    ):
        self.c.post(self.url("abort"))
        self.rid = self.c.post("/api/runs", json={"mode": "assessment"}).json()[
            "run_id"
        ]
        self.c.post(self.url("start"))

        class Fails(TestAgent):
            def decide(self, *args):
                raise TimeoutError("model timeout")

        self.e.agent = Fails()
        self.e.tick(self.rid, 8)
        before = len(self.a.audit_page(self.rid))
        self.e.decide(self.rid)
        failed = self.snap()
        self.assertTrue(failed["ai_unavailable"])
        self.assertEqual(failed["model_status"], "unavailable")
        self.assertNotIn("last_ai_decision", failed)
        self.assertEqual(len(self.a.audit_page(self.rid)), before)
        self.e.tick(self.rid, 1000)
        self.assertEqual(self.snap()["virtual_clock_sec"], failed["virtual_clock_sec"])
        self.assertEqual(self.c.post(self.url("pause")).status_code, 403)
        stranger = TestClient(self.app)
        self.addCleanup(stranger.close)
        self.assertEqual(stranger.post(self.url("ai/retry")).status_code, 404)
        self.e.agent = TestAgent()
        result = self.c.post(self.url("ai/retry"))
        self.assertEqual(result.status_code, 200)
        self.assertFalse(result.json()["ai_unavailable"])
        self.assertEqual(
            result.json()["virtual_clock_sec"], failed["virtual_clock_sec"]
        )
        self.assertEqual(self.e.store.run(self.rid)["ai_step"], 1)
        count = len(self.a.audit_page(self.rid))
        self.assertEqual(self.c.post(self.url("ai/retry")).status_code, 200)
        self.assertEqual(len(self.a.audit_page(self.rid)), count)
        accepted = [
            d for d in self.e.store.rows("agent_decisions", self.rid) if d["accepted"]
        ]
        self.assertEqual(len(accepted), 1)
        self.assertTrue(
            any(
                e.get("decision_id") == accepted[0]["decision_id"]
                and e.get("target_audit_id")
                for e in self.e.store.events(self.rid)
            )
        )

    def test_invalid_output_is_system_pause_but_defender_stale_proposal_is_not(self):
        class Invalid(TestAgent):
            def decide(self, r, w, allowed):
                t = super().decide(r, w, allowed)
                t["proposal"]["action"] = "execute_arbitrary_shell"
                return t

        self.e.agent = Invalid()
        self.signal()
        self.assertTrue(self.snap()["ai_unavailable"])
        self.assertEqual(self.e.store.run(self.rid)["ai_step"], 0)
        self.e.agent = TestAgent()
        self.c.post(self.url("ai/retry"))
        self.declaration()
        owner = self

        class Stale(TestAgent):
            def decide(self, r, w, allowed):
                owner.defend()
                return super().decide(r, w, allowed)

        self.e.agent = Stale()
        r = self.e.store.run(self.rid)
        r["next_ai_sec"] = 0
        self.e.store.save(r)
        step = r["ai_step"]
        self.e.decide(self.rid)
        self.assertFalse(self.snap()["ai_unavailable"])
        self.assertEqual(self.e.store.run(self.rid)["ai_step"], step)

    def test_original_log_aliases_and_live_filters_are_run_scoped(self):
        self.signal()
        for query in (
            "source_address=203.0.113.57",
            "session:sess_A ip:203.0.113.57",
            "type=session",
            "raw_log=203.0.113.57",
        ):
            result = self.c.post(self.url("queries"), json={"query": query})
            self.assertEqual(result.status_code, 200)
            self.assertGreater(result.json()["count"], 0)
        self.assertEqual(
            self.c.post(self.url("queries"), json={"query": "source_port=443"}).json()[
                "count"
            ],
            0,
        )
