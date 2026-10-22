# Sentinel Loop — Developer AI Prompts & Instant Segment Takeover Guide (`Takeover.md`)

This document contains the exact **copy-paste AI prompts** for **Ahnaf**, **Tanvir**, and **Saad**, plus the **Emergency Mid-Flight Takeover Protocol** so anyone can jump into any segment at any moment without needing prior chat transcripts.

---

## 1. Quick-Reference: Segment Task IDs & Context Files

| Teammate | Harness Task ID (`--task`) | Live Context File | Task Contract (`Plan`) | Evaluation Ledger (`Evaluate`) | Handover Guide |
|---|---|---|---|---|---|
| **Ahnaf** (Lead, Overseer & SOC UX) | `ahnaf-lead-ux` | `context/AHNAF_CONTEXT.md` | `context/contracts/ahnaf-lead-ux.contract.md` | `context/evaluations/ahnaf-lead-ux.eval.md` | `Ahnaf.md` |
| **Tanvir** (Local AI Red-Team Engine) | `tanvir-red-agent` | `context/TANVIR_CONTEXT.md` | `context/contracts/tanvir-red-agent.contract.md` | `context/evaluations/tanvir-red-agent.eval.md` | `Tanvir.md` |
| **Saad** (Cyber Range & Control Plane) | `saad-range-control` | `context/SAAD_CONTEXT.md` | `context/contracts/saad-range-control.contract.md` | `context/evaluations/saad-range-control.eval.md` | `Saad.md` |
| **All / Lead** (Cross-Team Gates `G0–G6`) | `master-integration` | `context/MASTER_INTEGRATION_CONTEXT.md` | `context/contracts/master-integration.contract.md` | `context/evaluations/master-integration.eval.md` | `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` |

---

## 2. Copy-Paste Prompts for Each Developer to Give Their AI

### A. Prompt for **Tanvir** (`tanvir-red-agent`)

> **Send this to Tanvir to paste into his AI coding assistant at the start of any session:**

```text
You are working on the "tanvir-red-agent" segment of Sentinel Loop. Before writing any code, strictly follow AGENTS.md and Agent_Instructions/SKILL.md:

1. Run:
   python3 scripts/harness_sync.py takeover --task tanvir-red-agent
2. Read these 4 files in full:
   - Agent_Instructions/SKILL.md (and Agent_Instructions/references/IMPLEMENT_PHASE.md)
   - context/TANVIR_CONTEXT.md
   - context/contracts/tanvir-red-agent.contract.md
   - Tanvir.md (and 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md)
3. Reconcile the recorded state with the current git working tree (`git status`), tell me the exact `immediate_next_step`, and begin executing the next atomic increment (`B1 -> B2 -> B3`) following the Plan -> Implement -> Evaluate lifecycle.
4. Do NOT touch files outside your owned directories (`services/red-agent/`, `tests/agent/`, `docs/model-card/`) without flagging a contract request.
5. Before ending EVERY turn where you write code, run tests, or hit a blocker, you MUST update the real-time harness context and verification receipt:
   python3 scripts/harness_sync.py update --task tanvir-red-agent --phase <PLAN|IMPLEMENT|EVALUATE> --complete "<what you completed and verified>" --next-step "<exact next atomic task>"
   harness check run .
```

---

### B. Prompt for **Saad** (`saad-range-control`)

> **Send this to Saad to paste into his AI coding assistant at the start of any session:**

```text
You are working on the "saad-range-control" segment of Sentinel Loop. Before writing any code, strictly follow AGENTS.md and Agent_Instructions/SKILL.md:

1. Run:
   python3 scripts/harness_sync.py takeover --task saad-range-control
2. Read these 4 files in full:
   - Agent_Instructions/SKILL.md (and Agent_Instructions/references/IMPLEMENT_PHASE.md)
   - context/SAAD_CONTEXT.md
   - context/contracts/saad-range-control.contract.md
   - Saad.md
3. Reconcile the recorded state with the current git working tree (`git status`), tell me the exact `immediate_next_step`, and begin executing the next atomic increment (`S1 -> S2 -> S3 -> S4`) following the Plan -> Implement -> Evaluate lifecycle. Priority #1 is Increment S1 (`contracts/` and `scenarios/stolen-session/v1/`) so the whole team has the frozen schemas and mocks.
4. Do NOT touch files outside your owned directories (`contracts/`, `scenarios/`, `apps/target-api/`, `infra/range/`, `apps/control-api/`, `tests/target/`, `tests/control/`, `tests/isolation/`).
5. Before ending EVERY turn where you write code, run tests, or hit a blocker, you MUST update the real-time harness context and verification receipt:
   python3 scripts/harness_sync.py update --task saad-range-control --phase <PLAN|IMPLEMENT|EVALUATE> --complete "<what you completed and verified>" --next-step "<exact next atomic task>"
   harness check run .
```

