# Phase 1: Planning Segment Blueprint (`harness-plan`)

## 1. Purpose of the Planning Segment
Before writing or modifying code in any segment, verify that the segment's **Task Contract** (`context/contracts/<task>.contract.md`) is current and that shared cross-segment schemas in `contracts/` are frozen (`Gate G0`). Preserve existing contracts instead of replanning completed work.

---

## 2. Frozen Cross-Segment Contracts (Gate G0 — Immutable Without Lead Approval)

All three teammates (**Ahnaf**, **Tanvir**, **Saad**) and all AI agents must use these exact canonical enums unless `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` is explicitly amended:

```text
RunState       = created | running | contained | verification_pending | completed | timed_out | aborted | technical_failure
Outcome        = defended_and_recovered | contained_but_disrupted | attacker_objective_reached | timed_out_unresolved | aborted | technical_failure
Mode           = practice | assessment
AttackerAction = inspect_session_status | list_accessible_documents | request_document | test_existing_session | wait | stop
DefenderAction = revoke_session | temporarily_disable_account | require_reauthentication | restore_account
Verification   = verify_suspicious_session_denied | verify_benign_workflow
```

### Canonical Scenario v1 ("The Stolen Session" at Northstar Analytics)
- **Fictional Domain:** `northstar.test`
- **Compromised Employee:** `maya@northstar.test` with pre-seeded compromised session handle `sess_A`
- **Unaffected Employee:** `eli@northstar.test` (must retain legitimate document access)
- **Protected Resource:** `doc_finance_07`
- **Logical AI Roles (Sequential on 1 Model):** `scout` -> `access_operator` -> `adaptation_planner`

---

## 3. Segment-by-Segment Planning Specifications

### A. Saad's Planning Spec (`saad-range-control`)
- **Contract File:** `context/contracts/saad-range-control.contract.md`
- **Planned Architecture:**
  1. `contracts/`: Canonical Pydantic models + JSON Schema export + static mock payloads.
  2. `scenarios/stolen-session/v1/`: Seeded users, sessions, documents, background noise, and the 100-point rubric (`Recognition 20`, `Containment 25`, `Verification 20`, `Continuity 15`, `Proportionality 10`, `Timeliness 10`).
  3. `apps/target-api/`: Disposable Northstar Analytics FastAPI + SQLite app enforcing session/account state and emitting target-local audit logs.
  4. `apps/control-api/`: Trusted FastAPI + SQLite WAL control plane owning the 9 persistence tables, monotonic per-run `sequence`, SSE streaming (`/stream`), per-run lock serialization, dual verification probes, 100-pt rubric, and read-only `/replay`.

### B. Tanvir's Planning Spec (`tanvir-red-agent`)
- **Contract File:** `context/contracts/tanvir-red-agent.contract.md`
- **Planned Architecture:**
  1. `services/red-agent/`: Local Ollama client (`Qwen3-1.7B Q4` candidate, `Qwen3-4B Q4` comparison), sequential role prompt templates (`03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`), sanitized observation builder, two-stage validator (JSON Schema + role/action/handle allowlist), and bounded timeout handler with `"fallback_used": true` provenance tagging.
  2. `tests/agent/` & `docs/model-card/`: 30-trial schema validity harness ($\ge 28/30$), 10-pair pre/post-revocation adaptation harness ($\ge 8/10$), and validator fuzz/prompt-injection tests ($0$ policy violations).

### C. Ahnaf's Planning Spec (`ahnaf-lead-ux`)
- **Contract File:** `context/contracts/ahnaf-lead-ux.contract.md`
- **UI/UX Visual & Interaction Contract (`ui-ux-design`):**
  - **Style Grammar:** `Product / operational` + `Technical / industrial` clarity. High-contrast dark slate (`#0B0F17` / `#111827`), `tabular-nums` monospace for all IDs/timestamps, non-color-only semantic badges.
  - **Interaction Contracts:** `LIVE-01` (SSE `Last-Event-ID` cursor backfill + deduplication), `ASYNC-01` (preserve draft inputs on error), `SAFE-01`/`SAFE-02` (blast-radius warning on disruptive actions, Cancel default focus, idempotency key retention, no optimistic win states), `TABLE-01` (raw-value chronological ordering, preserved Evidence Basket across filters), `AI-01` (explicit `[FALLBACK]` vs `[LIVE MODEL]` provenance tags).
  - **7 Single-Page Workspace States:** (1) Briefing Lobby, (2) Live SOC Event Feed, (3) Investigation Drawer & Evidence Basket, (4) Incident Declaration, (5) Containment Console, (6) Dual Recovery Verification, (7) 100-Point Debrief & Read-Only Replay.
