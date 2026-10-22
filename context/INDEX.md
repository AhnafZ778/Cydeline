<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py -->
# Sentinel Loop — Real-Time Harness Context & Instant Takeover Index

This directory (`context/`) is synchronized with the local `harness` engine (`.harness/contexts/*.json` and root `context.md`). It guarantees that **Ahnaf**, **Tanvir**, **Saad**, or any AI coding assistant (Cursor, Codex, Claude Code, Antigravity) can take over any segment at any moment without needing prior conversation history.

---

## Live Segment Status Matrix

| Task ID | Segment Owner | Lifecycle Phase | Context File | Blockers | Immediate Next Step |
|---|---|---|---|---|---|
| `master-integration` | Ahnaf (Lead Overseer) + Tanvir + Saad | **`PLAN`** | `context/MASTER_INTEGRATION_CONTEXT.md` | NONE | Execute Stage 1 (SL-001): Scaffold contracts/ and scenarios/stolen-session/v1/ with canonical enums, Pydantic schemas, and static mock fixtures to pass Gate G0. |
| `ahnaf-lead-ux` | Ahnaf (Team Lead, Overseer & Defender Command Center UX) | **`PLAN`** | `context/AHNAF_CONTEXT.md` | NONE | Start Increment A1: Scaffold apps/web/ (React + TypeScript + Vite), add mock fixtures matching contracts/, and implement Lobby + Filterable SOC Event Feed + Evidence Basket. |
| `tanvir-red-agent` | Tanvir (Local AI Red-Team Engine Owner) | **`PLAN`** | `context/TANVIR_CONTEXT.md` | NONE | Start Increment B1: Implement services/red-agent/ (schemas, observation builder, two-stage validator, and tagged fallback) + unit tests in tests/agent/. |
| `saad-range-control` | Saad (Virtual Company Cyber Range & Trusted Control Plane Owner) | **`PLAN`** | `context/SAAD_CONTEXT.md` | NONE | Start Increment S1 (SL-001): Create contracts/ and scenarios/stolen-session/v1/ with canonical enums, Pydantic models, and static mock fixtures. |

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
