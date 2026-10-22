<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py — DO NOT DELETE SECTIONS -->
# Live Context & Instant Takeover Packet: `tanvir-red-agent`

| Field | Value |
|---|---|
| **Segment / Task ID** | `tanvir-red-agent` |
| **Assigned Owner** | Tanvir (Local AI Red-Team Engine Owner) |
| **Active Lifecycle Phase** | **`PLAN`** (`PLAN` → `IMPLEMENT` → `EVALUATE`) |
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
  > **Start Increment B1: Implement services/red-agent/ (schemas, observation builder, two-stage validator, and tagged fallback) + unit tests in tests/agent/.**

---

## 3. Real-Time Execution Progress

### Completed Work (`completed`)
- [x] Defined Tanvir's role, deliverables, and parallel workflow in Tanvir.md
- [x] Frozen starter runtime prompt in 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md and contract in context/contracts/tanvir-red-agent.contract.md

### Remaining Work (`remaining`)
- [ ] Increment B1: Implement services/red-agent/ (observation builder, 2-stage validator, timeout fallback) and unit tests in tests/agent/
- [ ] Increment B2: Connect Ollama client (Qwen3-1.7B Q4) and measure cold/warm decision latency on demo hardware
- [ ] Increment B3: Execute 30-trial schema benchmark + 10-pair adaptation benchmark and document results in docs/model-card/

### Active Blockers (`blockers`)
- _None recorded_

### Open Uncertainties / Assumptions (`uncertainties`)
- Cold/warm latency of Qwen3-1.7B Q4 on local hardware to be measured during Increment B2


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

### Architecture Entry Points (`architecture`)
- Tanvir.md
- 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md
- 05_OWNER_B_LOCAL_AI_RED_TEAM.md
- context/contracts/tanvir-red-agent.contract.md
- services/red-agent/
- tests/agent/
- docs/model-card/

### Verified Evidence Files (`evidence`)
- Tanvir.md
- 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md
- 05_OWNER_B_LOCAL_AI_RED_TEAM.md
- context/contracts/tanvir-red-agent.contract.md
- context/evaluations/tanvir-red-agent.eval.md


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
