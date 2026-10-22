# Workstream 02 — Local AI Red-Team Engine
**Owner:** Engineer B | **Mission:** prove a lightweight local model makes real, permitted, state-aware adversarial decisions rather than playing a fixed animation.

## You own
`services/red-agent/`, model/runtime configuration, role prompts, sanitized observations, structured proposal generation, two-stage validator, action budget, action trace, latency benchmarking, and fallback tagging. You **do not** own target state, unrestricted network tools, scoring, or the defender dashboard.

## Core architecture
Use **one quantized local model instance**, starting with a benchmark of Qwen3-1.7B Q4; compare a 4B Q4 candidate if hardware allows. Run three **sequential logical roles** on the same model: `scout`, `access_operator`, `adaptation_planner`. These are roles, not three simultaneous independent models. Use Ollama JSON-schema structured outputs, low temperature and short prompts. Model competence and latency are **unverified until benchmarked on the actual machine**.

### Required P0 modules
1. **Model adapter:** load local model, report model name/quantization/runtime, provide `choose_action(observation, role)`, enforce timeout and response token budget.
2. **Observation builder:** expose only allowed session handles, previous action outcomes, visible target facts, and defender changes the attacker could plausibly observe. Never expose hidden answer key, learner score, control-plane secrets or arbitrary internal URLs.
3. **Action schema:** exact enum and parameter types from shared contract. JSON schema compliance is necessary but insufficient.
4. **Policy validator:** ensure the action is permitted for the active role, current scenario state, target IDs, per-turn budgets and remaining steps. Reject unknown IDs and unsafe text; model output never becomes an executable shell command.
5. **Tool adapter:** dispatch approved action IDs through C's run-scoped interface to A's fixed target routes. No direct model network or filesystem privileges.
6. **Adaptive loop:** after a defender revokes a session, feed back the *actual denial* and ask the model to choose another permitted option or stop. Show different choices in matched before/after states without pretending a hardcoded fallback is AI.
7. **Trace:** record proposed JSON, validation result, accepted action, reason for rejection, actual target result, model/runtime ID, latency, prompt hash, and whether fallback was used.
8. **Failure mode:** invalid JSON, timeout, invalid action or exhausted budget must end safely or use an explicitly tagged deterministic fallback; never hang the exercise.

### First-model benchmark (planned acceptance targets)
| Test | Target | Measurement |
|---|---|---|
| JSON schema adherence | ≥28/30 | 30 defined observations |
| Out-of-scope dispatch | 0 accepted | Validator fuzz tests |
| Adaptation to containment | ≥8/10 paired state cases differ meaningfully or explicitly stop | Paired A/B observations |
| First decision latency | Prefer ≤10s on demo machine; otherwise redesign pacing | Median and p95, 10+ runs |
| Claimed success provenance | 100% matching target response + audit ID | Integration assertions |
| Fallback disclosure | 100% tagged in trace | Forced timeout/invalid JSON tests |

These are engineering gates, not measured results or a claim of experienced-human hacker equivalence. If 1.7B fails, first shrink the action space and prompt; then test 4B. Avoid spending days fine-tuning or adding model instances.

### The adaptation demonstration
- Initial observation: compromised session appears usable; permitted document access is available.
- Agent selects `request_document` or another valid inspection step; target performs a real request.
- Defender revokes compromised session.
- Agent receives a new **sanitized observed denial** and chooses `inspect_session_status`, `wait` or `stop`, or a permitted alternative route if the reviewed scenario contains one.
- B records the actual proposal and result; C decides the incident outcome from target evidence.

### Interface handoff
- Publish `AttackerProposal` and `AgentDecisionRecord` JSON schemas by 22 Oct.
- Provide `async choose_action(run_id, role, observation) -> ProposalResult` and `validate_action(proposal, run_policy) -> AcceptedAction | Rejection`.
- C schedules agent turns and controls the scenario clock; B controls inference latency and step budgets.
- B may offer an **optional** practice-only coaching response service later, but it must have a separate defender-visible evidence context and no hidden answers. C gates assessment mode; D displays hints. Never let the attacker prompt and coach share privileged hidden state.

### Red-team your own segment
- Small models can generate fluent but strategically meaningless output; measure action quality, not text plausibility.
- Schema-constrained generation can still propose invalid state transitions; policy validator is mandatory.
- Prompt injection from document names or log fields must not grant new tools or targets.
- If fallback is untagged, the competition demo misrepresents autonomy.
- Inference pauses should not make the trainee's reaction-time score artificially better; C's virtual clock owns timing.

### Daily tickets
- **22 Oct:** benchmark script, schemas, observation policy, model/runtime decision; mock target action.
- **23 Oct:** local model valid JSON + first bounded target interaction; log model ID/latency.
- **24 Oct:** actual target result fed back into next decision; stop/timeout paths.
- **25 Oct:** stable model → target → telemetry → defender loop.
- **26–28 Oct:** paired adaptation benchmark, failure injection, prompt injection tests, provenance/model card.
- **29–31 Oct:** freeze model hash/config; provide recorded model proposal and limitations for video.

## Definition of done
On the actual demo machine, a locally loaded model emits an action that passes schema and policy validation; the action executes against A's target through the approved adapter; the trace records the real result; and the model responds coherently to a changed defender state. Model failures are bounded and transparently labeled. No unrestricted offensive tooling is present.

## Useful references
https://github.com/ollama/ollama/blob/main/docs/api.md, https://github.com/QwenLM/Qwen3, https://github.com/ggml-org/llama.cpp, https://github.com/usestrix/strix, https://github.com/dreadnode/ares. Strix/Ares are **architecture references**, not October dependencies.
