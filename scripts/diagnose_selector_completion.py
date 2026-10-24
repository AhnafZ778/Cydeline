"""Compare completion budgets on one captured selector input; no target action is executed."""
import hashlib
import json
import os
import platform
import sys
import time
from dataclasses import replace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from services.range_runtime.agent import LocalAgent, ollama
from services.range_runtime.common import now
from scripts.learning_evidence import atomic_json


def main():
    agent = LocalAgent()
    captured = {}

    class Captured(Exception):
        pass

    class CaptureSelector:
        def chat(self, messages, **kwargs):
            captured.update(messages=messages, schema=kwargs["format_schema"])
            raise Captured()

    original = agent.selector
    agent.selector = CaptureSelector()
    # The failed Reporting shared-work initial selector sees these two unknown
    # objective permissions. Alias input and schema are captured from runtime code.
    state = {"next_role": "scout", "observed": {}, "observed_documents": {},
             "scenario": {"routes": {"sess_B": {}, "key_reporting": {}},
                          "rubric": {}, "objective_resource": "doc_finance_07"}}
    try:
        agent.decide(state, {}, [])
    except Captured:
        pass
    assert json.loads(captured["messages"][1]["content"]) == {
        "contexts": {"context_1": "unknown", "context_2": "unknown"}}
    configs = [replace(original.config, think=True, num_predict=500),
               replace(original.config, think=False, num_predict=80)]
    report = {"started_at": now(), "model": agent.health(), "input": captured,
              "criteria": "A usable alias must be selected and final JSON must complete within the existing wall budget. This is one context, not semantic reliability or a target journey.",
              "source_sha256": {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                                for p in [ROOT/"services/range_runtime/agent.py", ROOT/"services/red-agent/ollama_client.py", Path(__file__)]},
              "hardware": {"platform": platform.platform(), "logical_cpus": os.cpu_count()}, "conditions": []}
    out = ROOT/"docs/model-card/learning"/(now().replace(":", "-")+"-selector-completion.json")
    atomic_json(out, report)
    for config in configs:
        result = {"config": config.describe(), "passed": False}
        started = time.monotonic()
        try:
            reply = ollama.OllamaClient(config).chat(captured["messages"], format_schema=captured["schema"])
            result.update(done_reason=reply.done_reason, eval_count=reply.eval_count,
                          thinking_chars=reply.thinking_chars, content_chars=len(reply.text))
            choice = json.loads(reply.text)
            result["selected_access"] = choice.get("selected_access")
            result["passed"] = set(choice) == {"selected_access"} and choice["selected_access"] in {"context_1", "context_2"}
        except Exception as exc:
            result["error"] = type(exc).__name__+": "+str(exc)[:200]
        result["elapsed_ms"] = round((time.monotonic()-started)*1000)
        result["passed"] = result["passed"] and result["elapsed_ms"] <= config.timeout_ms
        report["conditions"].append(result)
        atomic_json(out, report)
        print(json.dumps(result), flush=True)
    report["finished_at"] = now()
    atomic_json(out, report)
    print(out, flush=True)


if __name__ == "__main__":
    main()
