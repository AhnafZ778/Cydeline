# Tanvir — AI, adaptation and learning-quality handoff

**Updated:** 27 October 2026 (Asia/Dhaka)
**Primary owner:** Tanvir · **Runtime/integration partner:** Saad
**Task:** `tanvir-red-agent` · [Live context](context/TANVIR_CONTEXT.md) · [Contract](context/contracts/tanvir-red-agent.contract.md) · [Evaluation ledger](context/evaluations/tanvir-red-agent.eval.md)

## Start here: Ahnaf is unavailable

Ahnaf has carried the implementation to the current published baseline. Continue from the existing product; do not rebuild completed foundations or wait for Ahnaf to integrate your work. Tanvir owns the AI and learning-quality work below. Saad owns infrastructure, trusted authority, integration and the remaining frontend/observer work in [Saad.md](Saad.md). **Leave `Ahnaf.md` unchanged.** Coordinate through the shared contracts and durable context, not assumptions about work someone else will finish.

This handoff supersedes this file's original Day-1 checklist, legacy fallback suggestion and narrow adaptation benchmark. It does not change canonical enums or authorize external effects. The complete backlog is [REMAINING_WORK.md](docs/product/REMAINING_WORK.md); the expanded specification is [AI_OBSERVER_RANGE_PLAN.md](docs/product/AI_OBSERVER_RANGE_PLAN.md).

## Resume without previous chat history

```bash
python3 scripts/harness_sync.py status
python3 scripts/harness_sync.py takeover --task tanvir-red-agent
harness context resume . --task tanvir-red-agent
git status --short
```

Read this file, your live context/contract, [KNOWN_ISSUES.md](docs/product/KNOWN_ISSUES.md), the saved model evidence and [Saad.md](Saad.md). Inspect actual source before editing; retain unrelated changes. Published baseline: `c478529` on `chore/publish-workstreams`; later commits may supersede it.

## Already implemented — preserve and use

- Two real local-AI scenarios: The Stolen Session and The Reporting Blind Spot, including versioned variants, target access checks, response/recovery, evidence/cases, authoritative scoring and replay.
- Local model bridge, observation/schema/policy validation, grounded coaching, worksheets, assistance modes, disputes and model proof scripts.
- Restricted live AI observation for instructors/assigned observers, actual prompt/final-output/validation/target correlation, optional masked exercise-tab/cursor capture and trainee own-terminal review.
- Installed networkless Windows workstation base; lean training UI, separate instructor mode, loopback-only password-free local testing and wide scrollable briefings. These are completed engineering slices, not complete B/C or model-quality acceptance.
- Recorded engineering baseline: **400 backend tests + 18 subtests, 54 frontend tests, production build and native Harness pass**. Full lean browser 34 + observer 2 and later briefing-focused 15 / independent 11 are separate recorded checks; do not present them as one new full end-to-end run.

## Ahnaf's unfinished responsibilities transferred to you

This is an explicit transfer of the unfinished learning, integration and demo duties in [Ahnaf.md](Ahnaf.md) §2A/§2C and checklist items 7–8, plus [the original defender UX/QA/demo workstream](07_OWNER_D_DEFENDER_UX_QA_DEMO.md). **You own the items below; none waits for Ahnaf.** Saad owns the corresponding engineering, browser QA and recording deliverables listed in his handoff. The original unchecked boxes for frontend setup, seven screens and live API/SSE wiring describe foundations already implemented; do not restart them.

- [ ] **Integration sign-off partner (T1/T3/T6; Saad leads):** supply versioned model/proposal/observation fixtures and genuine, correlated model → target → visible event → containment → next model observation evidence. Verify denied compromised access and successful legitimate work together. Resolve the current adaptation failure before claiming that the final demo proves reliable adaptation. Keep shared contract changes and gate evidence in the repo.
- [x] **Learner understanding and educational review (T2/T7):** review whether released evidence supports at least two investigation pivots, defensible containment, both recovery checks and understandable score/replay explanations. Document accepted alternative reasoning and coach/scenario limitations; provide Saad actionable copy or workflow findings. Preserve server-owned scoring and assessment restrictions. A working screen or test is not proof beginners understand it.
- [x] **Usability and study readiness (T7; Saad supplies the environment):** maintain facilitator prompts, confusion/timing/completion capture and the six-skill rubric for the existing eight-beginner/two-expert pilot. Fold the original suggested 3–5 first-time walkthroughs into that protocol rather than inventing another completed study. Actual recruitment, participant sessions and delayed follow-up remain user-deferred; leave the kit ready and outcomes blank.
- [x] **Demo explanation and evidence pack (T6/T7; Saad produces the recording):** update [DEMO_SCRIPT.md](docs/demo/DEMO_SCRIPT.md) with the actual local model/tool boundaries, causal adaptation/containment evidence, deterministic score explanation, measured test results and known failures. Supply accurate model/architecture details, brief narration and model-card limits for the three-minute video. Verify research/source identifiers behind educational claims; do not invent market, learning-effectiveness or retention figures. Distinguish script readiness from a completed recording.
- [x] **Final AI/learning release review (T1/T2/T6/T7):** give Saad a reproducible qualification summary bound to source/model/configuration, including all failed or unavailable gates. Review the final demo's AI claims against that evidence; label any prerecorded footage accurately and never imply substitute execution occurred live. Preserve the 10/12 objective failure and 51989 ms live coaching tail until their respective measured gates are closed.

