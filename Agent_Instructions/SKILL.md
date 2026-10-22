---
name: Agent_Instructions
description: Master Harness Operating System and Zero-Context-Loss Takeover Skill for Sentinel Loop. Enforces context-resume, Plan -> Implement -> Evaluate lifecycle, per-person real-time context updates (Ahnaf, Tanvir, Saad), and instant mid-flight takeover by any AI agent or human engineer.
---

# Sentinel Loop — Agent_Instructions & Harness Operating System

This skill governs **every AI coding agent** (Cursor, Codex, Claude Code, Antigravity) and human engineer working in the **Sentinel Loop** repository (`/home/ahnaf-zakaria/Downloads/Cydeline`). Its purpose is to guarantee that **Ahnaf**, **Tanvir**, **Saad**, or any backup engineer/agent can pause, hand off, or **take over any segment at any moment** without needing previous chat transcripts.

---

## 1. The 4 Harness Task Segments & Ownership Map

Every piece of work in this repository belongs to one of four registered `harness` task IDs:

| Task ID (`--task`) | Human Owner | Segment Scope | Live Context File | Task Contract (`harness-plan`) | Evaluation Ledger (`harness-evaluate`) |
|---|---|---|---|---|---|
| `ahnaf-lead-ux` | **Ahnaf** | Project Lead, Overseer, 7-State React/TS SOC UI (`apps/web/`), Playwright E2E (`tests/e2e/`), 3-Min Demo (`docs/demo/`) | `context/AHNAF_CONTEXT.md` | `context/contracts/ahnaf-lead-ux.contract.md` | `context/evaluations/ahnaf-lead-ux.eval.md` |
| `tanvir-red-agent` | **Tanvir** | Local AI Red-Team Engine (`services/red-agent/`), 2-Stage Validator, Ollama `Qwen3-1.7B Q4`, Benchmarks (`tests/agent/`, `docs/model-card/`) | `context/TANVIR_CONTEXT.md` | `context/contracts/tanvir-red-agent.contract.md` | `context/evaluations/tanvir-red-agent.eval.md` |
| `saad-range-control` | **Saad** | Shared Contracts (`contracts/`, `scenarios/`), Isolated Target (`apps/target-api/`, `infra/range/`), Trusted Control Plane & 100-Pt Scorer (`apps/control-api/`) | `context/SAAD_CONTEXT.md` | `context/contracts/saad-range-control.contract.md` | `context/evaluations/saad-range-control.eval.md` |
| `master-integration` | **Ahnaf + All** | Cross-segment integration gates (`G0` -> `G6`), 10x clean reset (`AT-08`), release readiness | `context/MASTER_INTEGRATION_CONTEXT.md` | `context/contracts/master-integration.contract.md` | `context/evaluations/master-integration.eval.md` |

---

## 2. Mandatory Entry Protocol (`context-resume` — Run Before Any Edit)

Whenever a new chat starts, an agent switches segments, or **Ahnaf takes over Tanvir's or Saad's segment**, execute this exact 3-step entry sequence before writing code:

```bash
# Step 1: Run the Instant Takeover & Reconciliation Report for the target segment
python3 scripts/harness_sync.py takeover --task <ahnaf-lead-ux|tanvir-red-agent|saad-range-control|master-integration>

# Step 2: Run native harness context-resume to verify snapshot & receipt freshness
harness context resume /home/ahnaf-zakaria/Downloads/Cydeline --task <task>

# Step 3: Read the segment's live context markdown and contract
# - context/AHNAF_CONTEXT.md + context/contracts/ahnaf-lead-ux.contract.md
# - context/TANVIR_CONTEXT.md + context/contracts/tanvir-red-agent.contract.md
# - context/SAAD_CONTEXT.md + context/contracts/saad-range-control.contract.md
```

**Reconciliation Rule:** Never blindly trust a summary if `stale_since_checkpoint: true`. Inspect `owned_working_tree_changes` and actual files on disk, reconcile what was actually completed, and rerun `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`.

---

## 3. Complete Harness Lifecycle Plans (`Plan` -> `Implement` -> `Evaluate`)

All work routes proportionally through the three lifecycle phases defined in the reference blueprints below:

1. **Planning Segment (`harness-plan`):** Read [references/PLAN_PHASE.md](references/PLAN_PHASE.md) for the complete Stage 0–7 planning blueprints, canonical enums/contracts, and UI/UX visual contract rules (`ui-ux-design`) for all three teammates.
2. **Building / Implementation Segment (`harness-implement`):** Read [references/IMPLEMENT_PHASE.md](references/IMPLEMENT_PHASE.md) for the exact step-by-step vertical slice build increments (`S1–S4` for Saad, `B1–B3` for Tanvir, `A1–A4` for Ahnaf), directory boundaries, and non-negotiable security invariants.
3. **Evaluation & Release Gate Segment (`harness-evaluate`):** Read [references/EVALUATE_PHASE.md](references/EVALUATE_PHASE.md) for the independent verification criteria, acceptance scenarios (`AT-01` through `AT-10`), threat checks (`T-01` through `T-12`), and release gates (`G0` through `G6`).
4. **Emergency Mid-Flight Takeover Protocol:** Read [references/TAKEOVER_PROTOCOL.md](references/TAKEOVER_PROTOCOL.md) when taking over an incomplete, failing, or blocked segment from another teammate or agent.

---

## 4. Mandatory Real-Time Context Update Protocol (`context-checkpoint`)

**Never end a turn, complete an increment, hit a blocker, or switch tasks without updating the real-time context!**

After every meaningful code change, test run, or decision, run:

```bash
# 1. Update both the native harness checkpoint AND the git-tracked context/*.md files
python3 scripts/harness_sync.py update \
  --task <ahnaf-lead-ux|tanvir-red-agent|saad-range-control|master-integration> \
  --phase <PLAN|IMPLEMENT|EVALUATE> \
  --complete "Exact increment completed and verification command run" \
  --next-step "Exact next atomic increment for the next turn or takeover agent"

# 2. Run and record the reproducible verification receipt
harness check run /home/ahnaf-zakaria/Downloads/Cydeline
harness check evaluate /home/ahnaf-zakaria/Downloads/Cydeline
```

**Context Window Advisory (`Behaviours.md`):**
- At **~35% measured active context occupancy**, prepare a checkpoint at the next safe boundary.
- At **~40% measured active context occupancy**, run `python3 scripts/harness_sync.py update ...` and suggest starting a fresh chat once per window (continue if the human chooses). If occupancy telemetry is unavailable, report it as `unknown` and checkpoint at every milestone.
