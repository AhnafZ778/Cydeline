# Task contract: Tanvir — Local AI Red-Team Engine (`tanvir-red-agent`)

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
- **Increment B1 (PLAN -> IMPLEMENT):** Scaffold `services/red-agent/` (`schemas.py`, `observation.py`, `validator.py`, `ollama_client.py`, `fallback.py`) and `tests/agent/test_validator_and_roles.py` so the entire validator, observation builder, and fallback loop pass unit tests immediately (even before Ollama is warm), then run the live Ollama benchmark.

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
