import asyncio
import json
import time
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from services.range_runtime.api import create_control
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.target import create_target
from services.range_runtime.agent import LocalAgent
from services.range_runtime.common import digest
from test_live_control import TestAgent


@pytest.fixture
def lab(tmp_path):
    target = TestClient(create_target(tmp_path / "target.db", "test"), headers={"x-range-secret": "test"})
    app = create_control(tmp_path / "control.db", HttpTargetAdapter(target), TestAgent(), auto=False, instructor_pin="observer-teacher")
    trainee, teacher, stranger = (TestClient(app) for _ in range(3))
    teacher.post("/api/session", json={"code": "observer-teacher"})
    rid = trainee.post("/api/runs", json={}).json()["run_id"]
    trainee.post(f"/api/runs/{rid}/start")
    trainee.post(f"/api/runs/{rid}/begin")
    yield SimpleNamespace(app=app, e=app.state.engine, trainee=trainee, teacher=teacher, stranger=stranger, rid=rid, path=tmp_path)
    for c in (trainee, teacher, stranger, target):
        c.close()


def turn(lab):
    lab.e.tick(lab.rid, 8)
    lab.e.decide(lab.rid)


def invite(lab):
    grant = lab.teacher.post(f"/api/instructor/runs/{lab.rid}/observers", json={"name": "Read-only guest"}).json()
    client = TestClient(lab.app)
    assert client.post("/api/session", json={"code": grant["access_code"]}).json()["role"] == "observer"
    return client, grant


def test_live_strategy_redacted_even_in_coached_practice(lab):
    turn(lab)
    snap = lab.trainee.get(f"/api/runs/{lab.rid}").json()
    assert "last_ai_decision" not in snap and "current_ai_role" not in snap
    events = lab.trainee.get(f"/api/runs/{lab.rid}/events").json()["events"]
    assert events
    assert all("decision_id" not in e and "agent_meta" not in e for e in events)
    for c in (lab.trainee, lab.stranger):
        for suffix in ("", "/events", "/capture", "/stream"):
            assert c.get(f"/api/observer/runs/{lab.rid}" + suffix).status_code == 403
    assert lab.trainee.get(f"/api/runs/{lab.rid}/export").status_code != 200


def test_assigned_observer_is_read_only_and_revocable(lab):
    turn(lab)
    viewer, grant = invite(lab)
    assert viewer.get(f"/api/observer/runs/{lab.rid}/events").status_code == 200
    assert viewer.get("/api/observer/runs").json()["runs"][0]["run_id"] == lab.rid
    assert viewer.get("/api/instructor").status_code == 403
    for path in ("abort", "pause", "begin", "defender-actions", "capture-consent"):
        assert viewer.post(f"/api/runs/{lab.rid}/{path}", json={}).status_code == 403
    assert lab.teacher.delete(f"/api/instructor/runs/{lab.rid}/observers/{grant['id']}").status_code == 200
    assert viewer.get(f"/api/observer/runs/{lab.rid}/events").status_code == 403
    assert viewer.get("/api/observer/runs").json()["runs"] == []


def test_observer_stream_rechecks_active_grant(lab):
    viewer, grant = invite(lab)
    actor = viewer.get("/api/session").json()
    endpoint = next(r.endpoint for r in lab.app.routes if getattr(r, "path", None) == "/api/observer/runs/{rid}/stream")
    request = SimpleNamespace(state=SimpleNamespace(actor=actor), cookies=viewer.cookies, headers={})
    async def disconnected():
        return False
    request.is_disconnected = disconnected
    async def check():
        response = await endpoint(request, lab.rid)
        iterator = response.body_iterator
        assert "event: status" in await iterator.__anext__()
        lab.teacher.delete(f"/api/instructor/runs/{lab.rid}/observers/{grant['id']}")
        assert "event: revoked" in await iterator.__anext__()
        await iterator.aclose()
    asyncio.run(check())


def test_terminal_review_is_own_run_only_and_read_only(lab):
    turn(lab)
    lab.trainee.post(f"/api/runs/{lab.rid}/abort")
    before = lab.e.target.world(lab.rid)
    page = lab.trainee.get(f"/api/observer/runs/{lab.rid}/events").json()
    assert any(e["kind"] == "target.confirmed" for e in page["events"])
    assert lab.stranger.get(f"/api/observer/runs/{lab.rid}/events").status_code == 403
    assert before == lab.e.target.world(lab.rid)


