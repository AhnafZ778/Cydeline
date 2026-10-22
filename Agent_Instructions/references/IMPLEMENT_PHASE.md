# Phase 2: Building / Implementation Segment Blueprint (`harness-implement`)

## 1. Core Implementation Operating Rules
1. **Reconcile First:** Run `python3 scripts/harness_sync.py takeover --task <task>` before editing.
2. **Build in Vertical Increments:** Complete one atomic increment (`S1–S4`, `B1–B3`, or `A1–A4`) at a time, run project-native tests, and checkpoint immediately.
3. **Strict Trust Boundaries:**
   - **Never trust model output:** Validate JSON schema, enum allowlists, and opaque handles (`sess_A`, `doc_finance_07`) on the server.
   - **Never trust browser input:** All state transitions, evidence checks, idempotency keys, and scores are enforced by `apps/control-api/`.
   - **Never expose hidden ground truth:** Neither the browser nor the LLM observation builder may read the hidden scenario answer key.

---

## 2. Saad's Build Increments (`saad-range-control`)

### Increment S1 — Shared Contracts, Mocks & Scenario v1 (`SL-001`)
- **Files to create:**
  - `contracts/__init__.py`, `contracts/enums.py`, `contracts/models.py`, `contracts/adapter.py`, `contracts/mocks.py`
  - `scenarios/stolen-session/v1/scenario.json`, `scenarios/stolen-session/v1/rubric.json`
- **Deliverable:** Canonical enums, Pydantic DTOs for `EventEnvelope`, `AttackerProposal`, `AgentDecisionRecord`, `DeclarationRequest`, `DefenderActionRequest`, `VerificationResponse`, `DebriefResponse`, and `TargetAdapter` protocol, plus static JSON mock fixtures so Ahnaf and Tanvir can test against canonical payloads.

### Increment S2 — Isolated Northstar Target API (`SL-002`, `SL-006`)
- **Files to create:**
  - `apps/target-api/main.py`, `apps/target-api/store.py`, `apps/target-api/adapter_impl.py`
  - `infra/range/Dockerfile.target`, `tests/target/test_target_api.py`
- **Deliverable:**
  - Seeded users (`maya@northstar.test`, `eli@northstar.test`), active compromised session `sess_A`, Eli's benign session, and protected resource `doc_finance_07`.
  - Allowlisted attacker operations: `inspect_session_status`, `list_accessible_documents`, `request_document`, `test_existing_session`.
  - Defender operations: `revoke_session`, `temporarily_disable_account`, `require_reauthentication`, `restore_account`.
  - Verification probes: `check_suspicious_session_denied` and `check_benign_workflow`.
  - Deterministic `create_fresh_target` / `destroy_target` passing 10 consecutive clean resets (`AT-08`).

### Increment S3 — Trusted Control Plane, SQLite WAL & SSE (`SL-004`, `SL-007`, `SL-008`)
- **Files to create:**
  - `apps/control-api/main.py`, `apps/control-api/db.py`, `apps/control-api/orchestrator.py`, `apps/control-api/sse.py`
  - `tests/control/test_control_api.py`
- **Deliverable:**
  - 9 SQLite WAL tables (`scenario_versions`, `runs`, `events`, `agent_decisions`, `defender_actions`, `declarations`, `evidence_links`, `health_checks`, `scores`).
  - Browser REST + SSE endpoints: `POST /api/runs`, `POST /api/runs/{id}/start`, `GET /api/runs/{id}/events`, `GET /api/runs/{id}/stream` (with `Last-Event-ID` backfill), `POST /api/runs/{id}/declare`, `POST /api/runs/{id}/defender-actions` (with per-run lock + idempotency key), `POST /api/runs/{id}/verify`, `POST /api/runs/{id}/reset`, `GET /api/health`.

### Increment S4 — Deterministic 100-Pt Rubric, Outcome Gates & Replay (`SL-010`, `SL-012`)
- **Files to create:**
  - `apps/control-api/scoring.py`, `apps/control-api/replay.py`, `compose.yaml`, `tests/isolation/test_isolation.py`
- **Deliverable:**
  - `GET /api/runs/{id}/debrief` computing the 100-point rubric (`20+25+20+15+10+10`) with evidence ID citations and Outcome Gate overrides (`attacker_objective_reached`, `contained_but_disrupted`, `defended_and_recovered`).
  - `GET /api/runs/{id}/replay` serving the immutable recorded trace without calling `target-api` or `red-agent`.

