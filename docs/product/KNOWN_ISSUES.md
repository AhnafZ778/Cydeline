# Measured acceptance issue — 24 October 2026

## AI-LEARN-01: Reporting service-dependent attacker adaptation

Status: **open; blocks the complete twelve-journey model objective gate**. The beginner learning features and separate containment proof do not close this gate.

Final measurement: `docs/model-card/learning/2026-10-23T18-40-21.322575Z-objectives/summary.json`, 10/12. Both `northstar-breach-service-dependent` repeats fail. Their saved traces contain twelve accepted decisions each: one document list, nine status inspections and two denied document requests. The model repeatedly chooses `context_1` despite recorded objective-permission states `denied` / `unknown`. It never discovers the independent credential path within the existing scenario budget.

The target denies the unauthorized requests. All twelve trace hashes and gate calculations were independently checked: 90 accepted decisions, 62 audited target actions, ten valid objective reads, zero executed fallback. This is a model choice/adaptation failure, not an observed authorization bypass. The separate current intervention measurement passes 12/12; early containment is not objective-read evidence.

Reproduce a **new** measurement with:

```
RED_AGENT_TIMEOUT_MS=30000 .venv/bin/python scripts/prove_variant_objectives.py --scenario northstar-breach --variant service-dependent
```

Current configuration: Qwen3:1.7b Q4_K_M, selector thinking disabled, 80 tokens, temperature 0.1; action generation 130 tokens, temperature 0.7. Keep the existing twelve-step budget, signal/time pacing, complete route mapping, schema/policy validation and real target requests. Do not replace a failed record in an existing report or use a scripted attacker to pass the gate.

Next atomic action: evaluate model capability on the saved denied/unknown permission context before another full matrix. Any consequential selector-policy or model change needs a recorded contract decision and independent review. A stronger local model needs a declared hardware/memory configuration; this host remained under substantial RAM/swap pressure. A passing isolated selection is insufficient: rerun the full twelve objective journeys and paired interventions after a supported change.

All earlier failures and the explicitly interrupted thinking-mode run remain under `docs/model-card/learning/`. The participant pilot is separately deferred by the user; its blank kit is ready. No educational-effectiveness or release-readiness claim follows from passing engineering checks.

## AI-LEARN-02: live coaching latency tail

Status: observed performance limitation; representative under-load latency remains unqualified. The genuine Stolen Session browser journey recorded a successful V8 Guide response at **51989ms**. The separate sixty-case constrained suite passed with p95 **2403ms**, range1266–3117ms. Preserve both measurements: the isolated benchmark does not guarantee responsive coaching in a browser under host RAM/swap pressure. One live sample does not estimate an under-load p95.

Evidence: `docs/demo/learning/final-v8/v1-replay.json`, persisted assistant turn, and the independent review. The answer and its disputed review survived refresh. No availability or p95 claim should omit this tail. Next measurement should use the declared deployment/browser workload and report memory, competing work and all failures; do not silently combine different workloads into one latency distribution.
