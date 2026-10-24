# Beginner learning delivery plan

Accepted input: [original supplied plan](BEGINNER_LEARNING_SOURCE.md). This record supersedes the obsolete Stage 1 next actions in the initial contracts. Preserve the accepted console, two scenario cards, local attacker, server authority and canonical enums.

## Recovery boundary — 23 October 2026

The last saved master packet (revision 37) stopped in M0. Source inspection recovered additional uncheckpointed M1–M3 work: `services/range_runtime/learning.py`, `variants.py`, six manifests, coaching contracts/API and `Worksheet.tsx`. These were partial implementations, not completed or evaluated milestones. Preserve all earlier dirty files; no reset, cleanup or commit was requested.

Baseline: 277 backend tests +18 subtests passed, one assistant output-budget regression; 53 frontend tests and production build passed. Current-window occupancy telemetry is unknown. See the evaluation ledger and live master packet for subsequent results.

## Requirement → contract → implementation → verification

All requirements inherit the accepted beginner amendment in [master contract](../../context/contracts/master-integration.contract.md) and the Ahnaf/Saad/Tanvir companion contracts.

| Milestone | Required behavior | Implementation entry points | Required proof |
|---|---|---|---|
| M0 reliability | Terminal records remain authoritative; later responses invalidate verification/report completion; drafts remain scoped to run and analyst | `casework.py`, `engine.py`, `LiveCases.tsx`, `RunContext.tsx` | consolidation/reliability tests, browser journeys |
| M1 orientation | Company briefing, explicit paused coached start, three optional authored exercises, autosaved worksheet | `learning.py`, `api.py`, `LearningViews.tsx`, `Worksheet.tsx`, `UnifiedConsole.tsx` | pacing, authorization/revision tests; refresh/disconnect/conflict/navigation browser checks |
| M2 coach | Explain/Nudge/Guide, exact source excerpts, bounded retries, disputes, assessment restrictions | `assistant.py`, `api.py`, `AssistantPanel.tsx`, `logic.ts` | 60 categorized adversarial cases, real model quality and latency; p95 ≤15 seconds |
| M3 variation | Three meaningful configurations per scenario, causal debrief, evidence export, another variation | variant manifests, `target.py`, `variants.py`, `learning.py`, debrief | target policy/workflow tests; 12 genuine model journeys and paired intervention checks |
| M4 pilot | Counterbalanced baseline/coached/independent/follow-up study, six-skill 0–2 rubric | pilot protocol and observation records | eight actual beginners, two actual experts, one-week follow-up; no fabricated findings |

## Form and recovery behavior

- Launch: two cards; practice/assessment and published variation choices. Assessment forces blind assistance; coached practice starts paused until **Begin investigation**. Independent practice starts immediately. Readiness failures retain settings and permit retry.
- Worksheet: optional six-part worksheet (supporting and contradicting evidence have separate fields). Each field ≤4000 characters, ≤100 released run event links. Analyst/run/tab-scoped recovery copy persists until acknowledged. Revision and save identifier protect concurrent edits and ambiguous retries. Show Saving, Saved, Reconnect required, or a comparison conflict; no silent overwrite. Terminal view shows server record and labels any unsynchronized copy separately.
- Closure/report: existing server revision and playbook gates remain authoritative. Editable report and submitted terminal report remain distinct. Authenticated ownership changes cannot import another analyst's local draft.
- Coach: evidence selection and question (≤1000 characters), assistance level, exact event fields or report/reference excerpts. The question retrieves an authored concept for local model selection; server code attaches exact released values and the authored explanation. Raw log/report values are not sent to the model. Free-form factual premises and containment commands are not renderable. This constrained coach is not a validated free-form tutor. Model failure retains question and references. No practice score deduction.
- Dispute: status plus explanation (1–2000 characters), saved against the recorded answer and analyst; terminal material is read only. Every factual claim retains exact source support and evidence revision.
- Accessibility: native labeled controls, visible status text, keyboard operation, semantic fieldsets; preserve existing visual tokens. Check 320/390/768/1440 widths, zoom and reduced motion. Automated checks do not establish full WCAG conformance or beginner usability.

## Release boundaries

Fresh independent evaluation is required. Harness command receipts supplement, and do not replace, semantic review. Keep failed runs and unavailable gates. Seed reproduces initial configuration, while replay uses stored decisions/actions/audits. No new orchestration framework, Windows installation, extra attack family, multiplayer or institutional administration in this increment.

M4 cannot be completed by code or synthetic test participants. Engineering passing results do not prove learning effectiveness or professional readiness.


## Current finishing increment

The coach now retrieves authored concepts from the learner question and asks the local model to choose only among those relevant concepts. It mechanically attaches exact released evidence and authored explanations; this is reference retrieval with local AI selection, not unconstrained model reasoning. The semantic evaluator has sixty distinct questions with explicit acceptable concepts, repeated baseline events and populated worksheet fields. It checks both conflicting outcomes, changed sources and a requested handoff excerpt. These questions retrieve singleton choices: the test does not demonstrate model topic discrimination. Preserve the previous v5 source-valid but irrelevant results. Current CPU attacker review budget is 30000ms; the selector uses the same configured per-call timeout with thinking disabled and an 80-token cap. Timeout still system-pauses without substitute execution.

Current container isolation proof uses a unique disposable Compose project and a Docker-bridge-only genuine Ollama readiness relay restricted to GET /api/tags. It leaves coached runs paused. This proves target/control hardening and egress, without claiming model-container isolation. The first readiness-race failure is preserved; the corrected receipt passes 58/58 checks.

The first objective matrix reached 10/12 objectives, exposing both missing permission discovery and model decision failures in Reporting variation 3. Subsequent failures remain recorded. Current attacker observations cache actual successful target document lists; 403 does not imply session revocation. A complete neutral alias mapping reduces handle-name bias while leaving every route available to the model. Both generation and execution enforce the existing route count/time windows. Fresh target-observation guidance addresses waiting without inventing events. No budget, pacing or action-policy acceptance was relaxed. See the handoff for the current full-matrix result.

The same local model’s reasoning-mode selector passed four difficult observed-context diagnostics (including both unknown/denied orders and all-blocked stop). The ordinary local launcher and Compose now default to the declared 30000ms CPU setting, preserving explicit overrides. The low-level model client still defaults to 10000ms when used directly. Each sequential call has its own budget and the existing HTTP socket allowance adds two seconds. The final full matrix, not the diagnostic alone, decides acceptance.

Final completion-setting check: one exact unknown-permission context returned correct final JSON in 2472ms with thinking disabled, compared with a 32032ms timeout when enabled. The earlier reasoning-mode diagnostic success did not generalize: preserve the 11/12, 7/12 and interrupted runs. Completion metadata is now retained; empty final output fails closed before action inference. A fresh complete matrix, rather than this isolated diagnostic, decides acceptance.
