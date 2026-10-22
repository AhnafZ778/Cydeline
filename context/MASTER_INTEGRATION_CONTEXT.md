<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py — DO NOT DELETE SECTIONS -->
# Live Context & Instant Takeover Packet: `master-integration`

| Field | Value |
|---|---|
| **Segment / Task ID** | `master-integration` |
| **Assigned Owner** | Ahnaf (Lead Overseer) + Tanvir + Saad |
| **Active Lifecycle Phase** | **`PLAN`** (`PLAN` → `IMPLEMENT` → `EVALUATE`) |
| **Primary Handover Spec** | `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` |
| **Task Contract (`harness-plan`)** | `context/contracts/master-integration.contract.md` |
| **Evaluation Record (`harness-evaluate`)** | `context/evaluations/master-integration.eval.md` |
| **Checkpoint JSON Mirror** | `context/packets/master-integration.json` (mirrored to `.harness/contexts/master-integration.json`) |
| **Owned Directories** | `contracts/`, `scenarios/`, `apps/`, `services/`, `infra/`, `tests/`, `docs/` |

---

## 1. Instant Takeover Protocol (For Ahnaf or Any AI Agent)

If the current owner is blocked, offline, or switching AI sessions, run these **3 commands** to take over this segment with 100% context in under 5 seconds:

```bash
# 1. Reconcile harness checkpoint with current git tree & verification status
python3 scripts/harness_sync.py takeover --task master-integration

# 2. Native harness resume for this task packet
harness context resume /home/ahnaf-zakaria/Downloads/Cydeline --task master-integration

# 3. Run project-native verification checks
harness check run /home/ahnaf-zakaria/Downloads/Cydeline
```

---

## 2. Current Objective & Immediate Next Action

- **Goal:** Deliver and verify the end-to-end Sentinel Loop Competition MVP across Ahnaf (UX/Lead), Tanvir (Local AI Red-Team), and Saad (Target Range & Control Plane) through Gates G0-G6.
- **IMMEDIATE NEXT STEP (`next_step`):**
  > **Execute Stage 1 (SL-001): Scaffold contracts/ and scenarios/stolen-session/v1/ with canonical enums, Pydantic schemas, and static mock fixtures to pass Gate G0.**

---

## 3. Real-Time Execution Progress

### Completed Work (`completed`)
- [x] Reorganized foundation and workstream markdowns into sequential order 00 to 07
- [x] Created Ahnaf.md, Tanvir.md, and Saad.md parallel segment handover specifications
- [x] Enrolled repository in harness (project_id: 31fd9903-57c9-4f5f-9344-96cef387c8f6) and created Plan/Implement/Evaluate contracts
- [x] Created Takeover.md with developer AI prompts for Ahnaf, Tanvir, and Saad plus Emergency Mid-Flight Takeover Protocol

### Remaining Work (`remaining`)
- [ ] Execute Stage 1 (SL-001): Create monorepo directory skeleton, contracts/ schemas, and scenarios/stolen-session/v1/
- [ ] Pass Gate G1: First live model proposal -> control-api -> target-api -> audit event
- [ ] Pass Gate G2: Real session revocation + Eli continuity verification probe
- [ ] Pass Gate G3: Wire apps/web/ to live control-api SSE and REST endpoints
- [ ] Pass Gates G4-G6: 100-pt rubric, read-only replay, 30-trial AI benchmark, 10x reset test, and 3-minute demo

### Active Blockers (`blockers`)
- _None recorded_

### Open Uncertainties / Assumptions (`uncertainties`)
- Demo hardware CPU/RAM/GPU/VRAM and measured Ollama Qwen3-1.7B Q4 cold/warm latency must be recorded during Increment B1
- Official competition challenge track ID and submission deadline format to be confirmed by Product Lead (Ahnaf)


---

## 4. Full Harness Lifecycle Plan (`Plan` → `Implement` → `Evaluate`)

