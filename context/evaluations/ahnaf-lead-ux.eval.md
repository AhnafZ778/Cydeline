# Evaluation: Ahnaf — Lead, Overseer & Defender Command Center (`ahnaf-lead-ux`)

- **Verdict:** `blocked` for full release; **simulation-mode vertical slice passes** (see scope below). Blocked only on items that need Saad/Tanvir's live services or an independent evaluator.
- **Evaluated source identity and time:** `2026-10-22` · Branch `chore/publish-workstreams` · base revision `c6bdbad8ea3964dc58fd6d74462dcc7b8a17362e` + uncommitted `apps/web/`, `tests/e2e/`, `docs/demo/`. Exact snapshot hash is in the harness receipt (`harness check evaluate` output), not repeated here because editing this file changes the snapshot.
- **Accepted task contract:** `context/contracts/ahnaf-lead-ux.contract.md` (Mission Workbench + V2: Ember theme, n8n-style workflow canvas, Adversary Lens).
- **Independent evaluator / independence limitations:** This pass was written by the implementing agent after a mechanical test run. It is NOT an independent fresh-context review. A different agent or person should repeat the manual checks below before gate G5.

## Acceptance evidence

Scope: `StatefulSimulationClient` (default). The `LiveHttpControlClient` path compiles and is typed against `contracts/` but was not exercised against a running control API.

- [x] **A1 shell + 7 states** rendered: landing, observe, investigate, declare, contain, verify, debrief (Playwright keyboard-only run reaches debrief).
- [x] **A2 declare / contain / verify**: declare requires session + evidence + rationale (submit stays disabled otherwise); respond is a single Apply with neutral blast-radius cards; verify runs paired probes (intruder refused, Eli still served). Covered by `tests/e2e/mission.spec.ts › keyboard-only run`.
- [x] **V2 workflow canvas**: circular nodes, bezier edges with counts, gateway, Refused sink, protected asset, "Your response" node, data-driven packets, click/Enter opens the details dock, Esc closes it. Covered by `workflow nodes open a details dock`.
- [x] **V2 Adversary Lens**: Coached narration and AI node/log markers; Blind removes all AI hints; assessment mode forces Blind. Covered by `Adversary Lens narrates ...`; unit tests in `apps/web/src/lib/adversary.test.ts`.
- [x] **Anti-oracle (`AI-01`)**: no `risk_label` or prose summary is rendered in the learner view; dock "Ask yourself" content is questions only; ground truth is not read from the scenario fixture.
- [x] **Accessibility (WCAG 2.2 AA, axe tags wcag2a/aa/21a/21aa/22aa, fail on serious or critical)**: zero violations on landing, workbench (AI acting), node dock, event inspector, declare drawer, debrief, and the workbench at 320, 390, 768 and 1440 px.
- [x] **Responsive**: no page-level horizontal scroll at 320, 390, 768, 1440 px; the workflow canvas scrolls inside its own focusable region below 1100 px.
- [x] **Keyboard**: full loop completed without a pointer (Tab/Enter on nodes and buttons, `j`/`Enter`/`p` on logs, Esc closes panels). Developer drawer (`Ctrl+K`) is used only to advance the simulated clock.
- [x] **Reduced motion**: all four state-bound motions have `prefers-reduced-motion` fallbacks (inspected in `flow.css`/`workbench.css`; not automated).
- [ ] **A3 live wiring (SSE/REST, `fallback_used` badge against a real run)**: unverified, needs `apps/control-api/` from Saad.
- [ ] **A4 uncut 3-minute recording**: script written (`docs/demo/DEMO_SCRIPT.md`), not recorded.
- [ ] **Independent review (`grill-my-ui` or a human)**: not done.

## Findings: severity, location, trigger, actual behavior, expected behavior

Fixed during this pass (return-to-Implement loop already closed):

