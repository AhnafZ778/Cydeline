# `services/red-agent/` — bounded local AI adversary

Owner: **Tanvir** (`tanvir-red-agent`) · Consumers: Saad's `apps/control-api/` ·
Spec: `Tanvir.md`, `03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`,
`context/contracts/tanvir-red-agent.contract.md`

One local quantized model (`Qwen3-1.7B Q4` via Ollama) prompted **sequentially**
as `scout` → `access_operator` → `adaptation_planner`. Three roles, one model.
This service never touches the network, the filesystem, the shell or
`apps/target-api/`; it returns proposals to the trusted control plane, which
decides whether to execute them.

## Status

| Increment | Scope | State |
|---|---|---|
| B1 | `schemas.py`, `observation.py`, `validator.py`, `fallback.py` + unit tests | **implemented** |
| B2 | `prompts.py`, `ollama_client.py`, `service.py` (`choose_action`) | **implemented, live-verified** on `qwen3:1.7b` Q4_K_M |
| B3 | `benchmark.py` + `docs/model-card/MODEL_CARD.md` | **implemented, live benchmark PASS** (29/30 schema, 9/10 adaptation) |

## Modules

| File | Responsibility |
|---|---|
| `schemas.py` | Canonical enums, five-field proposal envelope, rejection codes, hashing |
| `observation.py` | Sanitized attacker-visible observation (10 allowlisted fields) |
| `validator.py` | Stage 1 strict JSON schema, Stage 2 run-policy allowlist |
| `fallback.py` | Bounded timeout runner + deterministic `fallback_used` tagging |
| `prompts.py` | Safety policy, per-role instructions, structured-output JSON schema |
| `ollama_client.py` | `/api/tags` + `/api/chat` client with an injectable transport |
| `service.py` | `choose_action()` — prompt assembly, provenance capture, fallback handoff |
| `contracts_adapter.py` | Boundary to canonical `contracts/` DTOs (`AttackerProposal`, `AgentDecisionRecord`); optional Pydantic import, core stays stdlib-only |
| `benchmark.py` | 30-trial schema + 10-pair adaptation evidence and model card |

## Importing

This directory has a hyphen, so it is a **source root**, not a package:

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path("services/red-agent").resolve()))

from observation import build_sanitized_observation
from validator import validate_action, run_policy
from fallback import decide_with_fallback
```

`tests/agent/` uses the same bootstrap. Until `contracts/` exists (Increment S1),
these dataclasses are the local contract and `Proposal.to_dict()` is the wire
shape to keep aligned with PRD 8.3.

## Public surface

```python
# Supply-side: build the only state the model is allowed to see.
observation = build_sanitized_observation(
    run_handle="run_0001",
    assigned_role="adaptation_planner",
    step=4,
    steps_remaining=2,
    session_handles=["sess_A"],
    allowed_target_ids=["doc_finance_07"],
    last_action="test_existing_session",
    last_result="denied",
    current_session_status="revoked",
)

# Demand-side: validate before anything executes.
result = validate_action(model_text, observation)   # -> ValidationResult
result.accepted, result.policy, result.rejection_reason

# Full loop: prompt the local model, validate, fall back safely if it misbehaves.
service = RedAgentService()                      # OllamaClient with env config
outcome = service.choose_action("run_0001", "adaptation_planner", observation)
outcome.accepted          # bool — did a live (or fallback) proposal pass policy?
outcome.fallback_used     # bool — provenance, never part of the proposal envelope
outcome.action_payload    # {"action": ..., "target_id": ..., "session_handle": ...}
outcome.to_trace()        # row shaped for `agent_decisions`

# Or drive the pieces directly:
outcome = decide_with_fallback(lambda: ollama_reply(), observation, timeout_ms=10_000)
```

Configuration (all optional, environment-overridable):

| Variable | Default | Meaning |
|---|---|---|
| `OLLAMA_MODEL` | `qwen3:1.7b` | Model tag; `qwen3:4b` is the escalation candidate |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Runtime URL; scheme-less `host:port` accepted |
| `RED_AGENT_TIMEOUT_MS` | `10000` | Per-turn decision budget (socket timeout is +2s) |
| `OLLAMA_TEMPERATURE` | `0.0` | Kept at zero for reproducible decisions |
| `OLLAMA_NUM_PREDICT` | `180` | Response token budget |
| `OLLAMA_SEED` | `42` | Fixed seed, recorded in provenance |
| `OLLAMA_THINK` | `false` | Qwen3 reasoning mode. Off by default: with it on, the 1.7B model spent the entire `num_predict` budget on reasoning and returned empty `content` (`done_reason=length`) |

## Shared contracts integration

`contracts_adapter.py` is the only module that imports `contracts/`. Core
modules remain standard-library-only, so the offline test suite and the
benchmark run without Pydantic. When `contracts/` is installed:

```python
import contracts_adapter as ca