### Phase A — `harness-plan` (Architecture, Contracts & Decisions)
- Stage 0: Repo & hardware audit, order docs 00-07, create Ahnaf/Tanvir/Saad handoffs
- Stage 0: Establish Task Contracts (context/contracts/*.contract.md) and Evaluation ledgers (context/evaluations/*.eval.md)
- Gate G0: Freeze canonical enums (RunState, Outcome, Mode, AttackerAction, DefenderAction, Verification) and JSON schemas

### Phase B — `harness-implement` (Bounded Vertical Increments)
- Stage 1 (SL-001): Create monorepo skeleton, contracts/, scenarios/stolen-session/v1/, and static mocks
- Stage 2-3 (G1 / SL-002, SL-003, SL-007): Connect Tanvir's red-agent proposal -> Saad's control-api -> Saad's target-api -> correlated audit event
- Stage 4 (G2 / SL-004, SL-006, SL-008): Verify sess_A works pre-revocation, fails post-revocation, and Eli's benign workflow passes
- Stage 5 (G3 / SL-005, SL-009): Connect Ahnaf's 7-state SOC UI to Saad's live SSE + REST endpoints for full P0 loop
- Stage 6 (G4 / SL-010, SL-011): Implement 100-point deterministic rubric, outcome gates, and read-only replay

### Phase C — `harness-evaluate` (Independent Verification & Release Gates)
- Stage 7 (G5): First-time learner walkthrough, keyboard accessibility, and responsive viewport verification (320/390/768/1440px)
- Stage 7 (G6 / SL-012): 10 consecutive clean resets (AT-08), 0 out-of-policy model actions (T-01), prompt-injection rejection (T-03), cross-run isolation (T-11), and egress block (T-02)
- Release (SL-015): Pin digests/hashes and record uncut 3-minute chronological demo with honest fallback provenance


---

## 5. Accepted Task Contract Summary & Key Decisions

### Observable Acceptance Criteria (`acceptance`)
- Gate G0: Canonical enums, Pydantic/JSON schemas, and mock fixtures frozen in contracts/
- Gate G1: Validated local model action reaches isolated target-api and emits correlated target audit event
- Gate G2: Compromised sess_A allowed before revoke_session and denied after; eli@northstar.test benign workflow passes
- Gate G3: Full browser defensive loop (start -> monitor -> investigate -> declare -> contain -> verify -> debrief -> replay -> reset) runs end-to-end
- Gate G4-G6: 100-pt deterministic rubric, read-only replay (AT-07), 10x clean reset (AT-08), and 0 out-of-policy model actions (T-01)

### Consequential Decisions (`decisions`)
- Split execution into 3 parallel segments: ahnaf-lead-ux (Ahnaf), tanvir-red-agent (Tanvir), and saad-range-control (Saad)
- Combine Workstream A (target-api) and Workstream C (control-api + contracts) under Saad to eliminate backend-to-backend handoff friction
- Maintain dual-layer context (native harness context checkpoint + git-tracked context/*.md via scripts/harness_sync.py) for zero-context-loss takeover

### Architecture Entry Points (`architecture`)
- 01_PRODUCT_REQUIREMENTS_DOCUMENT.md
- 02_MASTER_BUILD_PROMPT.md
- AGENTS.md
- Agent_Instructions/SKILL.md
- context/contracts/master-integration.contract.md

### Verified Evidence Files (`evidence`)
- 00_READ_ME_FIRST.md
- 01_PRODUCT_REQUIREMENTS_DOCUMENT.md
- 02_MASTER_BUILD_PROMPT.md
- context/contracts/master-integration.contract.md
- context/evaluations/master-integration.eval.md
- Takeover.md


---

## 6. How to Update This Context in Real Time After Any Edit

Whenever you complete an increment, hit a blocker, or finish an evaluation on `master-integration`, run:

```bash
python3 scripts/harness_sync.py update \
  --task master-integration \
  --phase IMPLEMENT \
  --complete "Describe the completed increment and test run" \
  --next-step "Describe the exact next atomic task"
```

This single command atomically updates `.harness/contexts/master-integration.json`, `context.md`, `context/packets/master-integration.json`, `context/MASTER_INTEGRATION_CONTEXT.md`, and `context/INDEX.md`.
