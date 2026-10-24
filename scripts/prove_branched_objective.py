"""Exercise the actual local model against both routes and the target's real HTTP API."""

import json
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.common import now
from services.range_runtime.engine import TERMINAL, Engine
from services.range_runtime.target import create_target


def main():
    with tempfile.TemporaryDirectory() as temp:
        target_client = TestClient(
            create_target(Path(temp) / "target.db", "objective-proof"),
            headers={"x-range-secret": "objective-proof"},
        )
        engine = Engine(Path(temp) / "control.db", HttpTargetAdapter(target_client))
        run = engine.create(
            "practice",
            "northstar-breach",
            "v2",
            20261022,
            "independent",
            "objective-proof",
        )
        rid = run["run_id"]
        engine.start(rid)
        engine.begin(rid)
        engine.tick(rid, 8)
        while engine.store.run(rid)["state"] not in TERMINAL:
            state = engine.store.run(rid)
            if state["objective_reached"]:
                engine.verify(rid, True)
                break
            if (
                state["ai_step"] >= state["max_steps"]
                or state["virtual_clock_sec"] >= 360
            ):
                break
            delta = max(1, min(25, state["next_ai_sec"] - state["virtual_clock_sec"]))
            engine.tick(rid, delta)
            engine.decide(rid)
        replay = (
            engine.replay(rid) if engine.store.run(rid)["state"] in TERMINAL else None
        )
        decisions = engine.store.rows("agent_decisions", rid)
        accesses = [
            e
            for e in engine.store.events(rid)
            if e["event_type"] == "document.access"
            and e.get("resource_id") == "doc_finance_07"
            and e.get("outcome") == "allowed"
            and e.get("decision_id")
        ]
        result = {
            "generated_at": now(),
            "model_id": decisions[-1]["model_id"] if decisions else None,
            "scenario_id": "northstar-breach",
            "scenario_version": "v2",
            "seed": 20261022,
            "target_http_real": True,
            "decisions": len(decisions),
            "fallback_count": sum(d["fallback_used"] for d in decisions),
            "protected_reads": [
                {
                    k: e.get(k)
                    for k in [
                        "event_id",
                        "decision_id",
                        "target_audit_id",
                        "session_handle",
                        "outcome",
                        "virtual_clock_sec",
                    ]
                }
                for e in accesses
            ],
            "outcome": replay["debrief"]["outcome"]
            if replay
            else engine.store.run(rid)["state"],
            "passed": bool(accesses),
            "trial_limit": 360,
            "trace_hash": replay["trace_hash"] if replay else None,
        }
        Path("docs/model-card/OBJECTIVE_ROUTE_PROOF.json").write_text(
            json.dumps(result, indent=2) + chr(10)
        )
        print(json.dumps(result, indent=2))
        target_client.close()
        return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
