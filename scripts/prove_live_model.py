"""Actual local model -> validated proposal -> HTTP target -> audit proof."""

import tempfile, json
from pathlib import Path
from fastapi.testclient import TestClient
from services.range_runtime.target import create_target
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.engine import Engine

with tempfile.TemporaryDirectory() as temp:
    target = TestClient(
        create_target(Path(temp) / "target.db", "proof"),
        headers={"x-range-secret": "proof"},
    )
    engine = Engine(Path(temp) / "control.db", HttpTargetAdapter(target))
    rid = engine.create()["run_id"]
    engine.start(rid)
    engine.begin(rid)
    engine.tick(rid, 8)
    engine.decide(rid)
    decisions = engine.store.rows("agent_decisions", rid)
    events = engine.store.events(rid)
    proof = {
        "model_id": decisions[-1]["model_id"],
        "fallback_used": decisions[-1]["fallback_used"],
        "rejection_reason": decisions[-1]["rejection_reason"],
        "latency_ms": decisions[-1]["latency_ms"],
        "proposal": decisions[-1]["proposed_json"],
        "decision_id": decisions[-1]["decision_id"],
        "target_events": [
            {
                "event_id": e["event_id"],
                "target_audit_id": e["target_audit_id"],
                "correlation_id": e["correlation_id"],
                "outcome": e["outcome"],
            }
            for e in events
            if e.get("decision_id") == decisions[-1]["decision_id"]
            and e.get("target_audit_id")
        ],
    }
    print(json.dumps(proof, indent=2))
    assert not proof["fallback_used"] and proof["target_events"], (
        "A real model-selected target request is required"
    )
