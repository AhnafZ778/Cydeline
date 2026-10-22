<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py — DO NOT DELETE SECTIONS -->
# Live Context & Instant Takeover Packet: `ahnaf-lead-ux`

| Field | Value |
|---|---|
| **Segment / Task ID** | `ahnaf-lead-ux` |
| **Assigned Owner** | Ahnaf (Team Lead, Overseer & Defender Command Center UX) |
| **Active Lifecycle Phase** | **`PLAN`** (`PLAN` → `IMPLEMENT` → `EVALUATE`) |
| **Primary Handover Spec** | `Ahnaf.md` |
| **Task Contract (`harness-plan`)** | `context/contracts/ahnaf-lead-ux.contract.md` |
| **Evaluation Record (`harness-evaluate`)** | `context/evaluations/ahnaf-lead-ux.eval.md` |
| **Checkpoint JSON Mirror** | `context/packets/ahnaf-lead-ux.json` (mirrored to `.harness/contexts/ahnaf-lead-ux.json`) |
| **Owned Directories** | `apps/web/`, `tests/e2e/`, `docs/demo/` |

---

## 1. Instant Takeover Protocol (For Ahnaf or Any AI Agent)

If the current owner is blocked, offline, or switching AI sessions, run these **3 commands** to take over this segment with 100% context in under 5 seconds:

```bash
# 1. Reconcile harness checkpoint with current git tree & verification status
python3 scripts/harness_sync.py takeover --task ahnaf-lead-ux

# 2. Native harness resume for this task packet
harness context resume /home/ahnaf-zakaria/Downloads/Cydeline --task ahnaf-lead-ux

# 3. Run project-native verification checks
harness check run /home/ahnaf-zakaria/Downloads/Cydeline
```

---

## 2. Current Objective & Immediate Next Action

- **Goal:** Oversee cross-team integration and deliver the 7-state React/TypeScript Defender Command Center (apps/web/), Playwright E2E suite (tests/e2e/), and 3-minute competition demo (docs/demo/).
- **IMMEDIATE NEXT STEP (`next_step`):**
  > **Start Increment A1: Scaffold apps/web/ (React + TypeScript + Vite), add mock fixtures matching contracts/, and implement Lobby + Filterable SOC Event Feed + Evidence Basket.**

---

## 3. Real-Time Execution Progress

### Completed Work (`completed`)
- [x] Defined Ahnaf's role, deliverables, and parallel workflow in Ahnaf.md
- [x] Authored complete task & visual contract in context/contracts/ahnaf-lead-ux.contract.md

### Remaining Work (`remaining`)
- [ ] Increment A1: Scaffold apps/web/ (React + TS + Vite) with static mock fixtures and build Lobby, Event Feed, Detail Drawer, and Evidence Basket
- [ ] Increment A2: Build Incident Declaration, Containment Console (with idempotency + warnings), and Dual Recovery Verification UI
- [ ] Increment A3: Build 100-Pt Debrief & Read-Only Replay views and connect live API + SSE to Saad's apps/control-api/
- [ ] Increment A4: Add Playwright E2E test in tests/e2e/ and record 3-minute demo in docs/demo/

### Active Blockers (`blockers`)
- _None recorded_

### Open Uncertainties / Assumptions (`uncertainties`)
- Awaiting Saad's live apps/control-api/ for Increment A3 live wiring (unblocked for Increments A1-A2 via static fixtures)


---

## 4. Full Harness Lifecycle Plan (`Plan` → `Implement` → `Evaluate`)