ca.assert_vocabulary_parity()          # fail fast on enum/handle drift
ca.to_attacker_proposal(outcome.proposal)   # -> contracts.AttackerProposal
ca.to_agent_decision_record(outcome, decision_id="dec_001", run_id="run_0001", step=3)
```

Without Pydantic, importing the module still works and every call raises
`ContractUnavailable`; the 11 parity/record tests skip rather than fail.

## Invariants enforced here

1. **Closed action enum.** Only the six PRD actions exist; unknown values fail
   Stage 1 (`invalid_enum`).
2. **Two-stage separation.** JSON conformance is checked separately from
   legality, so schema-constrained generation cannot bypass run policy.
3. **Verbatim handles.** `sess_a`, `sess_A ` and Cyrillic homoglyphs are all
   rejected. Handles are never normalised, only compared.
4. **State gate.** Once a session is `revoked`, `disabled` or `expired`, only
   `inspect_session_status`, `wait` and `stop` remain legal.
5. **Budget gate.** At `steps_remaining == 0` the only legal action is `stop`.
6. **Narrowing-only control plane.** Effective permissions are
   `derived ∩ declared`; the control plane can restrict autonomy but cannot widen
   it. `stop` is always restored as the universal safe move.
7. **Tagged fallback.** `fallback_used` / `fallback_reason` live on the service
   result, never in the five-field proposal envelope, so the model can neither
   claim nor hide a fallback.
8. **No hidden truth.** The observation builder has no parameter for answer keys,
   scores, bearer tokens, future events or raw URLs; unknown keys raise instead
   of being silently dropped.

## Verification

```bash
python3 -m unittest discover -s tests/agent -v
python3 services/red-agent/benchmark.py      # live 30-trial + 10-pair evidence
```

164 tests across six modules:

| Module | Tests | Covers |
|---|---:|---|
| `test_observation.py` | 35 | Allowlist shape, hidden-truth rejection, handle grammar, derived permissions |
| `test_validator_and_roles.py` | 43 | Stage 1 parser, Stage 2 role/state/budget matrix, verbatim handles, 29-case T-01 corpus |
| `test_fallback.py` | 21 | Bounded wall clock, deterministic fallback legality, provenance tagging |
| `test_service_and_prompts.py` | 39 | Prompt/schema shape, Ollama request contract, thinking-mode regression, `choose_action` provenance |
| `test_benchmark.py` | 15 | 30-trial/10-pair corpora, threshold scoring, out-of-policy gate, card rendering |
| `test_contracts_adapter.py` | 11 | Enum/handle parity, Proposal round-trip, `AgentDecisionRecord` for accepted/rejected/timeout turns (skips without Pydantic) |

All unit tests run offline against a fake transport. Only `benchmark.py` invokes
real inference, and the model card is the sole source of performance claims.

## Known limitations (current tip)

* **Measured on one host.** `docs/model-card/MODEL_CARD.md` records warm median
  ≈3.1 s and p95 ≈4.3 s for `qwen3:1.7b` Q4_K_M (CPU). A separate cold-start
  probe after an explicit unload measured 9.4 s for the first decision. Latency
  depends on residency and load; treat it as demo-machine evidence, not an SLA.
* **Thinking mode must stay off for the 1.7B model.** With thinking enabled, the
  whole token budget went to reasoning and `content` came back empty
  (`done_reason=length`); `OLLAMA_THINK=true` is an experiment switch only.
* **One observed schema failure and one unadapted pair** in the recorded run —
  both contained (role-ceiling rejection → fallback; repeated status probe). See
  the failure-modes section of the model card.
* **No model is invoked in CI.** `test_service_and_prompts.py` uses a fake
  transport; `benchmark.py` is a manual demo-machine run.
* **Control-plane wiring still pending.** Saad's S1 `contracts/` landed and
  `contracts_adapter.py` maps to canonical DTOs, but `apps/control-api/` (S3)
  does not exist yet, so `choose_action()` is not called from a live turn
  scheduler. The adapter is the integration seam for that work.
* **Pydantic is not installed in the default interpreter on this host.** The 11
  parity tests skip locally; they were verified in an isolated
  `pydantic 2.14.1` environment. Install `contracts/requirements.txt` on CI and
  the demo host to run them.
* Provenance stores `prompt_hash` + `observation_hash`, not raw prompts (PRD 8.3).
  Raw model text is truncated to 500 chars for the trace.
