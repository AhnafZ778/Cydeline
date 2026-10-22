# Task contract: Saad — Virtual Company Cyber Range & Trusted Control Plane (`saad-range-control`)

## Audience and outcome
- **Audience:** Ahnaf's `apps/web/` SOC frontend (REST + SSE consumer), Tanvir's `services/red-agent/` decision engine (orchestrated turn provider), competition judges inspecting backend authenticity, and any engineer/agent taking over Saad's segment.
- **Outcome:**
  1. Deliver `contracts/` and `scenarios/stolen-session/v1/`: canonical Pydantic/JSON schemas and the reviewed Northstar Analytics scenario + 100-point rubric configuration.
  2. Deliver `apps/target-api/` & `infra/range/` (Workstream A): the isolated fictional Northstar Analytics FastAPI + SQLite target with real session/account enforcement, target-local audit logs, benign Eli workflow probe, and 10x deterministic reset.
  3. Deliver `apps/control-api/` (Workstream C): the trusted FastAPI + SQLite WAL control plane owning run lifecycle, per-run lock serialization, monotonic `sequence` event store, SSE live streaming with `Last-Event-ID` backfill, incident declaration validation, idempotent defender actions, dual recovery verification, deterministic 100-point rubric + outcome gates, and read-only replay.

## Current source identity
- **Repository:** `/home/ahnaf-zakaria/Downloads/Cydeline`
- **Segment Task ID:** `saad-range-control`
- **Owned Paths:** `contracts/`, `scenarios/stolen-session/v1/`, `apps/target-api/`, `infra/range/`, `apps/control-api/`, `tests/target/`, `tests/control/`, `tests/isolation/`, `context/SAAD_CONTEXT.md`
- **Authoritative Specs:** `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` (Sections 4, 5 Epics A & C, 7, 8, 10, 11, 12), `04_OWNER_A_CYBER_RANGE.md`, and `06_OWNER_C_CONTROL_SCORING.md`

## Acceptance examples (observable)
1. **SL-001 (Canonical Contracts & Scenario v1):** `contracts/` defines `RunState`, `Outcome`, `Mode`, `AttackerAction`, `DefenderAction`, `Verification`, `EventEnvelope`, `AttackerProposal`, `AgentDecisionRecord`, and Target Adapter types; `scenarios/stolen-session/v1/` defines `maya@northstar.test`, `eli@northstar.test`, `sess_A`, `doc_finance_07`, and the 100-point rubric bands.
2. **FR-A01–FR-A06 & AT-01/AT-02/AT-08 (Target Truth & 10x Reset):**
   - Active `sess_A` can inspect status, list documents, and read `doc_finance_07` on `apps/target-api/`, emitting correlated `AuditEntry` records.
   - Calling `apply_defender_action(run_id, "revoke_session", "sess_A")` causes the next request with `sess_A` to return HTTP `denied` with a correlated audit entry, while `check_benign_workflow(run_id)` for `eli@northstar.test` succeeds.
   - Calling `apply_defender_action(run_id, "temporarily_disable_account", "maya")` blocks `sess_A` but disrupts Maya's legitimate account state until `restore_account`.
   - 10 consecutive `reset` / `create_fresh_target` cycles produce clean fixture hashes and invalidate all prior handles (`AT-08`).
3. **FR-C01–FR-C06 (Trusted Orchestration, SSE & Idempotent Defense):**
   - `apps/control-api/` persists all 9 SQLite WAL tables (`scenario_versions`, `runs`, `events`, `agent_decisions`, `defender_actions`, `declarations`, `evidence_links`, `health_checks`, `scores`).
   - `/api/runs/{id}/stream` emits learner-visible SSE events with monotonic `sequence` and supports `Last-Event-ID` cursor backfill without duplicates.
   - `/api/runs/{id}/declare` rejects nonexistent, hidden, or cross-run `event_id`s (`AT-06`).
   - `/api/runs/{id}/defender-actions` enforces per-run serialization locking (`T-07`) and deduplicates repeated `idempotency_key` submissions (`SAFE-02`).
4. **FR-C07–FR-C09 & AT-03/AT-04/AT-07 (Deterministic 100-Pt Rubric & Read-Only Replay):**
   - Computes Recognition (`20`), Containment (`25`), Verification (`20`), Continuity (`15`), Proportionality (`10`), and Timeliness (`10` using virtual scenario time, excluding model inference latency `AT-09`).
   - Enforces Outcome Gates: verified read of `doc_finance_07` -> `attacker_objective_reached` (`AT-04`); disrupted benign workflow -> `contained_but_disrupted` (`AT-03`); both verification probes required for `defended_and_recovered`.
   - `/api/runs/{id}/replay` reads exclusively from immutable SQLite records without invoking `apps/target-api/` or `services/red-agent/` (`AT-07`).

## Constraints and non-goals
- Never expose `apps/target-api/` directly to the learner browser or public internet; all interaction flows through `apps/control-api/`'s allowlisted Target Adapter.
- Never trust model text (`reason`) to mark an attack successful; require correlated target HTTP outcome + `target_audit_id`.
- Bind HTTP servers to `0.0.0.0:$PORT` (with sensible local defaults e.g. `8000` for `control-api` and internal-only `8001` for `target-api`).

## Consequential decisions and reasons
1. **In-Process + HTTP Target Adapter Interface:** Defining `TargetAdapter` as a clean Python protocol in `contracts/` allows fast in-process/ASGI testing during unit/integration tests (`tests/target/`, `tests/control/`) and isolated container HTTP transport in `compose.yaml`.
2. **SQLite WAL Mode with Explicit Schema Migration:** Zero external DB broker overhead while supporting concurrent SSE readers and serialized per-run writer locks.

## Assumptions/unknowns
- Container isolation (`compose.yaml` with `internal: true` network for `target-api`, dropped capabilities, `no-new-privileges`, memory/CPU limits) will be used on the demo host; if a dedicated disposable VM is available, `infra/range/` will support it.

## Next increment
- **Increment S1 (PLAN -> IMPLEMENT):** Create `contracts/` (canonical enums, Pydantic models, JSON schema exporter, and static mock fixtures for Ahnaf and Tanvir) and `scenarios/stolen-session/v1/` (`scenario.json` + `rubric.json`).

## Verification commands, interaction checks and required independent review
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- `python3 -m unittest discover -s tests/target -v`
- `python3 -m unittest discover -s tests/control -v`
- Independent evaluation via `harness-evaluate` (`context/evaluations/saad-range-control.eval.md`).

## Evidence locations
- `Saad.md`
- `04_OWNER_A_CYBER_RANGE.md`
- `06_OWNER_C_CONTROL_SCORING.md`
- `context/SAAD_CONTEXT.md`