### Phase A — `harness-plan` (Architecture, Contracts & Decisions)
- Lock shared API endpoints (/api/runs/*), SSE event envelope, and error format with Saad and Tanvir (Gate G0)
- Establish UI/UX Visual Contract (Product / operational + Technical / industrial style grammar, WCAG 2.2 AA contrast, tabular-nums monospace IDs, ASYNC-01, LIVE-01, SAFE-01, SAFE-02, TABLE-01, AI-01)
- Define the 7 single-page workspace states: (1) Lobby Briefing, (2) Live SOC Feed + Filters, (3) Investigation Drawer + Evidence Basket, (4) Incident Declaration, (5) Containment Console, (6) Dual Recovery Verification, (7) 100-Pt Debrief + Read-Only Replay

### Phase B — `harness-implement` (Bounded Vertical Increments)
- Increment A1 (SL-005): Scaffold apps/web/ (React + TypeScript + Vite) with static mock fixtures and implement States 1-3 (Lobby, Filterable SSE Feed, Detail Drawer, Evidence Basket)
- Increment A2 (SL-005/SL-009): Implement States 4-6 (Incident Declaration form, Containment Console with blast-radius warnings + idempotency keys, and Dual Recovery Verification view)
- Increment A3 (SL-009/SL-011): Implement State 7 (100-Point Debrief scorecard with clickable event_ids + fallback_used provenance badges + Read-Only Replay) and wire VITE_USE_MOCKS=false to Saad's live apps/control-api/
- Increment A4 (SL-011/SL-015): Write Playwright E2E full-loop test in tests/e2e/ and record the 3-minute uncut demo in docs/demo/

### Phase C — `harness-evaluate` (Independent Verification & Release Gates)
- Verify LIVE-01: SSE disconnect/reconnect restores ordered events via Last-Event-ID without duplicates or lost Evidence Basket state
- Verify SAFE-01/SAFE-02: Disruptive containment shows confirmation with Cancel default focus; duplicate clicks send identical idempotency_key; UI never claims success before server confirmation
- Verify Responsive & Accessibility (D10 / WCAG 2.2 AA): Inspect at 320px, 390px, 768px, and 1440px; full keyboard traversal; prefers-reduced-motion respected
- Run fresh independent harness-evaluate / grill-my-ui review and record verdict in context/evaluations/ahnaf-lead-ux.eval.md


---

## 5. Accepted Task Contract Summary & Key Decisions

### Observable Acceptance Criteria (`acceptance`)
- FR-D01/D02: Lobby briefing + live SSE event table with filters (user, session, source, type, outcome, time) preserving monotonic sequence and Evidence Basket selections
- FR-D03/D04: Event Detail Drawer + Incident Declaration submitting visible event_ids and suspected_session (sess_A)
- FR-D05: Containment Console distinguishing revoke_session, temporarily_disable_account, require_reauthentication, and restore_account with blast-radius warnings and idempotency keys
- FR-D06: Recovery Verification view requiring both verify_suspicious_session_denied and verify_benign_workflow to pass
- FR-D07/D08: 100-point Debrief + Read-Only Replay with fallback provenance badges, keyboard accessibility, and Playwright E2E pass

### Consequential Decisions (`decisions`)
- Use Product/operational + Technical/industrial UI grammar with tabular-nums monospace identifiers and non-color-only status badges
- Build all 7 SOC states against static JSON fixtures first (Increment A1-A2) so UI work never blocks on Saad's backend
- Use a single-page state workspace so SSE connection and Evidence Basket persist across investigation, containment, and verification

### Architecture Entry Points (`architecture`)
- Ahnaf.md
- 07_OWNER_D_DEFENDER_UX_QA_DEMO.md
- context/contracts/ahnaf-lead-ux.contract.md
- apps/web/
- tests/e2e/
- docs/demo/

### Verified Evidence Files (`evidence`)
- Ahnaf.md
- 07_OWNER_D_DEFENDER_UX_QA_DEMO.md
- context/contracts/ahnaf-lead-ux.contract.md
- context/evaluations/ahnaf-lead-ux.eval.md


---

## 6. How to Update This Context in Real Time After Any Edit

Whenever you complete an increment, hit a blocker, or finish an evaluation on `ahnaf-lead-ux`, run:

```bash
python3 scripts/harness_sync.py update \
  --task ahnaf-lead-ux \
  --phase IMPLEMENT \
  --complete "Describe the completed increment and test run" \
  --next-step "Describe the exact next atomic task"
```

This single command atomically updates `.harness/contexts/ahnaf-lead-ux.json`, `context.md`, `context/packets/ahnaf-lead-ux.json`, `context/AHNAF_CONTEXT.md`, and `context/INDEX.md`.