Completion is documented evidence plus a durable context update, not an assumption that Ahnaf will review it later. Saad's transfer checklist covers the remaining frontend, manual accessibility, final browser regression, integration coordination and video/submission preparation.

## Your remaining work, in dependency order

### T1 — Fix and prove attacker adaptation (P0)

**Open failure:** full objective matrix **10/12, FAIL**. Both Reporting service-dependent repeats keep choosing a known-denied/unknown path and fail to discover the independent credential route within the existing budget. Early containment, valid JSON, waiting, stopping or a single successful model call does not close this gate.

- [ ] Inspect the exact denied/unknown-permission observations and saved traces before changing prompts or models. Evidence: `docs/model-card/learning/2026-10-23T18-40-21.322575Z-objectives/summary.json` and the diagnostic paths in `KNOWN_ISSUES.md`.
- [ ] Establish a bounded capability diagnosis, pin prompt/schema/model/configuration and record the change in the contract. Current Qwen3:1.7b selector uses thinking disabled,80 output tokens,temperature 0.1 within 30 s; action generation130 tokens,temperature 0.7. These are a baseline, not a required solution.
- [ ] If evaluating a larger local model, coordinate capacity with Saad first. Qwen3:8b non-thinking is the accepted expanded qualification candidate, not a proven fix. No cloud fallback or unbounded prompt/model search.
- [ ] Rerun **all12 objective journeys** (two scenarios × three variants × two repeats) and paired interventions with real target/audit correlations, unchanged existing twelve-step/signal budgets and zero substitute execution. Save every failure and hash/configuration; do not overwrite failed evidence.
- [ ] Obtain fresh independent evaluation of a supported change. Update the model card and current issue status only when the full applicable gate passes.

**First atomic action:** evaluate the saved service-dependent denied/unknown observation and explain the model choice with reproducible input/output evidence; do not immediately launch another expensive full matrix.

### T2 — Qualify coaching latency and answer quality (P0)

- [ ] Preserve the successful **51989 ms live Guide answer**, separately from the isolated 60-case benchmark (p95 2403 ms); neither replaces the other.
- [ ] With Saad, measure the actual trainee/browser/Windows/AI/capture workload on declared hardware. Record latency distribution, timeouts, memory/swap pressure and competing requests; qualify the existing coaching **p95 ≤15 s** target.
- [ ] Preserve finite grounded teaching, released-evidence citations, Explain/Nudge/Guide distinctions, uncertainty, disputes and assessment restrictions. Do not introduce fabricated advice or hidden scenario answers to improve speed.
- [ ] Re-run semantic/adversarial coaching checks after changes. Hand Saad reproducible benchmark inputs, results, service behavior and any UI/error-state implications.

### T3 — Expanded model and tool contract with Saad (after B capacity is qualified)

- [ ] Pin the model digest, prompt/configuration, scenario manifests and sanitized observation format. The model sees target-returned evidence only; tool replies are data, not instructions that enlarge authority.
- [ ] Keep the current six-action baseline compatible. Any scripts/mail/difficulty additions require versioned schemas/capability extensions and updates to `contracts/` and the master contract before implementation; do not silently alter the frozen canonical enums.
- [ ] Emit proposals and brief **AI-stated intent**, never private chain-of-thought or invented narration. Preserve rejected/time-out/stale records, actual final replies and exact dispatch/audit links. Saad owns authorization, budgets, execution and scoring.

### T4 — Continuous timed opponent and difficulty (C; after B passes)