def test_transcripts_are_encrypted_retained_and_cursor_paged(lab):
    r = lab.e.store.run(lab.rid)
    for n in range(3):
        lab.e.observer.emit(r, "model.request", {"marker": "private-observer-marker", "password": "not-persisted", "n": n})
    raw = (lab.path / "control.db").read_bytes() + (lab.path / "control.db-wal").read_bytes()
    assert b"private-observer-marker" not in raw and b"not-persisted" not in raw
    first = lab.teacher.get(f"/api/observer/runs/{lab.rid}/events?limit=2").json()
    assert len(first["events"]) == 2 and first["has_more"]
    second = lab.teacher.get(f"/api/observer/runs/{lab.rid}/events?cursor={first['next_cursor']}").json()
    assert len(second["events"]) == 1 and not second["has_more"]
    assert first["events"][0]["payload"]["password"] == "[redacted]"
    with lab.e.store.lock, lab.e.store.db:
        lab.e.store.db.execute("UPDATE observer_records SET created=?", (time.time()-8*86400,))
    expired = lab.teacher.get(f"/api/observer/runs/{lab.rid}/events").json()["events"]
    assert all(e["expired"] and not e["payload"] for e in expired)


def test_capture_requires_current_owner_consent_and_order(lab):
    root = f"/api/runs/{lab.rid}"
    consent = lab.trainee.post(root + "/capture-consent", json={"accepted": True}).json()
    chunk = {"capture_id": consent["capture_id"], "index": 0, "events": [{"type": 4, "timestamp": 1, "data": {"width": 800}}]}
    assert lab.stranger.post(root + "/capture", json=chunk).status_code == 404
    assert lab.trainee.post(root + "/capture", json={**chunk, "index": 1}).status_code == 409
    assert lab.trainee.post(root + "/capture", json=chunk).status_code == 200
    assert lab.trainee.post(root + "/capture", json=chunk).json()["duplicate"]
    recorded = lab.teacher.get(f"/api/observer/runs/{lab.rid}/capture").json()
    assert len(recorded["events"]) == 1
    assert lab.trainee.get(f"/api/observer/runs/{lab.rid}/capture").status_code == 403
    lab.trainee.post(root + "/capture-consent", json={"accepted": False})
    assert lab.trainee.post(root + "/capture", json={**chunk, "index": 1}).status_code == 403


def test_real_agent_instrumentation_records_actual_final_output(lab):
    agent = LocalAgent()
    agent.health = TestAgent().health
    def chat(messages, format_schema):
        data = json.loads(messages[-1]["content"])
        proposal = {"role": data["role"], "action": "inspect_session_status", "session_handle": data["session_handle"], "target_id": None, "reason": "Inspect observed access."}
        return SimpleNamespace(text=json.dumps(proposal), model="instrumented-test", done_reason="stop")
    agent.action_client.chat = chat
    lab.e.agent = agent
    turn(lab)
    rows = lab.teacher.get(f"/api/observer/runs/{lab.rid}/events").json()["events"]
    request = next(e for e in rows if e["kind"] == "model.request")
    response = next(e for e in rows if e["kind"] == "model.response")
    assert request["payload"]["messages"][0]["role"] == "system"
    assert "Inspect observed access." in response["payload"]["final_output"]
    assert request["decision_id"] == response["decision_id"]
    assert any(e["kind"] == "target.confirmed" for e in rows)


def test_schema_failures_remain_observable_without_execution(lab):
    class BadAgent(TestAgent):
        def decide(self, *args):
            result = super().decide(*args)
            result["proposal"]["action"] = "run_unrestricted_shell"
            return result
    lab.e.agent = BadAgent()
    turn(lab)
    rows = lab.teacher.get(f"/api/observer/runs/{lab.rid}/events").json()["events"]
    validation = next(e for e in rows if e["kind"] == "decision.validation")
    assert not validation["payload"]["accepted"]
    assert not any(e["kind"] == "target.dispatched" for e in rows)


def test_capture_quota_and_oversized_chunk_do_not_affect_grading(lab):
    r = lab.e.store.run(lab.rid)
    original = r["state"]
    with patch("services.range_runtime.observer.VISUAL_LIMIT", 10):
        with pytest.raises(Exception):
            lab.e.observer.emit(r, "capture.chunk", {"events": []})
    assert lab.e.store.run(lab.rid)["state"] == original


