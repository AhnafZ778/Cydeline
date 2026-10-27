import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.api import create_control
from services.range_runtime.common import digest
from services.range_runtime.target import create_target


class TestAgent:
    __test__ = False

    def health(self):
        return {
            "reachable": True,
            "model_present": True,
            "configured_model": "test-agent",
        }

    def decide(self, r, w, allowed):
        handle = (
            "key_reporting"
            if r.get("last_result") == "denied" and "key_reporting" in w["access"]
            else "sess_A"
        )
        action = (
            "inspect_session_status"
            if r["next_role"] != "access_operator"
            else (
                "request_document"
                if "request_document" in allowed
                else "list_accessible_documents"
            )
        )
        p = {
            "role": r["next_role"],
            "action": action,
            "session_handle": handle,
            "target_id": "doc_finance_07" if action == "request_document" else None,
            "reason": "Bounded test decision.",
        }
        return {
            "proposal": p,
            "accepted": True,
            "fallback_used": False,
            "latency_ms": 1,
            "model_id": "test-agent",
            "prompt_hash": digest("test"),
            "observation_hash": digest(allowed),
        }


class LiveControlTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name)
        self.tc = TestClient(
            create_target(self.path / "target.db", "test"),
            headers={"x-range-secret": "test"},
        )
        self.a = HttpTargetAdapter(self.tc)
        self.app = create_control(
            self.path / "control.db",
            self.a,
            TestAgent(),
            auto=False,
            instructor_pin="instructor-test",
        )
        self.c = TestClient(self.app)
        self.e = self.app.state.engine
        self.rid = self.c.post("/api/runs", json={}).json()["run_id"]
        self.c.post(f"/api/runs/{self.rid}/start")
        self.c.post(f"/api/runs/{self.rid}/begin")

    def tearDown(self):
        self.c.close()
        self.tc.close()
        self.tmp.cleanup()

    def url(self, path):
        return f"/api/runs/{self.rid}/" + path

    def signal(self):
        self.e.tick(self.rid, 8)
        self.e.decide(self.rid)

    def declaration(self):
        self.signal()
        e = next(
            e
            for e in self.c.get(self.url("events")).json()["events"]
            if e.get("session_handle") == "sess_A"
            and e.get("network", {}).get("src_ip") == "203.0.113.57"
        )
        result = self.c.post(
            self.url("declare"),
            json={
                "suspected_actor": "maya",
                "suspected_session": "sess_A",
                "rationale": "Source changed",
                "event_ids": [e["event_id"]],
            },
        )
        self.assertEqual(result.status_code, 200)
        return e

    def defend(self, action="revoke_session", target="sess_A", key="command_001"):
        return self.c.post(
            self.url("defender-actions"),
            json={"action": action, "target_handle": target, "idempotency_key": key},
        )

    def test_full_live_loop_and_immutable_replay(self):
        self.declaration()
        self.assertEqual(self.defend().status_code, 200)
        v = self.c.post(self.url("verify"))
        self.assertTrue(v.json()["all_passed"])
        snapshot = (
            self.c.get(self.url("")).json()
            if False
            else self.c.get("/api/runs/" + self.rid).json()
        )
        self.assertEqual(snapshot["outcome"], "defended_and_recovered")
        counts = (
            len(self.e.store.events(self.rid)),
            len(self.a.audit_page(self.rid)),
            len(self.e.store.rows("agent_decisions", self.rid)),
        )
        replay = self.c.get(self.url("replay")).json()
        self.assertEqual(replay["debrief"]["score_total"], 96)
        self.c.get(self.url("replay"))
        self.c.get(self.url("export"))
        self.assertEqual(
            counts,
            (
                len(self.e.store.events(self.rid)),
                len(self.a.audit_page(self.rid)),
                len(self.e.store.rows("agent_decisions", self.rid)),
            ),
        )

    def test_disruption_visible_restore_and_failure_debrief(self):
        self.declaration()
        self.defend("temporarily_disable_account", "maya")
        snap = self.c.get("/api/runs/" + self.rid).json()
        self.assertFalse(
            next(w for w in snap["business"] if w["user_id"] == "maya")["passed"]
        )
        self.assertTrue(
            next(w for w in snap["business"] if w["user_id"] == "eli")["passed"]
        )
        self.c.post(self.url("finish"))
        self.assertEqual(
            self.c.get(self.url("debrief")).json()["outcome"], "contained_but_disrupted"
        )

    def test_rejected_evidence_idempotency_and_live_replay(self):
        self.assertEqual(self.c.get(self.url("replay")).status_code, 409)
        payload = {
            "suspected_actor": "maya",
            "suspected_session": "sess_A",
            "rationale": "Evidence",
            "event_ids": ["evt_forged"],
        }
        self.assertEqual(
            self.c.post(self.url("declare"), json=payload).status_code, 422
        )
        self.declaration()
        a = self.defend().json()
        self.assertEqual(a, self.defend().json())
        self.assertEqual(self.defend("restore_account", "maya").status_code, 409)

    def test_assessment_no_attribution_hints_pause_or_foreign_access(self):
        self.c.post(self.url("abort"))
        rid = self.c.post("/api/runs", json={"mode": "assessment"}).json()["run_id"]
        self.c.post(f"/api/runs/{rid}/start")
        self.e.tick(rid, 8)
        self.e.decide(rid)
        snap = self.c.get(f"/api/runs/{rid}").json()
        self.assertNotIn("last_ai_decision", snap)
        self.assertNotIn("ai_step", snap)
        events = self.c.get(f"/api/runs/{rid}/events").json()["events"]
        self.assertTrue(
            all(
                "decision_id" not in e and "agent_meta" not in e and "_origin" not in e
                for e in events
            )
        )
        self.assertTrue(all(e["event_type"] != "agent.decision" for e in events))
        self.assertEqual(self.c.post(f"/api/runs/{rid}/hints").status_code, 403)
        self.assertEqual(self.c.post(f"/api/runs/{rid}/pause").status_code, 403)
        self.assertEqual(TestClient(self.app).get(f"/api/runs/{rid}").status_code, 404)
        self.assertEqual(self.c.get("/api/instructor").status_code, 403)

    def test_workspace_drafts_query_and_fork_have_new_state(self):
        e = self.declaration()
        snap = self.c.get("/api/runs/" + self.rid).json()
        ws = snap["workspace"]
        patch = {
            "revision": ws["revision"],
            "note": "My evidence",
            "evidence_ids": [e["event_id"]],
            "timeline": [{"event_id": e["event_id"], "note": "Source changed"}],
        }
        self.assertEqual(
            self.c.patch(self.url("workspace"), json=patch).status_code, 200
        )
        self.assertEqual(
            self.c.patch(self.url("workspace"), json=patch).status_code, 409
        )
        self.assertGreater(
            self.c.post(
                self.url("queries"), json={"query": "session:sess_A ip:203.0.113.57"}
            ).json()["count"],
            0,
        )
        self.c.post(self.url("abort"))
        replay = self.c.get(self.url("replay")).json()
        cp = replay["checkpoints"][-1]["id"]
        branch = self.c.post(self.url("branches"), json={"checkpoint_id": cp})
        self.assertEqual(branch.status_code, 200)
        self.assertNotEqual(branch.json()["run_id"], self.rid)
        self.assertEqual(
            self.c.get(self.url("replay")).json()["trace_hash"], replay["trace_hash"]
        )

    def test_explicit_practice_pause_and_sse_cursor(self):
        self.c.post(self.url("pause"))
        r = self.e.store.run(self.rid)
        clock = r["virtual_clock_sec"]
        self.e.tick(self.rid, 20)
        self.assertEqual(self.e.store.run(self.rid)["virtual_clock_sec"], clock)
        self.c.post(self.url("abort"))
        events = self.c.get(self.url("events")).json()["events"]
        last = events[-2]["sequence"]
        response = self.c.get(self.url("stream"), headers={"last-event-id": str(last)})
        self.assertEqual(response.status_code, 200)
        self.assertIn("id: " + str(events[-1]["sequence"]), response.text)
        self.assertNotIn("id: " + str(last) + "\n", response.text)

    def test_server_restart_preserves_cookie_and_workspace(self):
        token = self.c.cookies.get("cydeline_session")
        new = create_control(self.path / "control.db", self.a, TestAgent(), auto=False)
        client = TestClient(new)
        client.cookies.set("cydeline_session", token)
        self.assertEqual(client.get("/api/runs/" + self.rid).status_code, 200)
        client.close()

    def test_instructor_role_enforced_server_side(self):
        self.assertEqual(
            self.c.post(
                "/api/instructor/profiles", json={"name": "Student"}
            ).status_code,
            403,
        )
        self.assertEqual(
            self.c.post("/api/session", json={"code": "instructor-test"}).status_code,
            200,
        )
        profile = self.c.post(
            "/api/instructor/profiles", json={"name": "Student"}
        ).json()
        self.assertTrue(profile["access_code"])
        self.assertEqual(self.c.get("/api/instructor").status_code, 200)

    def test_assignments_lock_conditions_and_handoff_grants_registered_access(self):
        teacher = TestClient(self.app)
        teacher.post("/api/session", json={"code": "instructor-test"})
        alice = teacher.post("/api/instructor/profiles", json={"name": "Alice"}).json()
        bob = teacher.post("/api/instructor/profiles", json={"name": "Bob"}).json()
        cohort = teacher.post(
            "/api/instructor/cohorts",
            json={"name": "SOC cohort", "member_ids": [alice["id"]]},
        ).json()
        assignment = teacher.post(
            "/api/instructor/assignments",
            json={
                "title": "Blind shift",
                "cohort_id": cohort["id"],
                "scenario_id": "stolen-session",
                "scenario_version": "v1",
                "mode": "assessment",
                "assistance": "coached",
            },
        ).json()
        self.assertEqual(assignment["assistance"], "blind")
        learner = TestClient(self.app)
        learner.post("/api/session", json={"code": alice["access_code"]})
        stranger = TestClient(self.app)
        stranger.post("/api/session", json={"code": bob["access_code"]})
        self.assertEqual(stranger.get("/api/assignments").json()["assignments"], [])
        self.assertEqual(
            stranger.post(
                "/api/assignments/" + assignment["id"] + "/start"
            ).status_code,
            404,
        )
        self.c.post(self.url("abort"))
        created = learner.post("/api/assignments/" + assignment["id"] + "/start").json()
        rid = created["run_id"]
        self.assertEqual(created["mode"], "assessment")
        self.assertEqual(created["assistance"], "blind")
        self.assertEqual(stranger.get("/api/runs/" + rid).status_code, 404)
        self.assertEqual(
            teacher.post(
                "/api/instructor/runs/" + rid + "/injects",
                json={
                    "sender": "Shift lead",
                    "message": "Please report your current scope.",
                },
            ).status_code,
            200,
        )
        self.assertEqual(
            learner.get("/api/runs/" + rid).json()["workspace"]["messages"][-1]["kind"],
            "instructor",
        )
        handoff = learner.post(
            "/api/runs/" + rid + "/handoff",
            json={
                "owner": "Bob",
                "recipient_id": bob["id"],
                "role": "response",
                "hypothesis": "Review source change",
                "next_step": "Test the reporting route",
            },
        )
        self.assertEqual(handoff.status_code, 200)
        self.assertEqual(stranger.get("/api/runs/" + rid).status_code, 200)
        stranger.post("/api/runs/" + rid + "/abort")
        self.assertEqual(
            learner.post("/api/assignments/" + assignment["id"] + "/start").status_code,
            409,
        )
        learner.post("/api/session/logout")
        self.assertEqual(learner.get("/api/runs/" + rid).status_code, 404)
        teacher.close()
        learner.close()
        stranger.close()

    def test_partial_route_containment_cannot_pass_v2(self):
        self.c.post(self.url("abort"))
        self.rid = self.c.post(
            "/api/runs",
            json={"scenario_id": "northstar-breach", "scenario_version": "v2"},
        ).json()["run_id"]
        self.c.post(self.url("start"))
        self.c.post(self.url("begin"))
        self.declaration()
        self.defend()
        verify = self.c.post(self.url("verify")).json()
        self.assertFalse(verify["all_passed"])
        r = self.e.store.run(self.rid)
        r["next_ai_sec"] = 0
        self.e.store.save(r)
        self.e.decide(self.rid)
        self.assertTrue(
            any(
                e.get("session_handle") == "key_reporting" and e.get("decision_id")
                for e in self.e.visible(self.e.store.run(self.rid), complete=True)
            )
        )
        self.assertEqual(
            self.defend(
                "revoke_api_credential", "key_reporting", "command_002"
            ).status_code,
            200,
        )
        self.assertTrue(self.c.post(self.url("verify")).json()["all_passed"])
        self.assertEqual(
            self.c.get(self.url("debrief")).json()["outcome"], "defended_and_recovered"
        )

    def test_defender_change_drops_inflight_model_proposal(self):
        self.declaration()
        old = self.e.agent

        class Slow:
            def decide(inner, r, w, allowed):
                self.defend()
                return old.decide(r, w, allowed)

        r = self.e.store.run(self.rid)
        r["next_ai_sec"] = 0
        self.e.store.save(r)
        self.e.agent = Slow()
        self.e.decide(self.rid)
        decision = self.e.store.rows("agent_decisions", self.rid)[-1]
        self.assertFalse(decision["accepted"])
        self.assertIn("State changed", decision["rejection_reason"])
        self.assertFalse(
            any(
                e.get("decision_id") == decision["decision_id"]
                and e.get("target_audit_id")
                for e in self.e.store.events(self.rid)
            )
        )

    def test_live_event_response_schema_matches_actual_released_and_replay_events(self):
        from contracts.runtime import LiveEvent

        self.declaration()
        self.defend()
        self.c.post(self.url("verify"))
        for event in self.c.get(self.url("replay")).json()["events"]:
            LiveEvent.model_validate(event)

    def test_practice_assistant_is_evidence_scoped_and_reviewable(self):
        class Assistant:
            def analyze(inner, events, question, **kwargs):
                return {
                    "id": "analysis_test",
                    "created_at": "2026-10-22T00:00:00Z",
                    "question": question,
                    "analysis": {
                        "claims": [
                            {
                                "kind": "fact",
                                "text": "Observed access handle.",
                                "supports": [{"source_id": events[0]["event_id"], "field": "session_handle", "quote": events[0]["session_handle"]}],
                                "evidence_ids": [events[0]["event_id"]],
                            }
                        ],
                        "next_question": "What other released evidence supports or contradicts your working hypothesis?",
                    },
                    "evidence_ids": [e["event_id"] for e in events],
                    "model_id": "fixture-assistant",
                    "latency_ms": 3,
                    "prompt_hash": digest("assistant"),
                    "context_hash": digest(events),
                    "review_status": "unreviewed",
                    "review_note": "",
                }

        self.app.state.assistant = Assistant()
        ev = self.declaration()
        response = self.c.post(
            self.url("assistant"),
            json={"event_ids": [ev["event_id"]], "question": "What changed?"},
        )
        self.assertEqual(response.status_code, 200)
        turn = response.json()
        self.assertEqual(
            turn["analysis"]["claims"][0]["evidence_ids"], [ev["event_id"]]
        )
        self.assertEqual(turn["review_status"], "unreviewed")
        self.assertEqual(
            self.c.post(
                self.url("assistant"),
                json={"event_ids": ["evt_not_visible"], "question": "What happened?"},
            ).status_code,
            422,
        )
        review = self.c.post(
            self.url("assistant") + "/" + turn["id"] + "/review",
            json={
                "status": "disputed",
                "note": "A shared device is another hypothesis.",
            },
        )
        self.assertEqual(review.json()["review_status"], "disputed")
        self.c.post(self.url("abort"))
        rid = self.c.post("/api/runs", json={"mode": "assessment"}).json()["run_id"]
        self.c.post(f"/api/runs/{rid}/start")
        self.assertEqual(
            self.c.post(
                f"/api/runs/{rid}/assistant",
                json={"event_ids": [ev["event_id"]], "question": "Help"},
            ).status_code,
            403,
        )
