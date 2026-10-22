# Sentinel Loop — Engineering & Harness Operating Contract (`AGENTS.md`)

Every AI coding assistant (Cursor, Codex, Claude Code, Antigravity) operating in `/home/ahnaf-zakaria/Downloads/Cydeline` **MUST** follow this operating contract and the companion skill in `Agent_Instructions/SKILL.md` (`.agents/skills/agent-instructions/SKILL.md`).

---

## 1. Zero-Context-Loss Entry Rule (`context-resume`)

At the start of **every** session, or when switching between **Ahnaf's**, **Tanvir's**, and **Saad's** segments, do **not** ask the user to re-explain the project. Instead, immediately run:

```bash
python3 scripts/harness_sync.py status
python3 scripts/harness_sync.py takeover --task <ahnaf-lead-ux|tanvir-red-agent|saad-range-control|master-integration>
```

Then read the target segment's live context file and task contract:
- **Ahnaf (Lead, Overseer & Defender SOC UX):** `context/AHNAF_CONTEXT.md` + `context/contracts/ahnaf-lead-ux.contract.md` + `Ahnaf.md`
- **Tanvir (Local AI Red-Team Engine):** `context/TANVIR_CONTEXT.md` + `context/contracts/tanvir-red-agent.contract.md` + `Tanvir.md`
- **Saad (Virtual Company Cyber Range & Control Plane):** `context/SAAD_CONTEXT.md` + `context/contracts/saad-range-control.contract.md` + `Saad.md`
- **Master Cross-Team Integration:** `context/MASTER_INTEGRATION_CONTEXT.md` + `context/contracts/master-integration.contract.md` + `01_PRODUCT_REQUIREMENTS_DOCUMENT.md`

Reconcile the recorded state with the actual git working tree (`git status`, `git diff`) before editing. Preserve unrelated work (`<no_reverts>`).

---

## 2. Proportional Lifecycle Routing (`Plan` -> `Implement` -> `Evaluate`)

All work routes through the three Harness lifecycle phases detailed in `Agent_Instructions/references/`:

1. **`Plan` (`harness-plan` -> `Agent_Instructions/references/PLAN_PHASE.md`):**
   - Verify or update `context/contracts/<task>.contract.md` before consequential new work.
   - Never alter canonical enums (`RunState`, `Outcome`, `Mode`, `AttackerAction`, `DefenderAction`, `Verification`) without updating `contracts/` and `context/contracts/master-integration.contract.md`.
   - For UI work (`ahnaf-lead-ux`), enforce the accepted `ui-ux-design` Visual Contract in `context/contracts/ahnaf-lead-ux.contract.md` (`Product / operational` + `Technical / industrial` grammar, WCAG 2.2 AA contrast, `tabular-nums` monospace IDs, `ASYNC-01`, `LIVE-01`, `SAFE-01`, `SAFE-02`, `TABLE-01`, `AI-01`).
2. **`Implement` (`harness-implement` -> `Agent_Instructions/references/IMPLEMENT_PHASE.md`):**
   - Build in bounded vertical increments (`S1–S4` for Saad, `B1–B3` for Tanvir, `A1–A4` for Ahnaf).
   - Exercise affected behavior with project-native tests and `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`.
   - Never trust LLM outputs without schema + policy allowlist validation; never trust browser inputs for scoring or state transitions; never leak hidden scenario ground truth.
3. **`Evaluate` (`harness-evaluate` -> `Agent_Instructions/references/EVALUATE_PHASE.md`):**
   - After material increments or at gates `G0`–`G6`, run `harness check evaluate /home/ahnaf-zakaria/Downloads/Cydeline` and record findings in `context/evaluations/<task>.eval.md` using a fresh independent evaluation lens.
   - Fixes from Evaluate return to Implement.

---

## 3. Mandatory Real-Time Context Checkpoint (`context-checkpoint`)

Before ending any turn that modifies code, completes a milestone, discovers a blocker, or reaches ~35%–40% measured active context occupancy, you **MUST** synchronize both the native `harness` store and the git-tracked `context/` markdowns by running:

```bash
python3 scripts/harness_sync.py update \
  --task <ahnaf-lead-ux|tanvir-red-agent|saad-range-control|master-integration> \
  --phase <PLAN|IMPLEMENT|EVALUATE> \
  --complete "What was completed and verified" \
  --next-step "Exact next atomic action for the next session or takeover engineer"

harness check run /home/ahnaf-zakaria/Downloads/Cydeline
```
