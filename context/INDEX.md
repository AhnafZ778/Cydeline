<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py -->
# Sentinel Loop — Real-Time Harness Context & Instant Takeover Index

This directory (`context/`) is synchronized with the local `harness` engine (`.harness/contexts/*.json` and root `context.md`). It guarantees that **Ahnaf**, **Tanvir**, **Saad**, or any AI coding assistant (Cursor, Codex, Claude Code, Antigravity) can take over any segment at any moment without needing prior conversation history.

---

## Live Segment Status Matrix

| Task ID | Segment Owner | Lifecycle Phase | Context File | Blockers | Immediate Next Step |
|---|---|---|---|---|---|
| `master-integration` | Ahnaf (Lead Overseer) + Tanvir + Saad | **`EVALUATE`** | `context/MASTER_INTEGRATION_CONTEXT.md` | 1 BLOCKER(S) | Continue from Tanvir T1 model diagnostic and Saad S1/S2 Windows/host prerequisites; use explicit Ahnaf carryover checklists for integration, QA/accessibility, learning review and demo/release preparation. Pilot remains deferred; do not edit Ahnaf.md. |
| `ahnaf-lead-ux` | Ahnaf (Team Lead, Overseer & Defender Command Center UX) | **`EVALUATE`** | `context/AHNAF_CONTEXT.md` | NONE | UI/briefingcleanupcomplete; remaining manualactualWindowsbrowserinput andaccessibility plus BVMobserver/CtimedUI tasks are consolidated in docs/product/REMAINING_WORK.md. |
| `tanvir-red-agent` | Tanvir (Local AI Red-Team Engine Owner) | **`EVALUATE`** | `context/TANVIR_CONTEXT.md` | 1 BLOCKER(S) | Coordinate with Saad for full host live execution of 12-journey objective matrix on sealed VM/host; execute video recording per DEMO_SCRIPT.md. |
| `saad-range-control` | Saad (Virtual Company Cyber Range & Trusted Control Plane Owner) | **`PLAN`** | `context/SAAD_CONTEXT.md` | 1 BLOCKER(S) | Start S1/S2 actual Windows human check and expanded-host preflight; own the explicit Ahnaf carryover checklist through final QA/demo without waiting for Ahnaf. Coordinate AI/learning evidence with Tanvir. |

---

## 3-Command Takeover Cheat Sheet (Any Person / Any Agent)

### Take over Ahnaf's Segment (Lead, Overseer & Defender SOC UX)
```bash
python3 scripts/harness_sync.py takeover --task ahnaf-lead-ux
```
- **Context File:** `context/AHNAF_CONTEXT.md`
- **Task & Visual Contract:** `context/contracts/ahnaf-lead-ux.contract.md`
- **Evaluation Record:** `context/evaluations/ahnaf-lead-ux.eval.md`

### Take over Tanvir's Segment (Local AI Red-Team Engine)
```bash
python3 scripts/harness_sync.py takeover --task tanvir-red-agent
```
- **Context File:** `context/TANVIR_CONTEXT.md`
- **Task Contract:** `context/contracts/tanvir-red-agent.contract.md`
- **Evaluation Record:** `context/evaluations/tanvir-red-agent.eval.md`

### Take over Saad's Segment (Virtual Company Cyber Range & Control Plane)
```bash
python3 scripts/harness_sync.py takeover --task saad-range-control
```
- **Context File:** `context/SAAD_CONTEXT.md`
- **Task Contract:** `context/contracts/saad-range-control.contract.md`
- **Evaluation Record:** `context/evaluations/saad-range-control.eval.md`

### Take over Master Cross-Team Integration
```bash
python3 scripts/harness_sync.py takeover --task master-integration
```
- **Context File:** `context/MASTER_INTEGRATION_CONTEXT.md`
- **Task Contract:** `context/contracts/master-integration.contract.md`
- **Evaluation Record:** `context/evaluations/master-integration.eval.md`

---

## Real-Time Context Update Command (Run at Every Milestone / Handoff)

```bash
python3 scripts/harness_sync.py update \
  --task <ahnaf-lead-ux|tanvir-red-agent|saad-range-control|master-integration> \
  --phase <PLAN|IMPLEMENT|EVALUATE> \
  --complete "What was just implemented and verified" \
  --next-step "The next atomic increment to execute"
```
