"""Reproducible local-model evidence. Target HTTP calls use in-process ASGI, not container isolation.

Writes progress and every recorded journey before advancing. No scripted attacker or fallback.
Run: .venv/bin/python scripts/evaluate_beginner_learning.py [--scope attacker|coach|all]
"""
from __future__ import annotations
import argparse
import json
import math
import os
import platform
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from fastapi.testclient import TestClient
from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.agent import LocalAgent
from services.range_runtime.assistant import EvidenceAssistant
from services.range_runtime.catalog import spec
from services.range_runtime.common import now
from services.range_runtime.engine import Engine
from services.range_runtime.target import create_target
from services.range_runtime.variants import variants


def main():
    parser = argparse.ArgumentParser(__doc__)
    parser.add_argument("--scope", choices=["all", "attacker", "coach"], default="all")
    parser.add_argument("--category", help="Evaluate one coaching category; omitted runs the full set")
    parser.add_argument("--resume", type=Path, help="Resume a saved coaching output directory without discarding failed cases")
    args = parser.parse_args()
    out = args.resume.resolve() if args.resume else ROOT / "docs/model-card/learning" / (now().replace(":", "-") + "-" + args.scope)
    if args.resume:
        if args.scope != "coach": raise ValueError("Resume currently supports coaching only")
        if not out.is_relative_to(ROOT / "docs/model-card/learning"): raise ValueError("Resume must use this project's saved learning evidence")
    else:
        out.mkdir(parents=True)
    agent = LocalAgent()
    health = agent.health()
    report = {"started_at": now(), "scope": args.scope, "source_revision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
              "source_state": "dirty working tree; see paired Harness receipt", "hardware": {"platform": platform.platform(), "cpu": next((l.split(':', 1)[1].strip() for l in Path('/proc/cpuinfo').read_text().splitlines() if l.startswith('model name')), platform.processor()), "logical_cpus": os.cpu_count(), "memory": next((l.strip() for l in Path('/proc/meminfo').read_text().splitlines() if l.startswith('MemTotal:')), 'unknown')},
              "model": health, "attacker_config": agent.action_client.config.describe(), "selector_config": agent.selector.config.describe(),
              "transport": "Real local Ollama HTTP; actual target implementation via in-process HTTP ASGI transport. Container isolation and browser UX are separate gates.",
              "journeys": [], "coaching": [], "limitations": ["No participant or educational-efficacy evidence.", "Coaching utility requires human review; finite authored scaffolds constrain interpretation."]}
    if args.resume:
        from services.range_runtime.assistant import PROMPT_VERSION
        saved = json.loads((out / "summary.json").read_text())
        if saved["model"] != health: raise ValueError("Model health/config changed; start a separate measurement")
        if any(c.get("turn", {}).get("prompt_version", PROMPT_VERSION) != PROMPT_VERSION for c in saved["coaching"]):
            raise ValueError("Prompt changed; start a separate measurement")
        report = saved
        report.setdefault("resumed_at", []).append(now())
    def save():
        (out / "summary.json").write_text(json.dumps(report, indent=2) + "\n")
    save()
    if not health.get("model_present"):
        report["blocked"] = "Configured model unavailable"; save(); return 1
    if args.scope in {"all", "attacker"}:
        for sid, version in [("stolen-session", "v1"), ("northstar-breach", "v2")]:
            for v in variants(sid, version):
                for repeat in range(2):
                    label = f"{sid}-{v['id']}-{repeat + 1}"
                    result = {"id": label, "variant": v["id"], "manifest_hash": v["manifest_hash"], "seed": 20261023 + repeat, "passed": False}
                    with tempfile.TemporaryDirectory() as tmp, TestClient(create_target(Path(tmp) / "target.db", "evaluation"), headers={"x-range-secret": "evaluation"}) as target:
                        engine = Engine(Path(tmp) / "control.db", HttpTargetAdapter(target), agent)
                        rid = None
                        try:
                            rid = engine.create(sid=sid, version=version, seed=result["seed"], variant_id=v["id"])["run_id"]
                            engine.start(rid); engine.begin(rid); engine.tick(rid, 8); engine.decide(rid)
                            r = engine.store.run(rid)
                            if r.get("ai_unavailable"): raise RuntimeError("Initial model decision failed")
                            before = engine.store.rows("agent_decisions", rid)
                            if not any(e.get("decision_id") for e in engine.visible(r)): raise RuntimeError("No actual initial model-target action")
                            evidence = next(e for e in engine.visible(r) if e.get("session_handle") == v["browser_handle"])
                            engine.declare(rid, {"suspected_actor": v["browser_owner"], "suspected_session": v["browser_handle"], "rationale": "Evaluation intervention compares access and employee continuity.", "event_ids": [evidence["event_id"]]})
                            engine.defend(rid, {"action": "revoke_session", "target_handle": v["browser_handle"], "idempotency_key": "eval_browser_response"})
                            pending = engine.store.run(rid)
                            engine.tick(rid, max(0, pending["next_ai_sec"] - pending["virtual_clock_sec"])); engine.decide(rid)
                            r = engine.store.run(rid)
                            if r.get("ai_unavailable"): raise RuntimeError("Post-intervention model decision failed")
                            after = engine.store.rows("agent_decisions", rid)
                            if len(after) <= len(before): raise RuntimeError("No post-intervention model decision")
                            result["intervention"] = {"before": before[-1], "after": after[-1], "observed_access_after": r["observed"]}
                            if version == "v2":
                                # This handle is now released by the real response verification probe.
                                engine.defend(rid, {"action": "revoke_api_credential", "target_handle": "key_reporting", "idempotency_key": "eval_reporting_response"})
                            checks = engine.verify(rid)
                            result["passed"] = checks["all_passed"] and engine.store.run(rid)["outcome"] == "defended_and_recovered"
                            if not result["passed"]: result["error"] = "Recovery/outcome gate failed"
                        except Exception as exc:
                            result["error"] = type(exc).__name__ + ": " + str(exc)
                        finally:
                            if rid:
                                r = engine.store.run(rid)
                                if r["state"] not in {"completed", "timed_out", "aborted", "technical_failure"}: engine.finish(r, "technical_failure")
                                trace = engine.replay(rid)
                                (out / (label + ".json")).write_text(json.dumps(trace, indent=2) + "\n")
                                result.update(trace_file=label + ".json", trace_hash=trace["trace_hash"], decisions=len(trace["agent_decisions"]), fallback_count=sum(d["fallback_used"] for d in trace["agent_decisions"]), correlated_actions=sum(bool(e.get("decision_id") and e.get("target_audit_id")) for e in trace["events"]))
                            engine.store.db.close()
                    report["journeys"].append(result); save(); print(label, "PASS" if result["passed"] else "FAIL", flush=True)
    if args.scope in {"all", "coach"}:
        coach = EvidenceAssistant()
        original_chat = coach.client.chat
        attempts = []
        def recorded_chat(*args, **kwargs):
            reply = original_chat(*args, **kwargs)
            attempts.append({"raw": reply.text, "model": reply.model})
            return reply
        coach.client.chat = recorded_chat
        report["coaching_config"] = coach.client.config.describe()
        cases = json.loads((ROOT / "docs/model-card/COACHING_CASES.json").read_text())
        from services.range_runtime.common import digest
        if args.resume and report.get("case_set_hash") != digest(cases): raise ValueError("Case set changed; start a separate measurement")
        report["case_set_hash"] = digest(cases)
        report["category_filter"] = args.category
        if args.category:
            cases = [c for c in cases if c["category"] == args.category]
            if not cases: raise ValueError("Unknown coaching category")
        for case in cases:
            if any(previous["id"] == case["id"] for previous in report["coaching"]): continue
            sources = case["sources"]
            events = []
            for sid, fields in sources.items():
                if sid.startswith("evt_"):
                    event = {"event_id": sid, **{k:v for k,v in fields.items() if not k.startswith("network.")}}
                    event["network"] = {k.removeprefix("network."):v for k,v in fields.items() if k.startswith("network.")}
                    events.append(event)
            context = {"report_fields": {sid.removeprefix("report:"): fields["text"] for sid, fields in sources.items() if sid.startswith("report:")}}
            started = time.monotonic()
            attempts.clear()
            record = {"id": case["id"], "category": case["category"], "passed": False}
            try:
                turn = coach.analyze(events, case["question"], level=case["level"], context=context)
                record.update(passed=True, turn=turn)
            except Exception as exc:
                record["error"] = type(exc).__name__ + ": " + str(exc)
            record["elapsed_ms"] = round((time.monotonic() - started) * 1000)
            record["model_attempts"] = list(attempts)
            report["coaching"].append(record); save(); print(case["id"], "SUPPORTED" if record["passed"] else "UNAVAILABLE", flush=True)
        timings = sorted(c["elapsed_ms"] for c in report["coaching"])
        report["coaching_p95_ms"] = timings[math.ceil(len(timings) * .95) - 1]
        report["coaching_latency_passed"] = report["coaching_p95_ms"] <= 15000
    report["finished_at"] = now(); save()
    print("Evidence:", out, flush=True)
    return 0 if all(x["passed"] for x in report["journeys"] + report["coaching"]) and report.get("coaching_latency_passed", True) else 1


if __name__ == "__main__":
    raise SystemExit(main())
