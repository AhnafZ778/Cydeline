# Evaluation: Tanvir — Local AI Red-Team Engine (`tanvir-red-agent`)

- **Verdict:** `blocked` (Task Contract established; awaiting `services/red-agent/` implementation in Increment B1–B3)
- **Evaluated source identity and time:** `2026-10-22` · Branch `chore/publish-workstreams` · Baseline Planning Snapshot
- **Accepted task contract:** `context/contracts/tanvir-red-agent.contract.md`
- **Independent evaluator / independence limitations:** Requires fresh-context `harness-evaluate` review of validator fuzz tests (`tests/agent/`) and empirical model benchmark results (`docs/model-card/`).

## Acceptance evidence
- [x] Starter runtime policy (`03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`) and task contract (`context/contracts/tanvir-red-agent.contract.md`) frozen.
- [ ] **Increment B1 (Schemas, Observation Builder, 2-Stage Validator & Fallback):** `services/red-agent/` enforces strict JSON schema + role/action/handle allowlist (`0` out-of-policy actions accepted) and tagged timeout fallback (`fallback_used: true`).
- [ ] **Increment B2 (Ollama Runtime & 3 Sequential Roles):** `Qwen3-1.7B Q4` connected via Ollama for `scout`, `access_operator`, and `adaptation_planner` with latency, `prompt_hash`, and `observation_hash` tracking.
- [ ] **Increment B3 (Empirical Benchmark & Control-Plane Integration):** $\ge 28/30$ schema-valid trials, $\ge 8/10$ pre/post-containment adaptation trials, and live integration with Saad's `apps/control-api/`.

## Findings: severity, location, trigger, actual behavior, expected behavior
- None at planning baseline.

## Checks, browser observations and artifacts
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- Planned unit/benchmark checks: `python3 -m unittest discover -s tests/agent -v`

## Unverified criteria and environment limits
- Ollama runtime and `Qwen3-1.7B Q4` latency on the host machine have not yet been measured.

## Next action (fixes return to Implement)
- Execute **Increment B1** in `harness-implement`: build `services/red-agent/` validator, observation builder, and fallback handler with unit tests in `tests/agent/`.


## 2026-10-23 beginner learning recovery evaluation

- Verdict: **BLOCKED for full milestone/release acceptance; reproduced product defects resolved in reviewed scope.**
- Evaluated source identity and time: `chore/publish-workstreams`, base `d93b6400489e2da787c8e1ea54f5881fce313285`, preserved dirty tree. This record is written before final snapshot verification; the final native Harness receipt binds the actual dirty snapshot.
- Accepted task contract: current beginner amendment in `context/contracts/master-integration.contract.md`, companion owner contract and `docs/product/BEGINNER_LEARNING_PLAN.md`.
- Independent evaluator / independence limitations: fresh collaboration evaluator `learning_review`, review-only (no source edits), with source and targeted native/browser reproductions. Parent performed implementation and broader checks. No participant study or assistive-technology evaluation.

### Acceptance evidence

- Backend 345 tests +18 subtests pass; frontend 54 tests and production build pass. Final Harness run/evaluate remains authoritative for snapshot freshness.
- Browser checks cover original console/navigation, worksheet refresh/disconnection/conflicts/stale acknowledgements, two-tab identity isolation, case base revisions, briefings/Begin and authored exercises. All four widths were checked; 1440px entry-motion contrast was corrected and rechecked. Fixture-based checks do not replace live-service integration. Narrow/wide worksheet images were inspected.
- Independent evaluator rechecked terminal hint serialization, stable replay across three hash seeds, historical response citations, rejected containment/future-fact coach bypasses, actor scoping and long-report excerpts through the full API. Latest independent learning/API subset: 67 passed.
- Twelve genuine local-model journeys: 24 accepted decisions, zero fallback, 16 target-correlated inspections and eight stops, all recovered. Six actual target configurations also passed capability/disruption/restoration checks. No model objective document reads were recorded.
- Coach v4: 60/60 source-supported, p95 16148ms FAIL; poor metadata-only relevance preserved. Ten additional injected telemetry/report contexts produced supported selections. Current v5: 59/60 supported, p95 11885ms PASS, one real unavailable timeout 62066ms retained. The 60 validator cases are evenly categorized; actual selection support is not semantic quality.

### Findings: severity, location, trigger, actual behavior, expected behavior

