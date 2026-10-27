# Task contract: Tanvir — Local AI Red-Team Engine (`tanvir-red-agent`)

## Current increment: approved observer and bounded opponent design (24 October 2026)

Follow `docs/product/AI_OBSERVER_RANGE_PLAN.md` and its independent decision/review log. Design arbitration APPROVED, not a model/runtime pass. Milestone A records actual sanitized model inputs/config/schema/final output, short labeled AI-stated intent and exact decision/action/audit links without private reasoning or extra narration calls. Preserve the failed 1.7b 10/12 objective gate, unproven pivots and live latency tail. In C, implement separate versioned difficulty/tool proposals, restricted script/internal mail capabilities and target-evidence-only observations behind an independent broker; never expand canonical legacy actions silently. Candidate local 8b must pass whole-host/full-round qualification; no automatic model roulette, cloud fallback or scripted execution credited as AI adaptation. 25 October status: A actual-call provenance implemented and evaluated; next owner task is declared model readiness/qualification on the future sealed B host, with the failed objective and latency evidence retained.

## Audience and outcome
- **Audience:** Saad's `apps/control-api/` orchestrator (direct consumer), competition judges evaluating AI authenticity and safety, and any engineer/agent taking over Tanvir's segment.
- **Outcome:** Deliver `services/red-agent/`, `tests/agent/`, and `docs/model-card/`: a bounded, state-aware local LLM decision service running one quantized model (`Qwen3-1.7B Q4` via Ollama) across three sequential logical roles (`scout`, `access_operator`, `adaptation_planner`), guarded by a strict two-stage JSON schema + policy allowlist validator, timeout/fallback tagging, and empirical benchmark suite (30-trial schema validity + 10-pair pre/post-containment adaptation).

## Current source identity
- **Repository:** `/home/ahnaf-zakaria/Downloads/Cydeline`
- **Segment Task ID:** `tanvir-red-agent`
- **Owned Paths:** `services/red-agent/`, `tests/agent/`, `docs/model-card/`, `context/TANVIR_CONTEXT.md`
- **Authoritative Specs:** `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` (Sections 5 Epic B, 8.3, 9), `03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`, and `05_OWNER_B_LOCAL_AI_RED_TEAM.md`

## Acceptance examples (observable)
1. **FR-B01 & FR-B02 (Model Runtime & 3 Sequential Roles):** `choose_action(run_id, role, observation)` invokes local Ollama (`Qwen3-1.7B Q4` default, configurable) using role-specific system instructions for `scout`, `access_operator`, and `adaptation_planner`, recording `model_id`, quantization, `prompt_hash`, `observation_hash`, and `latency_ms`.
2. **FR-B03 & FR-B04 (Two-Stage Validator — Zero Out-of-Policy Execution):**
   - Stage 1 validates strict JSON conformance (`role`, `action`, `target_id`, `session_handle`, `reason`, `additionalProperties: false`).
   - Stage 2 validates that `action` is in `{inspect_session_status, list_accessible_documents, request_document, test_existing_session, wait, stop}` and is permitted for the current role/observation, and that `target_id` (`doc_finance_07`) and `session_handle` (`sess_A`) are verbatim in the observation's allowlist.
   - Any unknown field, shell string, URL, path traversal, or prompt-injection payload in observations is rejected and logged (`0` accepted violations in `tests/agent/`).
3. **FR-B05 (Closed-Loop Adaptation to Containment):** Given a pre-revocation observation (`current_session_status: "active"`), the agent proposes a discovery or document access action; given a post-revocation observation (`last_result: "denied"`, `current_session_status: "revoked"`), the `adaptation_planner` role adapts by choosing `stop`, `inspect_session_status`, or `wait` in $\ge 8/10$ paired trials (`AT-01`, `H1`).
4. **FR-B06 (Bounded Timeouts & Transparent Fallback):** If Ollama times out or returns invalid JSON/policy output, `choose_action` returns within the per-turn timeout budget using a safe, deterministic fallback proposal (`wait` or `stop` or role-appropriate check) with `"fallback_used": true` and `rejection_reason` populated (`AT-05`).

## Constraints and non-goals
- The red-agent service **never** talks directly to `apps/target-api/`, the network, the filesystem, or the shell; it returns validated `ProposalResult` objects to Saad's `apps/control-api/`.
- Never expose hidden scenario ground truth, learner scores, or raw bearer tokens in the observation builder.
- Never claim multi-model swarm autonomy; label honestly as **one local quantized model with three sequential logical roles**.

## Consequential decisions and reasons
1. **Two-Stage Validation (Schema + Policy Allowlist):** Ollama structured outputs guarantee JSON syntax, not state-level legality. Separating JSON parsing from run-policy validation guarantees `0` out-of-policy actions even under adversarial prompt injection (`T-01`, `T-03`).
2. **Explicit `fallback_used` Provenance:** Ensures a slow laptop CPU/GPU or occasional 1.7B hallucination never hangs a live demo while keeping competition claims 100% honest (`AT-05`).

## Assumptions/unknowns
- Local machine has Ollama installed or will install Ollama during Increment B1; cold/warm inference latency of `Qwen3-1.7B Q4` will be measured and recorded in `docs/model-card/BENCHMARK.md`.

