"""Isolated loopback-only observer proof fixture; never a production entrypoint.

Model replies are explicitly fixture-generated. Real LocalAgent instrumentation,
control/target handlers, persistence and HTTP authorization remain in use.
Start with uvicorn --host 127.0.0.1 --app-dir tests/e2e observer_server:app.
"""
import json
import os
import tempfile
from pathlib import Path
from types import SimpleNamespace

from fastapi import Request
from fastapi.testclient import TestClient
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.api import create_control
from services.range_runtime.agent import LocalAgent
from services.range_runtime.target import create_target

directory = tempfile.TemporaryDirectory(prefix="sentinel-observer-proof-")
root = Path(directory.name)
target = TestClient(create_target(root / "target.db", "observer-fixture"), headers={"x-range-secret": "observer-fixture"})
agent = LocalAgent()
if os.environ.get("OBSERVER_REAL_MODEL") != "1":
    agent.health = lambda: {"reachable": True, "model_present": True, "configured_model": "observer-browser-fixture"}
    def reply(messages, format_schema):
        data = json.loads(messages[-1]["content"])
        proposal = {"role": data["role"], "action": "inspect_session_status", "session_handle": data["session_handle"], "target_id": None, "reason": "Inspect lab access."}
        return SimpleNamespace(text=json.dumps(proposal), model="observer-browser-fixture", done_reason="stop")
    agent.action_client.chat = reply

app = create_control(root / "control.db", HttpTargetAdapter(target), agent, auto=False, instructor_pin="observer-browser-test")
app.state.replay_requests = 0

@app.get("/api/proof/should-not-fetch")
def forbidden_replay_request():
    app.state.replay_requests += 1
    return {"unexpected_request": True}

@app.get("/api/proof/replay-requests")
def replay_request_count():
    return {"requests": app.state.replay_requests}

@app.get("/api/proof/identity")
def identity():
    return {"fixture": "sentinel-observer-disposable", "real_model": os.environ.get("OBSERVER_REAL_MODEL") == "1"}

@app.post("/api/proof/turn")
async def advance(request: Request):
    rid = (await request.json())["run_id"]
    engine = app.state.engine
    engine.tick(rid, 8)
    engine.decide(rid)
    return {"state": engine.store.run(rid)["state"]}
