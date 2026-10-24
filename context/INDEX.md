<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py -->
# Sentinel Loop — Real-Time Harness Context & Instant Takeover Index

This directory (`context/`) is synchronized with the local `harness` engine (`.harness/contexts/*.json` and root `context.md`). It guarantees that **Ahnaf**, **Tanvir**, **Saad**, or any AI coding assistant (Cursor, Codex, Claude Code, Antigravity) can take over any segment at any moment without needing prior conversation history.

---

## Live Segment Status Matrix

| Task ID | Segment Owner | Lifecycle Phase | Context File | Blockers | Immediate Next Step |
|---|---|---|---|---|---|
| `master-integration` | Ahnaf (Lead Overseer) + Tanvir + Saad | **`EVALUATE`** | `context/MASTER_INTEGRATION_CONTEXT.md` | 1 BLOCKER(S) | Verify GitHub publication on chore/publish-workstreams, then brainstorm how beginners recognize ongoing AI activity. No AI-visibility behavior changes are authorized yet; preserve assessment blindness and measured AI-LEARN-01/02 limitations. |
| `ahnaf-lead-ux` | Ahnaf (Team Lead, Overseer & Defender Command Center UX) | **`EVALUATE`** | `context/AHNAF_CONTEXT.md` | NONE | Retain the verified UI and final-v8 evidence. Complete manual accessibility checks before conformance claims; follow AI-LEARN-01/02 for the next product-quality increment. Pilot sessions are user-deferred; kit ready. |
| `tanvir-red-agent` | Tanvir (Local AI Red-Team Engine Owner) | **`EVALUATE`** | `context/TANVIR_CONTEXT.md` | 1 BLOCKER(S) | Read KNOWN_ISSUES.md and the saved denied/unknown traces. Evaluate capability under a declared model/hardware or policy decision before another full matrix; preserve all failures, budgets, validation and independent review. Do not resume blind prompt retuning. |
| `saad-range-control` | Saad (Virtual Company Cyber Range & Trusted Control Plane Owner) | **`EVALUATE`** | `context/SAAD_CONTEXT.md` | 1 BLOCKER(S) | Identify a compatible operator-provided BIOS/IDE Windows image or installation medium, prepare the standalone qcow2, ensure at least6GiB available RAM, restart only the selected worker with WINDOWS_BASE_IMAGE configured, and verify a real desktop via Sandbox. |

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
