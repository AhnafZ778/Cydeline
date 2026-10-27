"""One real local inference -> encrypted observer record -> owned target proof.

This is observer wiring evidence, not a timed/adaptation/learning-quality gate.
No model transcript or credentials are exported into the evidence summary.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.agent import LocalAgent
from services.range_runtime.common import now
from services.range_runtime.engine import Engine, TERMINAL
from services.range_runtime.target import create_target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    agent = LocalAgent()
    config = agent.service.config
    if urlparse(config.normalised_base_url).hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise SystemExit("Observer proof requires a loopback-only local model service")
    sources = ["scripts/prove_observer.py", "services/range_runtime/agent.py", "services/range_runtime/engine.py", "services/range_runtime/observer.py", "services/range_runtime/api.py"]
    summary = {"recorded_at_utc": now(), "purpose": "single real local model observer wiring proof", "model": config.model, "model_digest": agent.service.resolve_model_digest(), "timeout_ms": config.timeout_ms,
               "source_hashes": {p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sources},
               "not_proven": ["adaptive pivots", "timed simulation", "Windows desktop", "learning effectiveness", "representative latency"]}
    with tempfile.TemporaryDirectory(prefix="sentinel-real-observer-") as directory:
        path = Path(directory)
        with TestClient(create_target(path/"target.db", "local-proof"), headers={"x-range-secret": "local-proof"}) as target:
            engine = Engine(path/"control.db", HttpTargetAdapter(target), agent)
            rid = None
            try:
                rid = engine.create()["run_id"]
                engine.start(rid)
                engine.begin(rid)
                engine.tick(rid, 8)
                engine.decide(rid)
                entries = engine.observer.page(rid, limit=200)["events"]
                requests = [e for e in entries if e["kind"] == "model.request"]
                replies = [e for e in entries if e["kind"] == "model.response"]
                validations = [e for e in entries if e["kind"] == "decision.validation"]
                results = [e for e in entries if e["kind"] == "target.confirmed"]
                summary.update(model_requests=len(requests), final_responses=len(replies), accepted=sum(bool(e["payload"].get("accepted")) for e in validations),
                               target_results=[{k: e["payload"].get(k) for k in ("http_status", "outcome", "target_audit_id")} for e in results],
                               linked_decision_ids=sorted({e["decision_id"] for e in entries if e.get("decision_id")}),
                               learner_strategy_absent="last_ai_decision" not in engine.snapshot(rid),
                               event_kinds=[e["kind"] for e in entries],
                               passed=bool(requests and replies and results and any(e["payload"].get("accepted") for e in validations)))
            except Exception as exc:
                summary.update(passed=False, error_type=type(exc).__name__)
            finally:
                if rid and engine.store.run(rid)["state"] not in TERMINAL:
                    engine.finish(engine.store.run(rid), "aborted")
                engine.store.db.close()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2)+"\n")
    print(json.dumps({k: summary.get(k) for k in ("passed", "model", "model_requests", "final_responses", "accepted", "event_kinds", "error_type")}))
    return 0 if summary.get("passed") else 1


if __name__ == "__main__":
    raise SystemExit(main())
