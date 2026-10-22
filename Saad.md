# Saad — Virtual Company Cyber Range & Trusted Control Plane (Target, Referee & Scoring)

**Role:** Backend Architecture, Isolated Virtual Company & Game Referee Owner  
**Harness Task ID:** `saad-range-control`  
**Live Harness Context File:** `context/SAAD_CONTEXT.md` | **Task Contract:** `context/contracts/saad-range-control.contract.md` | **Evaluation Ledger:** `context/evaluations/saad-range-control.eval.md`  
**Companion Reference Docs:** `00_READ_ME_FIRST.md`, `01_PRODUCT_REQUIREMENTS_DOCUMENT.md`, `04_OWNER_A_CYBER_RANGE.md`, `06_OWNER_C_CONTROL_SCORING.md`, `Agent_Instructions/SKILL.md`  
**Folders You Own:** `contracts/`, `scenarios/stolen-session/v1/`, `apps/target-api/`, `infra/range/`, `apps/control-api/`, `tests/target/`, `tests/control/`, `tests/isolation/`

---

## 1. High-Level Mission (In Plain English)

You own the entire backend engine of Sentinel Loop, which has two connected halves:

1. **The Virtual Company (`apps/target-api/` & `infra/range/` — Workstream A):**
   You build the miniature simulated company (*Northstar Analytics*) that is being attacked and defended. It has real login sessions, real access checks, a confidential finance document (`doc_finance_07`), a compromised employee (`maya@northstar.test` using stolen session `sess_A`), and a normal employee (`eli@northstar.test`) whose daily work must stay running.
2. **The Trusted Referee & Scoreboard (`apps/control-api/`, `contracts/`, `scenarios/` — Workstream C):**
   You build the central game referee that coordinates every turn between **Tanvir’s AI Intruder** and **Ahnaf’s Defender Dashboard**. It records every event in an unchangeable timeline, streams live alerts to Ahnaf’s screen, checks whether the player actually stopped the attack without breaking normal business, calculates the **0–100 report card**, and powers **Instant Replay** and **1-Click Reset**.

---

## 2. What You Deliver by the End

### Part 1: Shared Rules & Scenario Config (`contracts/`, `scenarios/stolen-session/v1/`)
- **Canonical Contracts (`contracts/`):** The shared enums and data models (`RunState`, `Outcome`, `Mode`, `AttackerAction`, `DefenderAction`, `Verification`, Event Envelope, and AI Proposal Envelope) that you, Tanvir, and Ahnaf all import.
- **Scenario v1 (`scenarios/stolen-session/v1/`):** The configuration for *"The Stolen Session"* and the rules for the 100-point grading rubric.

### Part 2: The Isolated Virtual Company (`apps/target-api/`, `infra/range/`)
- **Real Session & Document Access:**
  - Before containment, a request using `sess_A` can inspect session status, list documents, and read `doc_finance_07`.
  - When `revoke_session` is applied to `sess_A`, the very next request using `sess_A` is genuinely **denied** by the target server.
  - Meanwhile, unaffected coworker `eli@northstar.test` can still access his allowed documents.
  - If the defender uses `temporarily_disable_account` on Maya instead, Maya’s legitimate work is also disrupted until `restore_account` is called.
- **Target Audit Logs:** Every allowed or denied action creates a real audit log entry with a `correlation_id` and `target_audit_id`.
- **Target Adapter (7 Internal Functions):**
  - `create_fresh_target(run_id, seed, scenario_version)`
  - `execute_allowlisted_attacker_action(run_id, action, handles)`
  - `apply_defender_action(run_id, action, target)`
  - `get_target_events(run_id, cursor)`
  - `check_suspicious_session_denied(run_id)`
  - `check_benign_workflow(run_id)`
  - `destroy_target(run_id)`
- **Sandbox Safety & 1-Click Clean Reset:** The target runs in an isolated container/environment with no internet access and can be reset 10 times in a row with zero leftover sessions from old runs.