- [ ] Generate only the capabilities Saad's server permits: Easy reviewed session/document tools; Medium adds reviewed Reporting; Hard adds reviewed restricted scripts/internal training mail.
- [ ] Respect one in-flight model/job and the shared target-operation budget: Easy ≤1/10 active seconds, Medium ≤1/5, Hard ≤1/3; nested script/mail operations are not exemptions. These are ceilings, not guaranteed inference throughput.
- [ ] Treat wait/stop as a yielded turn in the new timed mode, not an early end. When all routes are blocked, continue permitted observation turns every 15 active seconds until the trusted deadline. Never revive revoked access or manufacture activity.
- [ ] Demonstrate real model-selected adaptation from observed results, including a feasible unknown alternative after a blocked route. Saad's authority decides effects, clock, breach and results.

### T5 — Real restricted-script and internal-mail generation (Hard only)

- [ ] Generate source for Saad's finite Python-shaped AST interpreter and plain-text mail for the fictional approved roster. Code/email in the observer must be actual artifacts of actual jobs/deliveries, not animated typing.
- [ ] Use exact brokered `lab.<tool>` calls and reviewed in-lab links. Never generate an unrestricted terminal, imports/loops/reflection/files/process/socket operations, arbitrary recipients/URLs, attachments, external delivery or credential collection.
- [ ] Work within16 KiB source,8 leaf tool calls/job,30 s wall time and the interpreter's CPU/RAM/scratch/output/channel bounds; at most3 mail deliveries/round. Saad enforces every bound independently.
- [ ] Add adversarial proposal/output tests, truthful rejection/status behavior and quality cases for quarantine/link blocking/account disable/reauthentication. A click is not itself a loss; only a later authorized-handler objective read can establish breach.

### T6 — Genuine expanded-model acceptance and evidence

- [ ] Run real 15 active-minute qualification across **three seeds per difficulty**, coordinated with Saad's complete host load. Required cases: no-defense objective; blocked route with feasible alternative for Medium/Hard; all-blocked denial until deadline; actual Hard scripts/mail.
- [ ] Meet declared decision **p95 ≤10 s** with 30 s invocation deadline under the full accepted workload. Distinguish this from coaching p95 ≤15 s. Include failures and actual target evidence; no credit for scripted fallback or waits presented as pivots.
- [ ] Correlate model → proposal validation → dispatch → target response → next observation. Provide independent reviewers the exact source/model/manifest/configuration, raw permitted evidence, summary and reproduction commands.
- [ ] Support Saad's causal timed debrief and replay without replacing server verdicts with model judgments. Keep the100-point learning score separate from timed win/loss.

### T7 — Learning evaluation and release handoff

- [ ] Maintain the blank pilot kit and six-skill human rubric; support expert review of coach/scenario realism and accepted alternative reasoning. The eight-beginner/two-expert pilot and delayed transfer/retention observations are **explicitly deferred**; do not fabricate outcomes or recruit/contact people without authorization.
- [ ] Supply Saad with a concise model card, capability limits, failure catalogue, startup/readiness settings and a verified demo narrative. Broader endpoint/phishing families are later roadmap work, not evidence the current two scenarios release endpoint/mail data.
- [ ] Preserve no-fallback live behavior: invalid/time-out outputs record a failure and cause the trusted outage handling; defender-stale proposals are discarded. Do not restore the original handoff's suggested backup attack execution.

## Interfaces, source and working agreement

Main code: `services/range_runtime/agent.py`, `services/range_runtime/assistant.py`, `services/range_runtime/learning.py`, `services/red-agent/`, `contracts/`, `tests/agent/`, `tests/control/test_learning.py`, `docs/model-card/`. Proof/diagnostic entrypoints: `scripts/prove_variant_objectives.py`, `scripts/diagnose_selector_completion.py`, `scripts/evaluate_coach_semantics.py`, `scripts/prove_observer.py`; inspect `--help` before a new run.

Agree schema/observation/capability changes with Saad before editing shared files. Keep one owner per change to `contracts/`, `services/range_runtime/` and frontend files. Send the documented change/evidence through the repo; this handoff does not itself authorize messaging other chats or people. Saad is the integration contact while Ahnaf is unavailable.

## Checks and durable handoff after every meaningful increment

```bash
.venv/bin/python -m pytest tests/agent tests/control/test_learning.py tests/control/test_observer.py -q
npm --prefix apps/web run typecheck
python3 scripts/harness_sync.py update --task tanvir-red-agent --phase IMPLEMENT \
  --complete "Exact completed change and measured evidence" \
  --next-step "Next atomic action, remaining failure or dependency"
harness check run .
harness check evaluate .
```

Use Plan→Implement→Evaluate proportionally and a fresh independent evaluator for material model/policy changes. Publish code, tests, reports and tracked context to the existing feature branch only when verified; keep model weights, private transcripts/keys, runtime images and video recordings outside Git. Never mark the full product or a failed model gate complete because engineering tests pass.