def test_plain_legacy_metadata_does_not_duplicate_model_intent(lab):
    turn(lab)
    decision = lab.e.store.rows("agent_decisions", lab.rid)[0]
    assert "Bounded test decision." not in json.dumps(decision)
    assert "Bounded test decision." not in json.dumps(lab.e.store.run(lab.rid))
    observed = lab.teacher.get(f"/api/observer/runs/{lab.rid}/events").json()
    assert "Bounded test decision." in json.dumps(observed)
    lab.trainee.post(f"/api/runs/{lab.rid}/abort")
    assert "Bounded test decision." not in json.dumps(lab.trainee.get(f"/api/runs/{lab.rid}/replay").json())


def test_cached_expired_session_cannot_read_history(lab):
    cookie = lab.teacher.cookies.get("cydeline_session")
    row = lab.e.store.get("sessions", digest(cookie))
    row["expires"] = time.time()-1
    lab.e.store.put("sessions", digest(cookie), "global", row)
    assert lab.teacher.get(f"/api/observer/runs/{lab.rid}/events").status_code == 403


def test_gap_survives_stop_and_restart(lab):
    path = f"/api/runs/{lab.rid}/capture-consent"
    assert lab.trainee.post(path, json={"accepted": True}).status_code == 200
    assert lab.trainee.post(path, json={"accepted": False, "gap": True}).json()["gap"]
    assert lab.trainee.post(path, json={"accepted": False}).json()["gap"]
    assert lab.trainee.post(path, json={"accepted": True}).json()["gap"]


def test_capture_request_byte_limit_precedes_json_parsing(lab):
    path = f"/api/runs/{lab.rid}/capture"
    body = b'{"padding":"' + b"x" * (513 * 1024) + b'"}'
    assert lab.trainee.post(path, content=body, headers={"Content-Type": "application/json"}).status_code == 413


def test_disk_admission_refuses_before_target_provision(lab):
    lab.trainee.post(f"/api/runs/{lab.rid}/abort")
    with patch("services.range_runtime.observer.shutil.disk_usage", return_value=SimpleNamespace(free=0)):
        assert lab.trainee.post("/api/runs", json={}).status_code == 507


def test_purge_expires_details_without_history_read(lab):
    lab.e.observer.emit(lab.e.store.run(lab.rid), "model.response", {"final_output": "private"})
    with lab.e.store.lock, lab.e.store.db:
        lab.e.store.db.execute("UPDATE observer_records SET created=?", (time.time()-8*86400,))
    lab.e.observer.purge()
    assert lab.e.store.db.execute("SELECT sealed FROM observer_records").fetchone()[0] is None


def test_maintenance_fault_fences_active_round_without_killing_loop(lab):
    with patch.object(lab.e.observer, "purge", side_effect=OSError("disk fault")):
        assert lab.app.state.observer_maintenance() is False
    assert lab.e.observer_failed
    assert lab.e.store.run(lab.rid)["state"] == "technical_failure"
    before = len(lab.e.store.rows("agent_decisions", lab.rid))
    lab.e.decide(lab.rid)
    assert len(lab.e.store.rows("agent_decisions", lab.rid)) == before
    assert lab.app.state.observer_maintenance() is True
    assert lab.e.observer_failed  # Repair/restart is explicit, never an automatic win.


def test_storage_fault_during_inference_fences_pending_proposal(lab):
    class FaultDuringInference(TestAgent):
        def decide(self, *args):
            with patch.object(lab.e.observer, "purge", side_effect=OSError("disk fault")), patch.object(lab.e, "finish", side_effect=OSError("cannot persist")):
                assert lab.app.state.observer_maintenance() is False
            return super().decide(*args)
    lab.e.agent = FaultDuringInference()
    turn(lab)
    assert lab.e.observer_failed
    rows = lab.e.observer.page(lab.rid)["events"]
    assert not any(row["kind"] == "target.dispatched" for row in rows)


def test_evidence_write_failure_fences_before_model_or_target(lab):
    with patch.object(lab.e.observer, "emit", side_effect=OSError("disk full")), patch.object(lab.e.agent, "decide") as model:
        turn(lab)
        model.assert_not_called()
    assert lab.e.observer_failed
    assert lab.e.store.run(lab.rid)["state"] == "technical_failure"


