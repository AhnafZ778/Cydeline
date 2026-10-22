# Task contract: Master Integration (`master-integration`)

## Audience and outcome
- **Audience:** Ahnaf (Project Lead & Overseer), Tanvir (Local AI Red-Team Owner), Saad (Cyber Range & Control Plane Owner), and any takeover AI agent or engineer entering the repository mid-flight.
- **Outcome:** Coordinate and verify the end-to-end **Sentinel Loop** Competition MVP ("The Stolen Session" at fictional **Northstar Analytics**, `northstar.test`) across all three segments so that a human defender can investigate live telemetry, cite evidence, revoke the compromised session (`sess_A`), verify both suspicious-access denial and Eli's business continuity, inspect a deterministic 100-point debrief, replay the recorded trace without side effects, and reset the range cleanly 10 times consecutively.

## Current source identity
- **Repository:** `/home/ahnaf-zakaria/Downloads/Cydeline`
- **Branch:** `chore/publish-workstreams`
- **Harness Project ID:** `31fd9903-57c9-4f5f-9344-96cef387c8f6`
- **Authoritative Spec:** `01_PRODUCT_REQUIREMENTS_DOCUMENT.md`

## Acceptance examples (observable)
1. **G0 (Contract Freeze):** `contracts/` defines canonical Pydantic models and JSON Schemas for `RunState`, `Outcome`, `Mode`, `AttackerAction`, `DefenderAction`, `Verification`, `EventEnvelope`, `AttackerProposal`, and the 11 `/api/runs/*` endpoints; static mock fixtures unblock parallel work across `ahnaf-lead-ux`, `tanvir-red-agent`, and `saad-range-control`.
2. **G1 (First Live Causal Link):** A schema-valid, policy-valid proposal from `services/red-agent/` (Tanvir) is dispatched by `apps/control-api/` (Saad) through the Target Adapter to `apps/target-api/` (Saad), producing an actual HTTP result and correlated target audit event stored in SQLite WAL.
3. **G2 (Real Containment & Continuity):** Compromised session `sess_A` (`maya@northstar.test`) reads allowed resources before containment; after `revoke_session` is applied, subsequent `sess_A` requests are denied by `apps/target-api/`, `services/red-agent/` adapts or selects `stop`, and unaffected employee `eli@northstar.test` passes `verify_benign_workflow`.
4. **G3 (Full P0 Loop):** From `apps/web/` (Ahnaf), a learner executes `start -> monitor -> investigate -> declare with evidence -> contain -> verify (both probes) -> debrief -> replay -> reset` without manual database edits or terminal intervention.
5. **G4–G6 (Scoring, Replay & Security Release Gates):** 100-point rubric and outcome gates (`defended_and_recovered`, `contained_but_disrupted`, `attacker_objective_reached`) are deterministic; `/replay` is strictly read-only (`AT-07`); 10 consecutive resets leave zero stale sessions (`AT-08`); 0 out-of-policy model actions are accepted (`T-01`).

## Constraints and non-goals
- **Constraints:** One local quantized model (`Qwen3-1.7B Q4` via Ollama, candidate upgrade `Qwen3-4B Q4`) running 3 sequential logical roles (`scout`, `access_operator`, `adaptation_planner`); strictly 6 allowed attacker actions and 4 allowed defender actions; isolated target with no outbound Internet, no Docker socket, and no host secret mounts; Render-compatible HTTP port binding (`0.0.0.0:$PORT`) where applicable, while keeping the vulnerable target strictly unexposed to the public Internet.
- **Non-goals (P0):** No unrestricted offensive tooling, no shell execution, no arbitrary URLs, no parallel multi-model swarm, no external SIEM/EDR, no multi-tenant billing/leaderboards.

## Consequential decisions and reasons
1. **3-Person Parallel Segment Split (`Ahnaf`, `Tanvir`, `Saad`):**
   - **Saad (`saad-range-control`)** owns both FastAPI+SQLite backend services (`apps/target-api/` + `apps/control-api/` + `contracts/`) to eliminate backend-to-backend handoff latency.
   - **Tanvir (`tanvir-red-agent`)** owns the isolated local AI service (`services/red-agent/` + `tests/agent/` + `docs/model-card/`) so model benchmarking and prompt tuning never block backend or UI progress.
   - **Ahnaf (`ahnaf-lead-ux`)** owns cross-team orchestration, the 7-state React/TS SOC frontend (`apps/web/`), Playwright E2E (`tests/e2e/`), and the 3-minute demo (`docs/demo/`), building against static fixtures first.
2. **Dual-Layer Real-Time Context System:**
   - Every milestone update writes to both `.harness/contexts/<task>.json` (via `harness context checkpoint`) and git-tracked `context/<PERSON>_CONTEXT.md` (via `python3 scripts/harness_sync.py`) so any person or AI agent can take over any segment immediately without re-prompting history.

## Assumptions/unknowns
- **Unknowns to measure in Stage 0:** Exact CPU/RAM/GPU/VRAM on the demo laptop and measured cold/warm latency of `Qwen3-1.7B Q4` via Ollama; official competition track ID and submission portal deadline confirmation.

## Next increment
- Execute **Stage 0 & Stage 1 (`SL-001`)**: Finalize `contracts/` enums and JSON schemas, publish static mock fixtures for all 3 segments, and verify `harness check run` passes.

## Verification commands, interaction checks and required independent review
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- `harness check evaluate /home/ahnaf-zakaria/Downloads/Cydeline`
- `python3 scripts/harness_sync.py status`
- Independent evaluation required at Gates `G0`, `G3`, and `G6` using `harness-evaluate` (`context/evaluations/master-integration.eval.md`).

## Evidence locations
- `00_READ_ME_FIRST.md`
- `01_PRODUCT_REQUIREMENTS_DOCUMENT.md`
- `02_MASTER_BUILD_PROMPT.md`
- `Ahnaf.md`
- `Tanvir.md`
- `Saad.md`
- `context/INDEX.md`
