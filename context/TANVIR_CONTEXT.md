<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py — DO NOT DELETE SECTIONS -->
# Live Context & Instant Takeover Packet: `tanvir-red-agent`

| Field | Value |
|---|---|
| **Segment / Task ID** | `tanvir-red-agent` |
| **Assigned Owner** | Tanvir (Local AI Red-Team Engine Owner) |
| **Active Lifecycle Phase** | **`EVALUATE`** (`PLAN` → `IMPLEMENT` → `EVALUATE`) |
| **Primary Handover Spec** | `Tanvir.md` |
| **Task Contract (`harness-plan`)** | `context/contracts/tanvir-red-agent.contract.md` |
| **Evaluation Record (`harness-evaluate`)** | `context/evaluations/tanvir-red-agent.eval.md` |
| **Checkpoint JSON Mirror** | `context/packets/tanvir-red-agent.json` (mirrored to `.harness/contexts/tanvir-red-agent.json`) |
| **Owned Directories** | `services/red-agent/`, `tests/agent/`, `docs/model-card/` |

---

## 1. Instant Takeover Protocol (For Ahnaf or Any AI Agent)

If the current owner is blocked, offline, or switching AI sessions, run these **3 commands** to take over this segment with 100% context in under 5 seconds:

```bash
# 1. Reconcile harness checkpoint with current git tree & verification status
python3 scripts/harness_sync.py takeover --task tanvir-red-agent

# 2. Native harness resume for this task packet
harness context resume /home/ahnaf-zakaria/Downloads/Cydeline --task tanvir-red-agent

# 3. Run project-native verification checks
harness check run /home/ahnaf-zakaria/Downloads/Cydeline
```

---

## 2. Current Objective & Immediate Next Action

- **Goal:** Deliver the bounded local AI adversary service (services/red-agent/), two-stage safety validator, and empirical benchmark suite (tests/agent/, docs/model-card/).
- **IMMEDIATE NEXT STEP (`next_step`):**
  > **Read KNOWN_ISSUES.md and the saved denied/unknown traces. Evaluate capability under a declared model/hardware or policy decision before another full matrix; preserve all failures, budgets, validation and independent review. Do not resume blind prompt retuning.**

---

## 3. Real-Time Execution Progress