---

### C. Prompt for **Ahnaf** (`ahnaf-lead-ux`)

> **Paste this into your own AI coding assistant when working on your UX & Lead segment:**

```text
You are working on the "ahnaf-lead-ux" segment of Sentinel Loop. Before writing any code, strictly follow AGENTS.md and Agent_Instructions/SKILL.md:

1. Run:
   python3 scripts/harness_sync.py takeover --task ahnaf-lead-ux
2. Read these 4 files in full:
   - Agent_Instructions/SKILL.md (and Agent_Instructions/references/IMPLEMENT_PHASE.md)
   - context/AHNAF_CONTEXT.md
   - context/contracts/ahnaf-lead-ux.contract.md (enforce the accepted ui-ux-design Visual Contract)
   - Ahnaf.md
3. Reconcile the recorded state with the current git working tree (`git status`), tell me the exact `immediate_next_step`, and begin executing the next atomic increment (`A1 -> A2 -> A3 -> A4`) following the Plan -> Implement -> Evaluate lifecycle. Build against static mock fixtures first (`VITE_USE_MOCKS=true`) so UI work never blocks on the backend.
4. Before ending EVERY turn where you write code, run tests, or hit a blocker, you MUST update the real-time harness context and verification receipt:
   python3 scripts/harness_sync.py update --task ahnaf-lead-ux --phase <PLAN|IMPLEMENT|EVALUATE> --complete "<what you completed and verified>" --next-step "<exact next atomic task>"
   harness check run .
```

---

## 3. Emergency Mid-Flight Takeover Prompt (Zero Chat History Needed)

If **Tanvir** or **Saad** faces an issue, gets blocked, or hands over unfinished work, open a fresh AI chat on your machine and paste this block (replace the task name with `tanvir-red-agent`, `saad-range-control`, `ahnaf-lead-ux`, or `master-integration`):

```text
Emergency Segment Takeover: I am taking over the "<tanvir-red-agent | saad-range-control | ahnaf-lead-ux | master-integration>" segment right now.

Follow AGENTS.md and Agent_Instructions/references/TAKEOVER_PROTOCOL.md immediately:
1. Run `python3 scripts/harness_sync.py status` and `python3 scripts/harness_sync.py takeover --task <tanvir-red-agent | saad-range-control | ahnaf-lead-ux | master-integration>`.
2. Read the segment's live context file in `context/`, its contract in `context/contracts/`, and its evaluation ledger in `context/evaluations/`.
3. Inspect `git status` and `git diff` to see if the previous developer left any uncommitted or broken changes on disk. Do not revert their work—reconcile it, run existing tests, update the checkpoint via `python3 scripts/harness_sync.py update`, and continue executing from the exact `immediate_next_step`.
4. After completing each atomic increment, run `python3 scripts/harness_sync.py update ...` and `harness check run .`.
```

---

## 4. Terminal Commands for Manual Inspection & Takeover

If you want to inspect the live state of all three segments from your terminal at any time:

```bash
# 1. View live status, revision, completed count, blockers, and next step across all 4 tasks
python3 scripts/harness_sync.py status

# 2. Generate a full takeover brief for a specific segment
python3 scripts/harness_sync.py takeover --task tanvir-red-agent
python3 scripts/harness_sync.py takeover --task saad-range-control
python3 scripts/harness_sync.py takeover --task ahnaf-lead-ux
python3 scripts/harness_sync.py takeover --task master-integration

# 3. Record completed work, blockers, or next step in real time
python3 scripts/harness_sync.py update \
  --task <ahnaf-lead-ux|tanvir-red-agent|saad-range-control|master-integration> \
  --phase <PLAN|IMPLEMENT|EVALUATE> \
  --complete "What was completed and verified" \
  --next-step "Exact next atomic action"

# 4. Run and verify the Harness snapshot receipt
harness check run .
harness check evaluate .
```