## Next increment
- Resolve AI-LEARN-01 and qualify AI-LEARN-02 under representative browser load. Preserve the measured60/60 coach,12/12 early containment and10/12 objective boundaries; no blind retuning.
- Current scope and evidence: `docs/product/BEGINNER_LEARNING_HANDOFF.md`; preserve prior failed gates.

## Verification commands, interaction checks and required independent review
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- `python3 -m unittest discover -s tests/agent -v`
- 30-trial schema validity benchmark ($\ge 28/30$) and 10-pair adaptation benchmark ($\ge 8/10$).
- Independent evaluation via `harness-evaluate` (`context/evaluations/tanvir-red-agent.eval.md`).

## Evidence locations
- `Tanvir.md`
- `03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`
- `05_OWNER_B_LOCAL_AI_RED_TEAM.md`
- `context/TANVIR_CONTEXT.md`
- `docs/model-card/learning/DIAGNOSTIC_AI_LEARN_01.md`
- `docs/model-card/AI_RELEASE_QUALIFICATION_SUMMARY.md`
- `docs/demo/DEMO_SCRIPT.md`


## Approved consolidation — 2026-10-23 (supersedes conflicting earlier fixture/workbench decisions)

Implement one AI-powered SOC using the accepted original console layouts. Root has exactly The Stolen Session (stolen-session/v1) and The Reporting Blind Spot (northstar-breach/v2), compact coached-practice/assessment launch settings, and explicit resume under the one-active-company rule. Original Monitoring becomes Live Monitoring; original Logs and Cases use the same run-scoped snapshot/SSE provider. Preserve original icons, channels, tables, modals, playbook, notes, artifacts, tool arrangements, and training navigation; old run URLs remain valid, old practice links resolve into selected run or landing. No public scripted simulator, sample evidence, invented telemetry, browser grades, or answer keys.

Backend adds authenticated alert ownership/closure comments, idempotent one-case-per-run creation, revision-checked case/playbook/artifact updates with released-evidence validation and old notes/handoffs retained. Declaration, defense, recovery and scoring stay authoritative. Alert closure never ends the attacker. Scenario playbooks gate completion on server records; final feedback/replay is terminal only. Windows/Elastic live in Sandbox; Windows installation and new attack families remain out of scope.

Require actual model readiness on create/start. Invalid/timeout model output records a failed decision and system-pauses clock without fallback execution or step consumption. Authenticated AI retry retries the pending turn; defender-induced stale proposals are discarded without outage. Assessment disallows manual pauses, permits only system AI pauses. Preserve canonical enums, policy/schema checks, target audit correlation, response idempotency and authorization.

Acceptance: both scenario workflows, real model-to-target correlated actions and containment/legitimate continuity; case retries/revisions/old data; refresh, tabs, SSE reconnect, isolation and drafts; AI launch/outage/retry/assessment; 320/390/768/1440 keyboard/accessibility; native tests/build/Harness run/evaluate and handoff.

The live bridge uses the same per-turn constrained output schema for v1 and v2; v2 alone has the model-selected access-context stage. RedAgentService and frozen validator enums remain unchanged. Invalid outputs are preserved as rejected traces and the live engine pauses; no fallback target action executes.


## Authorized beginner learning loop — 2026-10-23

Implement the attached beginner SOC plan in M0–M4: harden terminal immutability, persisted report identity, response/verification/playbook invalidation and draft isolation; add public company briefings, paused coached starts, three authored micro-exercises, revision-checked autosaved six-part worksheets, evidence-grounded Explain/Nudge/Guide coaching with exact citations and disputes, three meaningful target configurations per scenario, trace-linked causal debrief/export and another-variation launch. Keep the two scenario cards, original console layouts, canonical enums, real local attacker, server scoring and assessment restrictions. No new runtime orchestration framework. Assistance never deducts practice points. Variant manifests pin configuration, seed and hashes; exact replay consumes the recorded trace. Older records load with optional fields absent.

Acceptance: native tests/build/browser checks/Harness; 60 adversarial coaching cases; 12 genuine model journeys (2 scenarios × 3 variants × 2 repeats), audit correlations and paired interventions; coaching p95 ≤15s measured on declared hardware. Record failed/unavailable gates honestly. M4 prepares a counterbalanced eight-beginner/two-expert pilot and 0–2 six-skill rubric; no participant findings or educational-efficacy claims without observed sessions. Product records: docs/product/BEGINNER_LEARNING_RESEARCH.md, BEGINNER_LEARNING_PLAN.md, OPEN_SOURCE_ADOPTION.md.


## 2026-10-27 unavailable-lead handoff
User states Ahnaf implemented the current baseline and will be unavailable. Current remaining-work ownership is specified in `Tanvir.md` and `Saad.md`: Tanvir leads AI/adaptation/coaching/model evidence and learning-quality readiness; Saad leads infrastructure/authority/integration and all remaining VMobserver/timedfrontend/accessibility/operations work, coordinating directly with Tanvir without an Ahnaf dependency. Do not edit `Ahnaf.md`. This documentation handoff changes neither executable permissions nor canonical schemas and preserves all failed/unverified gates, deferred pilot, and explicit purchase/deployment/contact boundaries.