def test_stale_capture_cleanup_cannot_stop_new_segment(lab):
    path = f"/api/runs/{lab.rid}/capture-consent"
    old = lab.trainee.post(path, json={"accepted": True}).json()
    new = lab.trainee.post(path, json={"accepted": True}).json()
    result = lab.trainee.post(path, json={"accepted": False, "capture_id": old["capture_id"]}).json()
    assert result["accepted"] and result["capture_id"] == new["capture_id"]


def test_visual_storage_error_persists_gap_without_client_followup(lab):
    root = f"/api/runs/{lab.rid}"
    consent = lab.trainee.post(root + "/capture-consent", json={"accepted": True}).json()
    chunk = {"capture_id": consent["capture_id"], "index": 0, "events": [{"type": 4, "timestamp": 1, "data": {}}]}
    with patch.object(lab.e.observer, "emit", side_effect=OSError("visual disk fault")):
        response = lab.trainee.post(root + "/capture", json=chunk)
    assert response.status_code == 507
    state = lab.e.store.get("observer_capture", lab.rid)
    assert state["gap"] and not state["accepted"]
    assert lab.e.store.run(lab.rid)["state"] == "running"
    assert not lab.e.observer_failed


def test_visual_fault_fences_dispatch_if_gap_cannot_be_persisted(lab):
    root = f"/api/runs/{lab.rid}"
    consent = lab.trainee.post(root + "/capture-consent", json={"accepted": True}).json()
    chunk = {"capture_id": consent["capture_id"], "index": 0, "events": [{"type": 4, "timestamp": 1, "data": {}}]}
    original_put = lab.e.store.put
    def cannot_save_gap(table, *args, **kwargs):
        if table == "observer_capture":
            raise OSError("authority fault")
        return original_put(table, *args, **kwargs)
    with patch.object(lab.e.observer, "emit", side_effect=OSError("visual disk fault")), patch.object(lab.e.store, "put", side_effect=cannot_save_gap):
        assert lab.trainee.post(root + "/capture", json=chunk).status_code == 507
    assert lab.e.observer_failed
    assert lab.e.store.run(lab.rid)["state"] == "technical_failure"
    lab.e.decide(lab.rid)
    assert not lab.e.store.rows("agent_decisions", lab.rid)


def test_committed_chunk_index_fault_cannot_duplicate_on_retry(lab):
    root = f"/api/runs/{lab.rid}"
    consent = lab.trainee.post(root + "/capture-consent", json={"accepted": True}).json()
    chunk = {"capture_id": consent["capture_id"], "index": 0, "events": [{"type": 4, "timestamp": 1, "data": {}}]}
    original_put = lab.e.store.put
    failed = False
    def fail_once(table, *args, **kwargs):
        nonlocal failed
        if table == "observer_capture" and not failed:
            failed = True
            raise OSError("index write fault")
        return original_put(table, *args, **kwargs)
    with patch.object(lab.e.store, "put", side_effect=fail_once):
        assert lab.trainee.post(root + "/capture", json=chunk).status_code == 507
    state = lab.e.store.get("observer_capture", lab.rid)
    assert state["gap"] and not state["accepted"] and state["next_index"] == 1
    assert lab.trainee.post(root + "/capture", json=chunk).status_code == 403
    assert len(lab.teacher.get(f"/api/observer/runs/{lab.rid}/capture").json()["events"]) == 1


def test_rejected_model_text_is_only_in_encrypted_history(lab):
    marker = "private-invalid-output"
    agent = LocalAgent()
    agent.health = TestAgent().health
    agent.action_client.chat = lambda *args, **kwargs: SimpleNamespace(
        text=json.dumps({"role": marker, "action": "inspect_session_status", "session_handle": "sess_A", "target_id": None, "reason": "Invalid lab proposal."}),
        model="invalid-output-test", done_reason="stop",
    )
    lab.e.agent = agent
    turn(lab)
    assert marker not in json.dumps(lab.e.store.rows("agent_decisions", lab.rid))
    assert marker not in json.dumps(lab.e.store.run(lab.rid))
    raw = (lab.path / "control.db").read_bytes() + (lab.path / "control.db-wal").read_bytes()
    assert marker.encode() not in raw
    history = lab.teacher.get(f"/api/observer/runs/{lab.rid}/events").json()
    assert marker in json.dumps(history)
    assert not any(e["kind"] == "target.dispatched" for e in history["events"])
