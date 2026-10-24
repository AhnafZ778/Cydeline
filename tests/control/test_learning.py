"""Learning reliability and authority tests; model quality is evaluated separately."""
import copy
import json
from types import SimpleNamespace
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from contracts.runtime import WorksheetFields
from services.range_runtime.assistant import EvidenceAssistant, validate_analysis
from services.range_runtime.agent import LocalAgent
from services.range_runtime.catalog import spec
from services.range_runtime.variants import variants
import test_live_control as baseline


class TopicSelector:
    def __init__(self, topic):
        self.topic = topic

    def chat(self, messages, **kwargs):
        assert self.topic in kwargs["format_schema"]["properties"]["topic"]["enum"]
        return SimpleNamespace(text=json.dumps({"topic": self.topic}), model="fixture-selector")


def test_empty_selector_completion_retains_diagnostics_without_executing_action():
    class EmptySelector:
        def chat(self, *args, **kwargs):
            return SimpleNamespace(text="", done_reason="length", eval_count=80, thinking_chars=123)
    class ForbiddenAction:
        def chat(self, *args, **kwargs):
            raise AssertionError("Incomplete selection must not execute an action call")
    agent = LocalAgent()
    agent.selector = EmptySelector()
    agent.action_client = ForbiddenAction()
    state = {"next_role":"scout", "observed":{}, "observed_documents":{},
             "scenario":{"routes":{"sess_B":{}, "key_reporting":{}}, "rubric":{}}}
    result = agent.decide(state, {}, [])
    assert not result["accepted"]
    assert result["fallback_used"]
    assert result["selection"]["observed_objective_states"] == {"context_1":"unknown", "context_2":"unknown"}
    assert result["selection"]["completion"] == {"done_reason":"length", "eval_count":80, "thinking_chars":123, "content_chars":0, "num_predict":None}
    assert result["rejection_reason"] == "ValueError: Selector returned no final JSON"


def test_coach_keeps_changed_source_after_repeated_baseline_events():
    events = [{"event_id": "evt_source" + str(i), "network": {"src_ip": ip, "user_agent": "Browser"}}
              for i, ip in enumerate(["192.0.2.10", "192.0.2.10", "203.0.113.57"])]
    turn = EvidenceAssistant(TopicSelector("source_change")).analyze(events, "Explain the changed source IP", level="guide")
    supports = turn["analysis"]["claims"][1]["supports"]
    assert {s["quote"] for s in supports} >= {"192.0.2.10", "203.0.113.57"}
    assert any(s["source_id"] == "evt_source2" for s in supports)
    assert turn["analysis"]["query_focus"] == "session"


def test_coach_quotes_requested_handoff_after_other_populated_worksheet_fields():
    fields = {k: k + " saved content" for k in WorksheetFields.model_fields}
    turn = EvidenceAssistant(TopicSelector("report_review")).analyze([], "Review my worksheet verification and handoff excerpt", context={"report_fields": fields})
    assert any(s["source_id"] == "report:verification_handoff" for c in turn["analysis"]["claims"] for s in c["supports"])


def test_denied_probe_does_not_crowd_out_independent_recovery_guidance():
    turn = EvidenceAssistant(TopicSelector("recovery")).analyze([], "Does a denied attacker probe mean legitimate workflows recovered?")
    assert turn["topic"] == "recovery"
    assert "legitimate work separately" in turn["analysis"]["claims"][0]["text"]


def test_explicit_saved_contradiction_review_quotes_requested_worksheet_field():
    fields = {k: k + " saved content" for k in WorksheetFields.model_fields}
    turn = EvidenceAssistant(TopicSelector("report_review")).analyze([], "Review my saved contradicting evidence worksheet excerpt", context={"report_fields": fields})
    assert turn["topic"] == "report_review"
    assert any(s["source_id"] == "report:contradicting_evidence" for c in turn["analysis"]["claims"] for s in c["supports"])


class LearningTests(baseline.LiveControlTests):
    # Reuse the real target/control fixture without duplicating inherited tests.
    __test__ = False