### Completed Work (`completed`)
- [x] Defined Tanvir's role, deliverables, and parallel workflow in Tanvir.md
- [x] Frozen starter runtime prompt in 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md and contract in context/contracts/tanvir-red-agent.contract.md
- [x] Increment B1 (SL-003) complete: services/red-agent/ schemas.py, observation.py, validator.py, fallback.py implement the strict 5-field proposal schema, sanitized 10-field observation builder, 2-stage validator (JSON schema + role/action/handle allowlist) and bounded timeout with fallback_used tagging; 99 unit tests in tests/agent/ pass with 0 accepted violations across a 29-case adversarial corpus
- [x] Increment B2 code complete and offline-verified: services/red-agent/prompts.py (shared safety policy + scout/access_operator/adaptation_planner instructions + additionalProperties=false structured-output schema), ollama_client.py (/api/tags + /api/chat over urllib with injectable transport, layered socket-vs-service timeout), service.py (choose_action(run_id, role, observation) with run/role scoping checks, model_id/prompt_hash/observation_hash/model_latency_ms provenance, async wrapper). tests/agent/ now 134 tests pass; real daemon health() reachable in 10.4 ms and correctly reports model_present=false
- [x] B2 live half closed on real hardware: pulled qwen3:1.7b (Q4_K_M, 1.4GB). Default Qwen3 thinking spent the entire 180-token budget on reasoning and returned empty content (done_reason=length, eval_count=180). Fixed ollama_client.py to send think=false by default (OLLAMA_THINK opt-in) and to record done_reason + thinking_chars provenance; 10/10 live decisions accepted, 0 fallbacks, cold 9.44s after an explicit unload, warm median 4.60s / p95 5.51s.
- [x] Increment B3 complete: services/red-agent/benchmark.py (30-trial schema corpus, 10 paired pre/post-containment trials, zero-out-of-policy gate, median/p95 latency, JSON + Markdown evidence), docs/model-card/MODEL_CARD.md, docs/model-card/BENCHMARK.json, tests/agent/test_benchmark.py. Live run PASS: 29/30 schema-valid (>=28), 9/10 adapted (>=8), 0 accepted out-of-policy; 153 unit tests pass. The single schema failure was adaptation_planner proposing request_document, correctly rejected by the role ceiling and replaced by a tagged wait fallback; one pair repeated a status probe and is reported as not adapted.
- [x] Added root .gitignore (contract request fulfilled, authorized by the human): ignores __pycache__/*.pyc, .commandcode/, Python and JS build/cache artifacts, Playwright reports, SQLite WAL files and .env. Verified with git check-ignore; git status now shows only real deliverables.
- [x] Reconciled Saad's Increment S1 (contracts/ + scenarios/ now on disk; no API changes to red-agent). Added services/red-agent/contracts_adapter.py: the only module importing contracts/, with assert_vocabulary_parity() (AttackerAction, Role, SessionStatus, AccessOutcome, opaque-handle grammar, required-handles map), to_attacker_proposal()/from_attacker_proposal() round-trip, and to_agent_decision_record() covering accepted, policy-rejected and timed-out turns with required provenance and 1000-char rejection cap. Core modules remain stdlib-only; without Pydantic every adapter call raises ContractUnavailable. Added tests/agent/test_contracts_adapter.py (11 tests). Verified: 164 tests OK bare (9 adapter/parity tests skipped), 164 OK with isolated pydantic 2.14.1; compileall clean.
- [x] The existing v1 RedAgentService, frozen schema and validator remain intact. The live adapter selects v2 context then uses the local Qwen3:1.7b structured action path. The actual v2 full objective proof reached one target-audited read with zero fallback; fresh paired route selection passed 10/10. No isolated “independent review” claim is made. See docs/product/HANDOFF_2026-10-22.md.
- [x] Live v1/v2 bridge now uses current-turn constrained output schema plus independent policy validation. Actual first Qwen turn reached target; observed older v1 policy rejection correctly system-paused instead of executing fallback. 173 focused native tests and 18 subtests pass.
- [x] Twelve real-model early-containment/pivot journeys recovered, 24 accepted decisions, 16 audited inspections, 8 stops, no fallback. v5 coach 59/60 supported, p95 11885ms; one unavailable 62066ms timeout retained. Prior v4 latency/relevance failures and all raw attempts preserved. Semantic utility and broader model objective reads remain unverified.
- [x] Current discovery/alias/pacing source independently reviewed;74learning/API tests pass. Firstobjective matrix10/12and all targetedfailedtraces preserved. Neutral aliases preserve everyroutechoice, and actual target permission observations drive model context.
- [x] V8 constrained coach 60/60, p95 2403ms and all 136 supports independently verified. Final selector uses thinking disabled, 80 tokens, temperature 0.1 within 30s; completion failures retain diagnostics and cannot invoke actions. Full objective gate FAIL: 10 passed, 2 failed; early containment 12/12 passes but post-response actions are only wait/stop. All actual model/target provenance and pacing independently verified; zero executed fallback.

### Remaining Work (`remaining`)
- [ ] Resolve AI-LEARN-01: both Reporting service-dependent repeats fail adaptation; final full objective gate is 10 passed / 2 failed.
- [ ] Qualify representative browser-load coaching latency (AI-LEARN-02); retain the 51989ms live turn alongside isolated p95 2403ms.

### Active Blockers (`blockers`)
- AI-LEARN-01 remains open: full twelve-journey objective acceptance failed; both Reporting service-dependent trials repeatedly select known-denied access.

### Open Uncertainties / Assumptions (`uncertainties`)
- Final current-source objective matrix and v8semantic measurement are pending. Existing CPU evidence uses Qwen3:1.7b Q4_K_M on i5-1235U,12logicalCPUs,~16GBRAM; unsupported generalization remains prohibited.
- User explicitly chose Leave the pilot kit ready on 24 October 2026; actual participant usefulness, transfer and delayed retention remain unobserved future work.


---

## 4. Full Harness Lifecycle Plan (`Plan` → `Implement` → `Evaluate`)

### Phase A — `harness-plan` (Architecture, Contracts & Decisions)
- Freeze AttackerProposal JSON schema, 6 allowed AttackerAction enum values, 3 sequential logical roles (scout, access_operator, adaptation_planner), and sanitized observation input contract
- Review 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md and context/contracts/tanvir-red-agent.contract.md

### Phase B — `harness-implement` (Bounded Vertical Increments)
- Increment B1 (SL-003): Build services/red-agent/ schemas, sanitized observation builder, 2-stage validator (JSON schema + role/action/handle allowlist policy validator), and deterministic timeout fallback with fallback_used=true tagging
- Increment B2 (FR-B01/B02/B05): Connect Ollama client (Qwen3-1.7B Q4 candidate) with role-specific prompts for scout, access_operator, and adaptation_planner, recording model_id, prompt_hash, observation_hash, and latency_ms
- Increment B3 (SL-007/SL-013): Wire choose_action() and validate_action() into Saad's apps/control-api/ turn scheduler and run the 30-trial + 10-pair benchmark suite into docs/model-card/

### Phase C — `harness-evaluate` (Independent Verification & Release Gates)
- Verify T-01 & T-03: Run validator fuzz and prompt-injection tests in tests/agent/ — require 0 accepted out-of-policy actions, unknown handles, shell strings, or URLs
- Verify H1 (Autonomy & Adaptation): Run 30 observation trials (target >=28/30 valid schema) and 10 paired pre/post-revocation trials (target >=8/10 meaningful adaptation or stop)
- Verify AT-05 (Fallback Provenance): Force model timeout and malformed JSON; verify run continues safely and logs fallback_used=true
- Run fresh independent harness-evaluate review and record verdict in context/evaluations/tanvir-red-agent.eval.md


---

## 5. Accepted Task Contract Summary & Key Decisions

### Observable Acceptance Criteria (`acceptance`)
- FR-B01/B02: Single local quantized model (Qwen3-1.7B Q4 via Ollama) operating sequentially as scout, access_operator, and adaptation_planner
- FR-B03/B04: Two-stage validator enforces strict JSON schema and allowlisted actions/handles (0 out-of-policy actions accepted)
- FR-B05: Post-revocation observation causes adaptation_planner to change action or select stop in >=8/10 paired trials
- FR-B06: Timeouts and invalid outputs recover cleanly via explicitly tagged deterministic fallback (fallback_used: true)

### Consequential Decisions (`decisions`)
- Use one shared Ollama model instance prompted sequentially across 3 logical roles rather than parallel multi-model swarm
- Enforce a strict two-stage validator (Pydantic/JSON schema + run-policy allowlist) independent of LLM prompt adherence
- Tag any timeout or invalid-output recovery with fallback_used=true so demo provenance is 100% transparent
- Contracts boundary is a separate adapter module: core red-agent modules stay standard-library-only so offline tests and benchmarks run without Pydantic; contracts_adapter is the single import seam for apps/control-api
- User deferred actual participant sessions; preserve the blank pilot kit and do not fabricate study outcomes.

### Architecture Entry Points (`architecture`)
- Tanvir.md
- 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md
- 05_OWNER_B_LOCAL_AI_RED_TEAM.md
- context/contracts/tanvir-red-agent.contract.md
- services/red-agent/
- tests/agent/
- docs/model-card/
- docs/product/BEGINNER_LEARNING_PLAN.md
- docs/product/BEGINNER_LEARNING_HANDOFF.md

### Verified Evidence Files (`evidence`)
- .gitignore
- 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md
- 05_OWNER_B_LOCAL_AI_RED_TEAM.md
- Tanvir.md
- context/contracts/tanvir-red-agent.contract.md
- context/evaluations/tanvir-red-agent.eval.md
- docs/demo/learning/final-v8/receipt.json
- docs/model-card/BENCHMARK.json
- docs/model-card/MODEL_CARD.md
- docs/model-card/learning/COMPOSE_ISOLATION_FINAL_CURRENT.json
- docs/model-card/learning/INDEPENDENT_REVIEW_2026-10-24.md
- docs/product/BEGINNER_LEARNING_HANDOFF.md
- docs/product/KNOWN_ISSUES.md
- services/red-agent/README.md
- services/red-agent/benchmark.py
- services/red-agent/contracts_adapter.py
- services/red-agent/ollama_client.py
- services/red-agent/prompts.py
- services/red-agent/service.py
- tests/agent/test_benchmark.py
- tests/agent/test_contracts_adapter.py
- tests/agent/test_fallback.py
- tests/agent/test_observation.py
- tests/agent/test_service_and_prompts.py
- tests/agent/test_validator_and_roles.py


---

## 6. How to Update This Context in Real Time After Any Edit

Whenever you complete an increment, hit a blocker, or finish an evaluation on `tanvir-red-agent`, run:

```bash
python3 scripts/harness_sync.py update \
  --task tanvir-red-agent \
  --phase IMPLEMENT \
  --complete "Describe the completed increment and test run" \
  --next-step "Describe the exact next atomic task"
```

This single command atomically updates `.harness/contexts/tanvir-red-agent.json`, `context.md`, `context/packets/tanvir-red-agent.json`, `context/TANVIR_CONTEXT.md`, and `context/INDEX.md`.