---

## 3. Tanvir's Build Increments (`tanvir-red-agent`)

### Increment B1 — Schemas, Sanitized Observation Builder, 2-Stage Validator & Fallback (`SL-003`)
- **Files to create:**
  - `services/red-agent/__init__.py`, `services/red-agent/observation.py`, `services/red-agent/validator.py`, `services/red-agent/fallback.py`
  - `tests/agent/test_validator_and_roles.py`
- **Deliverable:**
  - `build_sanitized_observation()` exposing only `run_handle`, `assigned_role`, `step`, `steps_remaining`, `session_handles`, `allowed_target_ids`, `last_action`, `last_result`, `current_session_status`, and `permitted_actions`.
  - `validate_action(proposal, observation)` enforcing strict JSON schema + role/action/handle allowlists (`0` out-of-policy actions accepted).
  - Bounded timeout wrapper returning explicitly tagged `"fallback_used": true` fallback decisions on timeout or invalid model output.

### Increment B2 — Local Ollama Client & 3 Sequential Roles (`FR-B01`, `FR-B02`, `FR-B05`)
- **Files to create:**
  - `services/red-agent/prompts.py`, `services/red-agent/ollama_client.py`, `services/red-agent/service.py`
- **Deliverable:**
  - `choose_action(run_id, role, observation)` invoking Ollama (`Qwen3-1.7B Q4` default, configurable via `OLLAMA_MODEL`) with role prompts for `scout`, `access_operator`, and `adaptation_planner`, recording `model_id`, `prompt_hash`, `observation_hash`, and `latency_ms`.

### Increment B3 — 30-Trial & 10-Pair Benchmark Suite (`SL-013`)
- **Files to create:**
  - `services/red-agent/benchmark.py`, `docs/model-card/MODEL_CARD.md`
- **Deliverable:**
  - Automated benchmark runner testing 30 representative observations ($\ge 28/30$ schema-valid) and 10 paired pre/post-revocation states ($\ge 8/10$ adaptations/stops) and writing empirical metrics to `docs/model-card/MODEL_CARD.md`.

---

## 4. Ahnaf's Build Increments (`ahnaf-lead-ux`)

### Increment A1 — Mock-First 7-State SOC Workspace Shell (`SL-005`)
- **Files to create:**
  - `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/src/App.tsx`, `apps/web/src/api/client.ts`, `apps/web/src/api/mocks.ts`
  - `apps/web/src/components/LobbyView.tsx`, `apps/web/src/components/EventFeedTable.tsx`, `apps/web/src/components/InvestigationDrawer.tsx`, `apps/web/src/components/EvidenceBasket.tsx`
- **Deliverable:** States 1–3 working end-to-end against static fixtures (`VITE_USE_MOCKS=true`) with multi-field filtering, chronological sorting, and keyboard-accessible Evidence Basket selection.

### Increment A2 — Incident Declaration, Containment Console & Verification UI (`SL-005`, `SL-009`)
- **Files to create:**
  - `apps/web/src/components/DeclarationModal.tsx`, `apps/web/src/components/ContainmentConsole.tsx`, `apps/web/src/components/VerificationPanel.tsx`
- **Deliverable:** States 4–6 with blast-radius confirmation modal (Cancel default focus), client idempotency key generation, and independent dual recovery check indicators.

### Increment A3 — 100-Point Debrief, Read-Only Replay & Live Backend Wiring (`SL-009`, `SL-011`)
- **Files to create:**
  - `apps/web/src/components/DebriefView.tsx`, `apps/web/src/components/ReplayTimeline.tsx`, `apps/web/src/hooks/useRunStream.ts`
- **Deliverable:** State 7 scorecard with clickable `event_id` links, `[LIVE MODEL]` vs `[FALLBACK]` badges, step-by-step replay scrubber, and live SSE (`Last-Event-ID`) + REST wiring to Saad's `apps/control-api/`.

### Increment A4 — Playwright E2E Suite & 3-Minute Demo (`SL-011`, `SL-015`)
- **Files to create:**
  - `tests/e2e/defender_loop.spec.ts`, `docs/demo/DEMO_WALKTHROUGH.md`
- **Deliverable:** Automated browser E2E test verifying the complete defensive loop and reproducible 3-minute competition demo script.
