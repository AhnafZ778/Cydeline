"""Real-model objective journeys; virtual time advances but target actions are never scripted."""
import argparse
import hashlib
import json
import os
import platform
import sys
import tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.engine import Engine, TERMINAL
from services.range_runtime.agent import LocalAgent
from services.range_runtime.catalog import spec
from services.range_runtime.common import now, digest
from scripts.learning_evidence import atomic_json, validate_records
from services.range_runtime.target import create_target
from services.range_runtime.variants import variants


def main():
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument("--scenario", choices=["stolen-session", "northstar-breach"])
    parser.add_argument("--variant", choices=["baseline", "shared-work", "service-dependent"])
    parser.add_argument("--resume", type=Path, help="Continue saved trials with identical runtime source/model/config; retain failures")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    out = args.resume.resolve() if args.resume else root / "docs/model-card/learning" / (now().replace(":", "-") + "-objectives")
    if args.resume:
        if not out.is_relative_to(root / "docs/model-card/learning"):
            raise ValueError("Resume must use this project's saved learning evidence")
    else:
        out.mkdir()
    agent = LocalAgent()
    report = {"started_at": now(), "model": agent.health(), "config": agent.action_client.config.describe(),
              "selector_config": agent.selector.config.describe(), "trials": [],
              "filters": {"scenario": args.scenario, "variant": args.variant},
              "source_sha256": {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted([*root.glob("services/range_runtime/*.py"), *root.glob("services/red-agent/*.py"), root/"contracts/runtime.py", Path(__file__), root/"scripts/learning_evidence.py"])},
              "scenario_sha256": {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((root/"scenarios").rglob("*.json"))},
              "hardware": {"platform": platform.platform(), "cpu": next((l.split(':', 1)[1].strip() for l in Path('/proc/cpuinfo').read_text().splitlines() if l.startswith('model name')), platform.processor()), "logical_cpus": os.cpu_count(), "memory": next((l.strip() for l in Path('/proc/meminfo').read_text().splitlines() if l.startswith('MemTotal:')), 'unknown')},
              "scope": "Uncontained model-selected objective reads via actual target HTTP ASGI transport. Virtual time advances to authorized turns. Container/browser proof and early-containment intervention traces are separate."}
    if args.resume:
        saved = json.loads((out / "summary.json").read_text())
        for key in ["source_sha256", "scenario_sha256", "model", "config", "selector_config", "hardware"]:
            if saved.get(key) != report[key]:
                raise ValueError(key + " changed; start a separate measurement")
        for field in ["scenario", "variant"]:
            requested = getattr(args, field)
            if requested is not None and requested != saved.get("filters", {}).get(field):
                raise ValueError("Resume filters differ from saved measurement")
            setattr(args, field, saved.get("filters", {}).get(field))
        report = saved
        report.setdefault("resumed_at", []).append(now())
    def save():
        atomic_json(out / "summary.json", report)
    expected_records = {f"{sid}-{cfg['id']}-{repeat + 1}": {"manifest_hash": cfg["manifest_hash"], "seed": 20261023 + repeat}
                    for sid, version in [("stolen-session", "v1"), ("northstar-breach", "v2")]
                    if not args.scenario or args.scenario == sid
                    for cfg in variants(sid, version) if not args.variant or args.variant == cfg["id"]
                    for repeat in range(2)}
    expected_ids = set(expected_records)
    if not expected_ids:
        raise ValueError("No valid saved scenario/variant filter")
    validate_records(report["trials"], expected_records, ["manifest_hash", "seed"])
    if args.resume:
        for trial in report["trials"]:
            if trial.get("trace_hash"):
                trace = json.loads((out / (trial["id"] + ".json")).read_text())
                if trace.get("trace_hash") != trial["trace_hash"] or digest({k:v for k,v in trace.items() if k != "trace_hash"}) != trial["trace_hash"]:
                    raise ValueError("Saved trace changed: " + trial["id"])
    save()
    for sid, version in [("stolen-session", "v1"), ("northstar-breach", "v2")]:
        if args.scenario and args.scenario != sid: continue
        for cfg in variants(sid, version):
            if args.variant and args.variant != cfg["id"]: continue
            for repeat in range(2):
                label = f"{sid}-{cfg['id']}-{repeat + 1}"
                if any(t["id"] == label for t in report["trials"]): continue
                orphan = out / (label + ".json")
                if orphan.exists():
                    orphan.rename(out / (label + "-interrupted-" + now().replace(":", "-") + ".json"))
                trial = {"id": label, "passed": False, "manifest_hash": cfg["manifest_hash"], "seed": 20261023 + repeat}
                rid = None
                with tempfile.TemporaryDirectory() as tmp, TestClient(create_target(Path(tmp) / "target.db", "objective-proof"), headers={"x-range-secret": "objective-proof"}) as client:
                    engine = Engine(Path(tmp) / "control.db", HttpTargetAdapter(client), agent)
                    try:
                        rid = engine.create(sid=sid, version=version, seed=trial["seed"], assistance="independent", variant_id=cfg["id"])["run_id"]
                        engine.start(rid)
                        while True:
                            state = engine.store.run(rid)
                            if state["state"] in TERMINAL or state["ai_step"] >= state["max_steps"]:
                                break
                            engine.tick(rid, max(1, state["next_ai_sec"] - state["virtual_clock_sec"]))
                            engine.decide(rid)
                            if engine.store.run(rid).get("ai_unavailable"):
                                engine.retry_ai(rid)
                                if engine.store.run(rid).get("ai_unavailable"):
                                    raise RuntimeError("Model unavailable after bounded retry")
                        reads = [e for e in engine.store.events(rid) if e.get("decision_id") and e.get("target_audit_id") and e["event_type"] == "document.access" and e.get("resource_id") == cfg["objective_resource"] and e.get("outcome") == "allowed"]
                        trial.update(passed=bool(reads), objective_resource=cfg["objective_resource"], protected_reads=[{k: e[k] for k in ["event_id", "decision_id", "target_audit_id", "session_handle", "correlation_id", "virtual_clock_sec"]} for e in reads])
                        if not reads:
                            trial["error"] = "No model objective read within the accepted scenario budget"
                    except Exception as exc:
                        trial["error"] = type(exc).__name__ + ": " + str(exc)
                    finally:
                        if rid:
                            state = engine.store.run(rid)
                            if state["state"] not in TERMINAL:
                                engine.finish(state, "technical_failure")
                            trace = engine.replay(rid)
                            decisions = {d["decision_id"]: d for d in trace["agent_decisions"]}
                            audited = [e for e in trace["events"] if e.get("decision_id") and e.get("target_audit_id")]
                            objective_reads = [e for e in audited if e["event_type"] == "document.access" and e.get("resource_id") == cfg["objective_resource"] and e.get("outcome") == "allowed"]
                            pacing = True
                            for read in objective_reads:
                                prior = [e for e in audited if e["sequence"] < read["sequence"]]
                                pacing = pacing and bool(prior) and read["virtual_clock_sec"] >= prior[0]["virtual_clock_sec"] + spec(state)["first_read_sec"]
                                pacing = pacing and len(prior) >= spec(state)["minimum_signals_before_first_protected_read"]
                                if version == "v2":
                                    route = [e for e in prior if e.get("session_handle") == read["session_handle"]]
                                    pacing = pacing and len(route) >= spec(state)["minimum_signals_before_first_protected_read"] and read["virtual_clock_sec"] >= route[0]["virtual_clock_sec"] + spec(state)["pivot_window_sec"]
                            trial["pacing_passed"] = bool(objective_reads) and pacing
                            trial["objective_from_accepted_model"] = bool(objective_reads) and all(decisions[e["decision_id"]]["accepted"] and not decisions[e["decision_id"]]["fallback_used"] and decisions[e["decision_id"]]["accepted_action"] == "request_document" for e in objective_reads)
                            trial["target_actions_correlated"] = all(any(e["decision_id"] == d["decision_id"] for e in audited) for d in decisions.values() if d["accepted"] and d["accepted_action"] not in {"wait", "stop"})
                            atomic_json(out / (label + ".json"), trace)
                            trial.update(trace_hash=trace["trace_hash"], outcome=trace["outcome"], decisions=len(trace["agent_decisions"]), rejected=sum(not d["accepted"] for d in trace["agent_decisions"]), fallback_execution=sum(bool(d["fallback_used"] and d["accepted"]) for d in trace["agent_decisions"]))
                            trial["passed"] = trial["passed"] and trial["pacing_passed"] and trial["objective_from_accepted_model"] and trial["target_actions_correlated"] and trial["fallback_execution"] == 0
                        engine.store.db.close()
                report["trials"].append(trial)
                save()
                print(label, "PASS" if trial["passed"] else "FAIL", flush=True)
    complete = len(report["trials"]) == len(expected_ids) and {t["id"] for t in report["trials"]} == expected_ids
    report.update(finished_at=now(), expected_trials=len(expected_ids), passed=complete and all(t["passed"] for t in report["trials"]))
    save()
    print(out, flush=True)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