Resolved: P1 coach generated authority/factual premises (`assistant.py`); P1 cross-analyst drafts and stale base revisions (`types.ts`, `RunContext.tsx`, `LiveCases.tsx`); P1 obsolete worksheet saves erasing newer recovery content (`Worksheet.tsx`); P1 later evidence attributed to prior actions (`learning.py`, `engine.py`); P1 hint/finish race (`api.py`); P2 replay citation ordering; P2 reference-only citation rendering and payroll objective marker (`logic.ts`); P2 long normalized supported fact API rejection (`contracts/runtime.py`); entry-motion contrast (`console.css`).

Open gates: contextual coaching relevance/usefulness and availability tail; stale real-service `tests/e2e/live.spec.ts`; broader model objective reads; deployed network isolation/release evidence; actual participant pilot. These are not silently passed by unit tests.

### Checks, browser observations and artifacts

See `docs/product/BEGINNER_LEARNING_HANDOFF.md` for exact commands, screenshots and model artifacts. Corrected attacker summary: `docs/model-card/learning/2026-10-23T13-29-59.018382Z-attacker/summary.json`. Current coach summary: `docs/model-card/learning/2026-10-23T13-46-08.657426Z-coach/summary.json`. Prior failed/incomplete runs retained in the same directory tree.

### Unverified criteria and environment limits

Real Ollama HTTP on i5-1235U / ~16GB / Qwen3:1.7b Q4_K_M; target journey requests use actual application code with in-process ASGI HTTP transport. Container network isolation, genuine browser-to-service journeys, full WCAG conformance, novice usability, professional readiness, learning gains and retention are unverified. Active context occupancy is unknown.

### Next action (fixes return to Implement)

Rewrite and run both consolidated real-service browser journeys, then improve and human-review coaching relevance/availability and extend model objective-read proof. Pilot observations require actual participants. Keep current evidence and checkpoint files; do not restart implemented scaffolding.

Final stable checks after interruption: 345 backend tests +18 subtests, 54 frontend tests, production build and all23 consolidated browser tests passed (55.0s; docs/demo/learning/browser-verification.txt). Stable Harness run passed; regenerate/evaluate its receipt after saving this record. Acceptance limitations above remain unchanged.


## 24 October 2026 — final beginner engineering evaluation

Source: dirty `chore/publish-workstreams`, base `d93b6400489e2da787c8e1ea54f5881fce313285`. Current source hashes and independent findings: `docs/model-card/learning/INDEPENDENT_REVIEW_2026-10-24.md`. Source and bounded functional checks pass; **full M3 model acceptance remains failed at 10/12**. The native command receipt is generated after final context writes and does not override this acceptance finding.

Current verification: 359 backend/policy tests plus 18 subtests, 54 frontend tests and production build, 23 console/learning/navigation browser checks, all three genuine V8 journeys individually passed across the documented interruption, and 58/58 current target/control Docker checks. Durable browser, native and build logs: `docs/demo/learning/final-v8/`; current container receipt: `COMPOSE_ISOLATION_FINAL_CURRENT.json`. Both raw terminal replay digests independently reproduce; original JavaScript serializations and the startup-wait failure are retained. The post-execution suite change only saves raw response text; receipt.json records both hashes.

Coach V8: 60/60 constrained cases, 136 exact supports, p95 2403ms independently recomputed; singleton authored retrieval does not establish model topic discrimination or usefulness. A genuine browser answer took 51989ms; AI-LEARN-02 retains this load-sensitive tail.

Final objectives: 10/12 FAIL, 90 accepted decisions, zero executed fallback, 62 audited actions, ten successful objective reads. Both Reporting service-dependent repeats select a known-denied route while another remains unexplored. All 14 document requests obey pacing and target denial remains intact. AI-LEARN-01 records the exact traces and next atomic capability evaluation.

Current early containment: 12/12, 24 accepted decisions, twelve audited initial model actions, eighteen defender changes and 24 successful verification probes. After response, the model only waits/stops; no pivoting is proven. Browser proof likewise establishes initial activity and defender workflow, not later adaptation.

The user chose to leave the pilot kit ready. No participant sessions, delayed transfer/retention results, professional-readiness claim or complete manual accessibility evaluation exist. Optional Windows image work, public deployment, competition confirmation and a completed demo recording remain separate. Active-window occupancy is unknown.

Next: resolve AI-LEARN-01 through a declared capability/policy decision and fresh independent evaluation, then repeat the full objective/intervention matrix without replacing failed records. Measure representative browser-load coaching latency before responsiveness claims. See `docs/product/BEGINNER_LEARNING_HANDOFF.md`.