1. **serious** · `FlowCanvas.tsx` node `<g role="button">` · axe `label-content-name-mismatch` on every node · visible text (count, label, sub) was inside the button but not in its `aria-label` · expected: accessible name contains visible text (WCAG 2.5.3). Fix: the button now owns only the shapes and the full name (`label, N requests, sub. Open details.`); visible text is a sibling group marked `aria-hidden`. Same fix on `AdversaryStrip` button (name from content).
2. **serious** · `TopBar.tsx` `.opponent-chip` · axe `aria-prohibited-attr` below 1024 px · `aria-label` on a `<span>` with no role, and the status text was `display: none` when collapsed · expected: status still available to assistive tech. Fix: text is visually hidden (not removed) and the redundant `aria-label` is gone.
3. **minor** · `shell.css` top bar at 320 px · step label "Observe" collided with the clock chip · expected: no overlap. Fix: tighter gaps below 400 px.

Open:

4. **minor / design trade-off** · Coached lens · once the AI acts, its session is named, which shortens the investigation · expected for a teaching mode, but must never be presented in scored runs. Mitigation in place: assessment forces Blind, lens is not sent to scoring. Needs product sign-off from the lead.
5. **minor** · `apps/web/src/lib/adversary.ts` `aiFootprint` · AI attribution of log rows and nodes is a client-side heuristic (matches decisions to sessions/IPs) · expected: server-provided attribution. Pending master-integration contract request 5 (`last_ai_decision` in practice mode, optional `ai_phase`, `agent_step`).
6. **minor** · `StatefulSimulationClient` · IP, user-agent and the 6:1 benign ratio are synthesized client-side · expected: scenario fixture provides them (contract requests 1 and 2 in `master-integration.contract.md`).
7. **info** · `docs/demo/mockups/` is the stale white-blue direction. Not shipped. Safe to delete or refresh.

## Checks, browser observations and artifacts

