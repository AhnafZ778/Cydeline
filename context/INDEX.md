<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py -->
# Sentinel Loop — Real-Time Harness Context & Instant Takeover Index

This directory (`context/`) is synchronized with the local `harness` engine (`.harness/contexts/*.json` and root `context.md`). It guarantees that **Ahnaf**, **Tanvir**, **Saad**, or any AI coding assistant (Cursor, Codex, Claude Code, Antigravity) can take over any segment at any moment without needing prior conversation history.

---

## Live Segment Status Matrix

| Task ID | Segment Owner | Lifecycle Phase | Context File | Blockers | Immediate Next Step |
|---|---|---|---|---|---|
| `master-integration` | Ahnaf (Lead Overseer) + Tanvir + Saad | **`EVALUATE`** | `context/MASTER_INTEGRATION_CONTEXT.md` | 1 BLOCKER(S) | Handoffready: Tanvir startsT1 savedmodeldiagnostic andSaad startsS1/S2 actualWindowsverification/expandedhostpreflight. Coordinate directly under Tanvir.md/Saad.md; do noteditAhnaf.md; pilotdeferred. |
| `ahnaf-lead-ux` | Ahnaf (Team Lead, Overseer & Defender Command Center UX) | **`EVALUATE`** | `context/AHNAF_CONTEXT.md` | NONE | UI/briefingcleanupcomplete; remaining manualactualWindowsbrowserinput andaccessibility plus BVMobserver/CtimedUI tasks are consolidated in docs/product/REMAINING_WORK.md. |
| `tanvir-red-agent` | Tanvir (Local AI Red-Team Engine Owner) | **`PLAN`** | `context/TANVIR_CONTEXT.md` | 1 BLOCKER(S) | Start T1: reproduce saved Reporting service-dependent denied/unknown modelchoice diagnostic; coordinate modelcapacity/preflight with Saad. Follow T1-T7 gates in Tanvir.md and preserve10of12FAIL/51989ms tail. |
| `saad-range-control` | Saad (Virtual Company Cyber Range & Trusted Control Plane Owner) | **`PLAN`** | `context/SAAD_CONTEXT.md` | 1 BLOCKER(S) | Start S1/S2: humancheck installedWindowsbrowser and inventory/failclosed readiness for proposedexpandedhost; coordinate pinnedmodelcapacity withTanvir. Own remainingfrontend/integration withoutwaitingforAhnaf, per Saad.md. |

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
