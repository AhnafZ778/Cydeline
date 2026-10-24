"""Paired adaptation trials require an executed model-selected secondary probe."""

import json, tempfile, os, math
from pathlib import Path
from fastapi.testclient import TestClient
from services.range_runtime.target import create_target
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.engine import Engine
from services.range_runtime.common import now


def main():
    trials = []
    with tempfile.TemporaryDirectory() as temp:
        target = TestClient(
            create_target(Path(temp) / "target.db", "benchmark"),
            headers={"x-range-secret": "benchmark"},
        )
        engine = Engine(Path(temp) / "control.db", HttpTargetAdapter(target))
        for i in range(int(os.environ.get("BRANCH_TRIALS", "10"))):
            rid = engine.create(
                sid="northstar-breach", version="v2", seed=20261022 + i
            )["run_id"]
            engine.start(rid)
            engine.begin(rid)
            engine.tick(rid, 8)
            engine.decide(rid)
            visible = engine.visible(engine.store.run(rid))
            ids = [
                e["event_id"] for e in visible if e.get("session_handle") == "sess_A"
            ][:3]
            engine.declare(
                rid,
                {
                    "suspected_actor": "maya",
                    "suspected_session": "sess_A",
                    "rationale": "Paired benchmark source change",
                    "event_ids": ids,
                },
            )
            engine.defend(
                rid,
                {
                    "action": "revoke_session",
                    "target_handle": "sess_A",
                    "idempotency_key": "benchmark_revoke",
                },
            )
            r = engine.store.run(rid)
            r["next_ai_sec"] = 0
            engine.store.save(r)
            engine.decide(rid)
            decisions = engine.store.rows("agent_decisions", rid)
            post = decisions[-1]
            events = [
                e
                for e in engine.store.events(rid)
                if e.get("decision_id") == post["decision_id"]
                and e.get("target_audit_id")
            ]
            adapted = (
                decisions[0]["proposed_json"].get("session_handle") == "sess_A"
                and not decisions[0]["fallback_used"]
                and not post["fallback_used"]
                and post["accepted"]
                and any(e.get("session_handle") == "key_reporting" for e in events)
            )
            trial = {
                "pair": i + 1,
                "pre": decisions[0],
                "post": post,
                "adapted": adapted,
                "target_events": events,
            }
            trials.append(trial)
            engine.finish(engine.store.run(rid), "aborted")
            engine.target.destroy_target(rid)
            print(
                json.dumps(
                    {
                        "pair": i + 1,
                        "adapted": adapted,
                        "pre_rejection": decisions[0]["rejection_reason"],
                        "pre_action": decisions[0]["proposed_json"],
                        "pre_selection": decisions[0].get("selection"),
                        "post_selection": post.get("selection"),
                        "executed_events": len(events),
                        "action": post["proposed_json"],
                        "fallback": post["fallback_used"],
                        "rejection_reason": post["rejection_reason"],
                        "raw": post.get("raw_proposal"),
                    }
                ),
                flush=True,
            )
    result = {
        "generated_at": now(),
        "trials": len(trials),
        "adaptations": sum(t["adapted"] for t in trials),
        "required": math.ceil(len(trials) * 0.8),
        "passed": sum(t["adapted"] for t in trials) >= math.ceil(len(trials) * 0.8),
        "definition": "Executed validated model-selected probe of the remaining reporting credential after actual primary revocation. Fallback and stop do not count when another route remains.",
        "pairs": trials,
    }
    if len(trials) == 10:
        Path("docs/model-card/BRANCHED_BENCHMARK.json").write_text(
            json.dumps(result, indent=2) + chr(10)
        )
        print(json.dumps({k: v for k, v in result.items() if k != "pairs"}), flush=True)
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