- `apps/web`: `npm test` (Vitest, 6 files, 35 tests) pass; `npm run typecheck` clean; `npm run build` ok (JS 381 kB, 117 kB gzip; CSS 62 kB).
- `tests/e2e`: `npx playwright test` (system Chrome, `--no-sandbox`, Vite on 5175) 9 of 9 pass in about 70 s. Specs: landing/workbench axe, node dock by keyboard, Coached vs Blind lens, keyboard-only full loop with axe at inspector, declare drawer and debrief, four-viewport layout, first-run tour.
- Manual visual review (hi-res screenshots) at 1440, 768, 390 and 320 px for observe, contained, retry, blind, dock and tour states; 0 console errors across runs.
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline` then `harness check evaluate /home/ahnaf-zakaria/Downloads/Cydeline` (receipt in `~/.local/share/agent-harness/verification/`).

## Unverified criteria and environment limits

- Live API mode, SSE disconnect/reconnect, and `fallback_used` display against a real run.
- Screen readers (NVDA, VoiceOver); only axe plus keyboard traversal were used. Axe cannot prove contrast for text over the SVG dotted grid; contrast was set from token ratios and spot-checked by eye.
- Touch input on a physical phone; layouts were tested with a resized desktop Chrome viewport.
- Firefox and Safari were not run (Chrome only).

## Next action (fixes return to Implement)

- Saad accepts or amends master-integration contract requests 1, 2 and 5 (network block, fixture signal, practice-mode AI telemetry); then switch the web app to `VITE_API_MODE=live` and re-run `tests/e2e` against the control API.
- Record the 3-minute demo from `docs/demo/DEMO_SCRIPT.md`.
- Have a fresh evaluator repeat the manual checks (keyboard, screen reader, phone) before gate G5.


## Repository readiness audit — 2026-10-23 (Asia/Dhaka)

- **Verdict:** Full live MVP remains blocked. This was a read-only application review requested by Ahnaf; only context/evaluation records were changed.
- **Evaluated source identity and time:** branch chore/publish-workstreams, revision d93b6400489e2da787c8e1ea54f5881fce313285. Pre-recording harness snapshot 9f1a9df85c3dca69e73c691a4b723be08522e7cac49430c42f6a7f2c2ed712ec; the final receipt after this note/checkpoint supersedes that snapshot.
- **Scope:** Root product/owner plans, all four live contexts and packet mirrors, task contracts/evaluation ledgers, source inventory, shared contracts/scenario/rubric, web entry points and state/adapters, console state/grading, red-agent runtime/validator/observations/benchmarks, and existing test suites. Third-party dependencies and binary recordings were not exhaustively reviewed. Walkthrough.mkv exists (698.066 s); it was not verified as a release demo.
- **Independence:** Fresh evaluation perspective on existing implementation; not a separate human audit, penetration test, learning-efficacy study, or complete live deployment test.

### Current verification evidence

- Frontend Vitest: 44/44 pass; typecheck and production build pass.
- AI unit suite: 164 tests run, OK with 9 skipped (155 executed successfully). Pydantic-dependent adapter tests skipped in this Python environment.
- Contract suite cannot import because Pydantic is absent; prior 35-test success is historical evidence, not rerun success.
- Playwright suite final .last-run.json says failed and records one failed test. The console phishing workflow timed out at choice-Malicious after a scanner popup; page snapshot says the case is not open. Root cause not conclusively established. Test setup clears sl.soc.v1 using an initialization script, so fixture interactions with popups must be checked before blaming application state logic.
- Native harness check run and check evaluate passed before recording this audit. Their configured coverage is context/schema-document checks plus frontend typecheck only; they do not establish target/control integration or all product acceptance gates.
- Saved MODEL_CARD.md / BENCHMARK.json report qwen3:1.7b Q4_K_M: 29/30 valid proposals, 9/10 adaptation pairs, 0 accepted policy violations, warm median 3081 ms and p95 4269 ms on the recorded host. Live inference was not rerun here.
- Initial harness_sync.py status fails while native resume tries to hash tests/agent as a file (IsADirectoryError). Ahnaf takeover and native resume work. Existing Tanvir notes about a missing harness binary are historical for another host.

### Findings and remaining work

1. **Blocker, observed:** apps/target-api/, apps/control-api/, infra/range/, tests/target/, and tests/isolation/ are absent in this checkout. Contracts define a TargetAdapter protocol, not its implementation. No verified model-to-target-to-audit-to-defense loop exists here.
2. **High, observed source limitation:** Default workbench uses StatefulSimulationClient with scripted model_id sim-scripted-v1. Separate PracticeApp uses static catalogs, localStorage/BroadcastChannel, and browser answer keys/grading. Both are useful prototypes; neither currently delivers trusted live assessment.
3. **High, source-derived failure:** contractAdapt.ts adaptSnapshot always sets declaration=null, applied_actions=[], verification=null, last_ai_decision=null, scenario clock=0, and eli_workflow_healthy=true. useMission.ts discards the returned declaration and requires snapshot.declaration before apply; App.tsx also requires it to render RespondDrawer. Current live path cannot sustain declare-to-contain even after a conforming backend is supplied. Backend execution of this path remains unverified.
4. **High, observed:** Live mode polls every 1500 ms; no SSE/EventSource subscription, Last-Event-ID backfill, or event-page cursor loop is implemented. begin/reset hard-code practice; assessment protections in helpers are not a complete selectable assessment product.
5. **High, observed contract mismatch:** Canonical EventEnvelope forbids unknown fields and has no network block, while the teaching signal relies on changed source IP/user agent. Reconcile pending network/AI telemetry requests before connecting live UI.
6. **High, source-derived scoring/continuity mismatch:** Canonical scenario requires Eli's benign workflow only; disabling Maya should not break Eli. Simulated verification instead fails its benign check when Maya is disabled. Add an explicit measurable Maya continuity/recovery workflow or clarify the outcome contract. Simulation recognition/timeliness formulas also differ from rubric.json (for example <=60 s awards 8 in simulation versus 7 in canonical rubric). Freeze one authoritative rubric before live scoring.
7. **Medium, benchmark inference limit:** Paired adaptation fixtures change role, status, and permitted actions together. They show useful bounded response to a changed fixture, not isolated proof of sophisticated strategic replanning or an advantage over a deterministic policy. Add same-role/state-controlled comparisons and actual target-backed episodes later.
8. **Medium, observed:** Evaluation ledgers and packet next steps lag actual shipped contracts/AI/tests. Do not calculate product completion by checked boxes. Native harness pass has narrower scope than the release gates.

### Completion estimate and suggested priorities (not approved implementation scope)

Judgment estimate: approximately 40–45% of the narrow PRD competition MVP, not an industry-ready release or percent of elapsed engineering effort. A midpoint weighting is contracts/scenario 10% x 85%, isolated AI 20% x 80%, frontend 20% x 80%, target 20% x 0%, control/integration 25% x 5%, release verification 5% x 25% = approximately 43%. These estimates have substantial uncertainty and apply to this checkout only.

Highest immediate return: implement one real target access/revoke/denial/continuity proof (Saad S2), add trusted orchestration/storage/scoring/reset (S3/S4), integrate Tanvir's existing choose_action, and correct Ahnaf's live snapshot/streaming boundaries. Then verify the full browser loop, isolation, reset x10 and evidence integrity.

Longer-term product hypotheses, in order: meaningful bounded scenario variation and fair pressure; evidence-linked debrief/competency reporting; small instructor/cohort assignment/export workflow; repeatable local deployment and measured resource cost; authentic tool workflow integrations after the core works. Validate instructor adoption and learning transfer in pilots before expanding into broad scenario authoring or enterprise infrastructure. No ROI percentage or educational benefit has been measured.

**Next action:** Present assessment to Ahnaf. On implementation authorization, reconcile the network, snapshot, rubric, and continuity contract gaps and start Saad S2 with a target before/after revocation test. The existing Log Management review gate remains in effect for Endpoint, Email, and Monitoring UI edits.

### Checkpoint result

The mandatory harness_sync.py update wrote Ahnaf's tracked context/packet/index and checkpointed master-integration and ahnaf-lead-ux, then failed while resuming Tanvir because tests/agent is directory-valued evidence. The script's existing checkpoint_task_in_harness function was invoked directly for Ahnaf as a scoped fallback; no application or harness code was changed. Final check run/evaluate receipts cover the resulting snapshot. Other segments' full checkpoint refresh remains blocked by the directory-evidence defect.


## SOC simulator market research — 23 October 2026

Public-source comparison completed across 32 entries spanning SOC simulators, investigation labs, enterprise ranges, emerging AI products, and reusable range infrastructure. Full source matrix: docs/product/SOC_SIMULATOR_FEATURE_RESEARCH.md. This is a documented-capability review with sampled customer feedback, not authenticated validation or proof of exhaustive market coverage. No application code changed.

CybExer/armasuisse explicitly describes the adaptive AI adversary as in development; HTB AI Range Enterprise launched 6 October 2026 for evaluating organization-provided agents and human oversight. Neither finding alone demonstrates a generally available human-trainee SOC with an unconstrained live LLM attacker. Reflex is adaptive crisis roleplay, while CYBER RANGES documents stateful traffic and conditional attack execution. Keep these categories distinct.

Highest-return implementation proposal remains one target-backed attack/containment/verification loop, followed by run persistence, browser workstation access, deterministic evidence-linked scoring, role-based handoff, and reusable scenarios. Browser access can use a run-scoped Guacamole/Kasm gateway; this is a proposed architecture, not an assertion about competitors' private stacks. Instructor adoption, learning transfer, commercial ROI, and resource cost remain unmeasured. Current Log Management review gate and canonical-contract requirements remain in force.

Public evidence gaps suitable for recordings: HTB Threat Range/AI Range complete analyst-to-DFIR loop; enterprise VM/reset/instructor flows in Immersive, Cyberbit, SimSpace and Cloud Range; Circadence GEN3 and the CybExer pilot; emerging Corevex, CyberTwinX and NightRange claims. Do not infer availability or autonomous behavior from marketing alone.


## Unified live SOC increment — implementation
- Verdict: pass for three live browser journeys at http://127.0.0.1:5176 against actual target/control HTTP services and local Qwen3.
- Browser journey: launch, receive model-linked target activity, pause practice, pin evidence, persist case notes on server, refresh, declare, revoke, verify, debrief and export. Debrief axe serious/critical findings: zero. Assessment is blind and cannot pause; confirmation defaults focus to Cancel. Catalog has no page overflow at 390/768/1440.
- Forty-four existing frontend unit tests and thirty-five canonical contract tests passed. Eight new trusted-control scenarios and five target tests also pass.
- Fixed issues found during browser evaluation: concurrent first-session initialization, implicit labels containing control text, notebook recovery and explicit draft/save status. Tests assert server persistence, not only browser storage.
- Evaluation is a fresh failure-oriented self-review, not independent authorship. Optional desktop/SIEM/VM execution, multi-route adaptation benchmark, broader scenarios and full instructor/team authoring remain unverified or incomplete.
- Next: finish optional tool provider and validate multi-route adaptation before expanding content.


## 2026-10-23 — Original console restoration review
- Verdict: PASS for the requested UI restoration and preservation of additive live features. Baseline is d93b640 (the committed accepted console); HEAD~1 contains no web app, while the unwanted replacement was uncommitted.
- Fresh review lens: verify baseline fidelity, navigation discoverability, preserved server authority and honest VM status rather than treating compilation alone as evidence. Monitoring, Cases, Playbook, ExtSites and console CSS match the baseline exactly; Tools differs only at the Sandbox replacement. The mission uses a baseline inspector copy while the live inspector additions remain intact. Original landing is the default; live missions require explicit #/live routing. New training/tool views remain available.
- Evidence: production build/typecheck and 53 Vitest tests passed; original console/mission E2E 10/10 passed; restoration/Windows compatibility E2E 3/3 passed; actual isolated live evidence-containment-recovery-debrief, blind assessment, catalog and progress E2E 4/4 passed. Serious accessibility checks in the original/live workflows passed. Log Management at 1440x900 was visually inspected. Assistant model inference was not rerun because its implementation was unchanged.
- Harness run/evaluate PASS at source snapshot 4b9530c619aa6463ca6cab596ba9f214f7eae97d8b28d93cf97883a51d273ddf; 269 Python tests and 18 subtests passed.
- Remaining limitation: actual Windows OS boot requires the prepared BIOS/IDE qcow2 base. Old running Linux workers are blocked by the new UI until restarted; they cannot be displayed as Windows. See docs/product/WINDOWS_VM.md and Saad evaluation.


## 2026-10-23 — Shared navigation consistency fix
- Verdict: PASS. Fresh evaluation lens: compare the actual header/sidebar DOM, icon classes, link order, active-route markers and measured bounds when crossing practice/live boundaries; verify links remain reachable on narrow screens and run controls retain server/assessment restrictions.
- Root cause: LiveSocApp duplicated the original header/sidebar, substituted Shield for every original tool icon, omitted My training from its sidebar, renamed other links and applied a second set of navigation dimensions/mobile rules.
- Fix: both page types use the original TopNav/SideNav components. Shared training links are declared once; contextual run/debrief links are additive children. Live status/clock/pause/end moved into a separate content toolbar. Removed live-only navigation and mobile overrides; common styles handle horizontal mobile navigation and persisted collapse consistently. Original SOC page bodies and backend behavior are unchanged.
- Evidence: production build and 53 Vitest tests pass. Navigation/restoration Playwright 8/8: all four added pages retain identical header links and original tool icons/labels/order/sidebar bounds, run pages retain global links, active markers and collapse persist, 320/390/768 navigation remains reachable without page overflow, shared navigation has no serious/critical axe violations. Actual original phishing workflow and live evidence/refresh/containment/debrief, blind assessment, responsive catalog and progress checks 5/5 pass. Desktop Sandbox/My progress screenshots inspected at 1440x900.
- Harness run/evaluate PASS at source snapshot 6f80b9b8edf569126c45b80abd8f08aa5a31fe554ae686b35e71368afe666451. No unresolved navigation findings. Windows image provisioning remains the previously recorded independent blocker.


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