### Part 3: The Referee, Live Stream & 100-Point Scorer (`apps/control-api/`)
- **Database & Event Timeline (SQLite WAL):** Stores `runs`, `events` (with monotonic `sequence` per run), `agent_decisions`, `defender_actions`, `declarations`, `evidence_links`, `health_checks`, and `scores`.
- **Turn Orchestrator:** Takes a validated move from **Tanvir’s AI**, executes it against your **Virtual Company** via the Target Adapter, and saves the correlated audit event.
- **Browser API & Live Stream for Ahnaf’s Dashboard:**
  - `POST /api/runs` & `POST /api/runs/{run_id}/start` — Create and start a drill
  - `GET /api/runs/{run_id}/events` & `GET /api/runs/{run_id}/stream` — Paginated events + live Server-Sent Events (SSE) stream
  - `POST /api/runs/{run_id}/declare` — Validate that the clue IDs the player submitted actually exist and were visible in this run
  - `POST /api/runs/{run_id}/defender-actions` — Execute player containment actions safely (with idempotency so double-clicks don't apply twice)
  - `POST /api/runs/{run_id}/verify` — Run both live checks (`verify_suspicious_session_denied` + `verify_benign_workflow`)
  - `GET /api/runs/{run_id}/debrief` — Compute and return the 100-point scorecard:
    - Recognition & Evidence: **20 pts**
    - Effective Containment: **25 pts**
    - Recovery Verification: **20 pts**
    - Business Continuity (Eli’s workflow): **15 pts**
    - Proportionality (avoiding unnecessary shutdown): **10 pts**
    - Response Timeliness (based on virtual scenario clock, excluding AI thinking delay): **10 pts**
  - `GET /api/runs/{run_id}/replay` — Return the recorded match history without re-running the AI or target
  - `POST /api/runs/{run_id}/reset` & `GET /api/health`

---

## 3. How You Work in Parallel (Zero Waiting on Ahnaf or Tanvir)

1. **Step 1 — Publish `contracts/` and Sample JSON First (Day 1 Priority):**
   Create `contracts/` with the shared Pydantic/JSON schemas and give Ahnaf static JSON examples of the `/api/runs/*` responses so Ahnaf can build the UI immediately, and give Tanvir the `AttackerProposal` schema so Tanvir can build the AI immediately.
2. **Step 2 — Build & Test the Virtual Company Standalone (`apps/target-api/`):**
   Build the Northstar Analytics FastAPI app and write automated tests (`tests/target/`) proving that `sess_A` works before revocation, fails after revocation, and Eli's workflow keeps working.
3. **Step 3 — Build the Control Plane Using a Mock AI First (`apps/control-api/`):**
   Before plugging in Tanvir’s live Ollama service, test the entire Control Plane using a simple dummy function that proposes `inspect_session_status` → `list_accessible_documents` → `request_document`.
4. **Step 4 — Plug in Tanvir’s AI & Ahnaf’s Dashboard:**
   Connect Tanvir’s `choose_action()` function into your orchestrator loop and let Ahnaf’s frontend connect to your `/api/runs/*` endpoints.

---

## 4. Your Step-by-Step Checklist

- [ ] **1. Freeze Shared Contracts (`SL-001`):** Create monorepo folders and write canonical enums and Pydantic models in `contracts/`. Share sample JSON payloads with Ahnaf and Tanvir.
- [ ] **2. Build Virtual Company Target (`SL-002`, `SL-006`):** Build `apps/target-api/` with seeded users (`maya`, `eli`), session `sess_A`, protected file `doc_finance_07`, real session revocation, Eli's benign workflow probe, and target audit logs.
- [ ] **3. Build Control Plane & SQLite Store (`SL-004`):** Build `apps/control-api/` with SQLite tables, run state machine, and the Target Adapter connecting Control API to Target API.
- [ ] **4. Build Live Stream, Declaration & Containment Endpoints (`SL-008`):** Implement `/events`, `/stream` (SSE), `/declare`, `/defender-actions` (with idempotency), and `/verify` (running both live target probes).
- [ ] **5. Connect Tanvir’s AI (`SL-007`):** Wire Tanvir’s `services/red-agent/` into your turn scheduler so AI moves hit the Target API and generate correlated events.
- [ ] **6. Build 100-Point Scoring & Instant Replay (`SL-010`):** Implement the 100-point rubric, outcome gates (`defended_and_recovered`, `contained_but_disrupted`, `attacker_objective_reached`), and read-only `/replay`.
- [ ] **7. Isolation & 10x Reset Verification (`SL-012`):** Prove `reset` works cleanly 10 times in a row (`tests/target/`) and verify container network isolation (`tests/isolation/`).