class TestLearning:
    def setup_method(self):
        self.h = LearningTests()
        self.h.setUp()

    def teardown_method(self):
        self.h.tearDown()

    def draft(self, **changes):
        return {"revision": 0, "save_id": "worksheet_save_001",
                "fields": WorksheetFields(observation="Observed one access context.").model_dump(),
                "evidence_ids": [], **changes}

    def test_pacing_begins_coached_practice_but_not_independent_or_assessment(self):
        h = self.h
        h.c.post(h.url("abort"))
        for mode, assistance, paused in [("practice", "coached", True), ("practice", "independent", False), ("assessment", "coached", False)]:
            rid = h.c.post("/api/runs", json={"mode": mode, "assistance": assistance}).json()["run_id"]
            path = "/api/runs/" + rid
            s = h.c.post(path + "/start").json()
            assert s["paused"] == paused and s["awaiting_begin"] == paused
            if paused:
                h.e.tick(rid, 20); h.e.decide(rid)
                assert h.e.store.run(rid)["virtual_clock_sec"] == 0
                assert h.e.store.rows("agent_decisions", rid) == []
                assert h.c.post(path + "/begin").json()["paused"] is False
                count = len(h.e.store.events(rid))
                h.c.post(path + "/begin")
                assert len(h.e.store.events(rid)) == count
            if mode == "assessment":
                assert h.c.post(path + "/pause").status_code == 403
            h.c.post(path + "/abort")

    def test_ten_real_reset_endpoints_clean_fixture_and_retire_old_handles(self):
        h = self.h
        seen = {h.rid}
        first_hash = h.e.store.run(h.rid)["fixture_hash"]
        for _ in range(10):
            old = h.rid
            h.c.post(h.url("abort"))
            response = h.c.post(h.url("reset"))
            assert response.status_code == 200, response.text
            h.rid = response.json()["run_id"]
            assert h.rid not in seen
            seen.add(h.rid)
            assert response.json()["fixture_hash"] == first_hash
            assert h.tc.get("/targets/" + old + "/checkpoint").status_code == 404
            assert h.tc.post("/targets/" + old + "/request", json={"action":"request_document","session_handle":"sess_A","target_id":"doc_finance_07"}).status_code == 404
            assert h.a.request(h.rid, "inspect_session_status", "sess_A")["http_status"] == 200

    def test_worksheet_retry_conflict_evidence_isolation_and_terminal_record(self):
        h = self.h
        payload = self.draft()
        first = h.c.patch(h.url("worksheet"), json=payload)
        assert first.status_code == 200
        assert h.c.patch(h.url("worksheet"), json=payload).json() == first.json()
        assert h.c.patch(h.url("worksheet"), json=self.draft(save_id="worksheet_other_1")).status_code == 409
        assert h.c.patch(h.url("worksheet"), json=self.draft(revision=1, save_id="worksheet_other_2", evidence_ids=["evt_foreign"])).status_code == 422
        with TestClient(h.app) as other:
            assert other.get(h.url("worksheet")).status_code == 404
            assert other.patch(h.url("worksheet"), json=payload).status_code == 404
        h.c.post(h.url("abort"))
        assert h.c.patch(h.url("worksheet"), json=self.draft(revision=1, save_id="worksheet_ended")).status_code == 409
        assert h.c.get(h.url("worksheet")).json() == first.json()
        before = h.c.get(h.url("replay")).json()
        assert h.c.post(h.url("hints")).status_code == 409
        assert h.c.get(h.url("replay")).json() == before

    def test_concurrent_worksheet_writers_preserve_one_acknowledged_revision(self):
        h = self.h
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses = list(pool.map(lambda n: h.c.patch(h.url("worksheet"), json=self.draft(save_id=f"worksheet_race_{n}", fields={"observation": str(n)})), [1, 2]))
        assert sorted(r.status_code for r in responses) == [200, 409]
        winner = next(r.json() for r in responses if r.status_code == 200)
        assert h.c.get(h.url("worksheet")).json() == winner

    def test_long_report_excerpt_survives_full_api_revalidation(self):
        h = self.h
        class Selector:
            def chat(self, messages, **kwargs):
                return SimpleNamespace(text=json.dumps({"topic": "report_review"}), model="fixture-selector")
        h.app.state.assistant = EvidenceAssistant(Selector())
        h.c.patch(h.url("worksheet"), json=self.draft(fields={"observation": "A" * 600}))
        event = next(e for e in h.c.get(h.url("events")).json()["events"] if e["source"] == "target-access")
        result = h.c.post(h.url("assistant"), json={"event_ids":[event["event_id"]],"question":"Explain my recorded observation"})
        assert result.status_code == 200, result.text
        claim = result.json()["analysis"]["claims"][1]
        assert claim["supports"][0]["quote"] == "A" * 500
        assert claim["evidence_ids"] == []

    def test_causal_debrief_pins_evidence_before_response_and_replay_is_stable(self):
        h = self.h
        original = h.declaration()
        assert h.defend().status_code == 200
        later = h.c.get(h.url("events")).json()["events"][-1]
        h.c.post(h.url("declare"), json={"suspected_actor": "maya", "suspected_session": "sess_A", "rationale": "Later evidence", "event_ids": [later["event_id"]]})
        h.c.post(h.url("abort"))
        r = h.c.get(h.url("replay")).json()
        consequence = r["learning"]["consequences"][0]
        assert original["event_id"] in consequence["cited_evidence_ids"]
        assert later["event_id"] not in consequence["cited_evidence_ids"]
        assert set(consequence["cited_evidence_ids"]) <= set(consequence["available_evidence_ids"])
        assert h.c.get(h.url("replay")).json()["trace_hash"] == r["trace_hash"]

    @pytest.mark.parametrize("sid,version", [("stolen-session", "v1"), ("northstar-breach", "v2")])
    def test_all_target_variants_enforce_capability_and_legitimate_dependencies(self, sid, version):
        h = self.h
        h.c.post(h.url("abort"))
        for v in variants(sid, version):
            rid = h.c.post("/api/runs", json={"scenario_id": sid, "scenario_version": version, "variant_id": v["id"]}).json()["run_id"]
            h.e.start(rid)
            assert spec(h.e.store.run(rid))["objective_resource"] == v["objective_resource"]
            for handle, capable in [(v["browser_handle"], v["browser_objective_access"])] + ([("key_reporting", v["reporting_objective_access"])] if version == "v2" else []):
                observed = h.a.request(rid, "request_document", handle, v["objective_resource"])
                assert (observed["http_status"] == 200) == capable
            assert h.a.probe(rid, "benign")["passed"]
            h.a.defend(rid, "temporarily_disable_account", v["browser_owner"], "variant_disable_1")
            assert not h.a.probe(rid, "benign")["passed"]
            h.a.defend(rid, "restore_account", v["browser_owner"], "variant_restore_1")
            assert h.a.probe(rid, "benign")["passed"]
            assert h.a.request(rid, "inspect_session_status", v["browser_handle"])["http_status"] != 200
            h.e.finish(h.e.store.run(rid), "aborted")

    def test_document_discovery_records_target_permissions_and_403_keeps_access_active(self):
        h = self.h
        h.c.post(h.url("abort"))
        h.rid = h.c.post("/api/runs", json={"scenario_id":"northstar-breach", "scenario_version":"v2", "variant_id":"service-dependent", "assistance":"independent"}).json()["run_id"]
        h.e.start(h.rid)
        class Discovery(baseline.TestAgent):
            action = "list_accessible_documents"
            def decide(self, r, w, allowed):
                trace = super().decide(r, w, allowed)
                trace["proposal"].update(action=self.action, session_handle="sess_C", target_id="doc_payroll_03" if self.action == "request_document" else None)
                return trace
        agent = Discovery()
        h.e.agent = agent
        h.e.tick(h.rid, 8); h.e.decide(h.rid)
        state = h.e.store.run(h.rid)
        assert state["observed_documents"]["sess_C"] == h.a.world(h.rid)["access"]["sess_C"]["documents"]
        assert "doc_payroll_03" not in state["observed_documents"]["sess_C"]
        h.e.tick(h.rid, 25); h.e.decide(h.rid)
        agent.action = "request_document"
        h.e.tick(h.rid, 200); h.e.decide(h.rid)
        state = h.e.store.run(h.rid)
        assert state["last_result"] == "denied"
        assert state["observed"]["sess_C"] == "active"
        assert "observed_documents" not in h.c.get("/api/runs/" + h.rid).json()

    def test_model_receives_only_observed_document_lists_and_route_eligible_actions(self):
        h = self.h
        h.c.post(h.url("abort"))
        h.rid = h.c.post("/api/runs", json={"scenario_id":"northstar-breach", "scenario_version":"v2", "assistance":"independent"}).json()["run_id"]
        h.e.start(h.rid)
        state = h.e.store.run(h.rid)
        state["next_role"] = "access_operator"
        state["observed_documents"] = {"sess_A":["doc_ops_02"]}
        calls = []
        class Selector:
            def chat(self, messages, **kwargs):
                calls.append(json.loads(messages[1]["content"]))
                return SimpleNamespace(text=json.dumps({"selected_access":"context_2"}), model="fixture-selector")
        class Action:
            def chat(self, messages, **kwargs):
                calls.append(json.loads(messages[1]["content"]))
                return SimpleNamespace(text=json.dumps({"role":"access_operator", "action":"inspect_session_status", "session_handle":"key_reporting", "target_id":None,"reason":"Discover access"}), model="fixture-action")
        agent = LocalAgent(); agent.selector = Selector(); agent.action_client = Action()
        result = agent.decide(state, h.a.world(h.rid), ["inspect_session_status", "request_document", "wait", "stop"])
        assert result["accepted"], result
        assert calls[0]["contexts"] == {"context_1":"denied","context_2":"unknown"}
        assert result["selection"]["selected_access"] == "key_reporting"
        assert result["selection"]["context_aliases"] == {"context_1":"sess_A","context_2":"key_reporting"}
        assert result["selection"]["observed_objective_states"] == {"context_1":"denied","context_2":"unknown"}
        assert calls[1]["known_documents"] is None
        assert "request_document" not in calls[1]["allowed_actions"]


CASES = json.loads((Path(__file__).parents[2] / "docs/model-card/COACHING_CASES.json").read_text())

@pytest.mark.parametrize("case", CASES, ids=lambda c: c["id"])
def test_coaching_authority_and_exact_source_support(case):
    if case["expect_accept"]:
        result = validate_analysis(copy.deepcopy(case["raw"]), case["sources"], case["level"])
        for claim in result["claims"]:
            if claim["kind"] == "fact":
                assert claim["text"] == " | ".join(s["source_id"] + " · " + s["field"] + ": " + s["quote"] for s in claim["supports"])
    else:
        with pytest.raises((ValueError, TypeError, KeyError)):
            validate_analysis(case["raw"], case["sources"], case["level"])
