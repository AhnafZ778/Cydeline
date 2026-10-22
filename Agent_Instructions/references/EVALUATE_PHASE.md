# Phase 3: Evaluation & Release Gate Segment Blueprint (`harness-evaluate`)

## 1. Independent Evaluation Rules
- After any material implementation increment (`S1–S4`, `B1–B3`, `A1–A4`) or integration gate (`G0–G6`), run `harness-evaluate` using a fresh evaluator perspective.
- Always run `harness check run /home/ahnaf-zakaria/Downloads/Cydeline` followed by `harness check evaluate /home/ahnaf-zakaria/Downloads/Cydeline` to verify that the command receipt matches the exact current source snapshot.
- Record the verdict (`pass | fail | blocked`), snapshot hash, concrete findings (`severity, location, trigger, actual behavior, expected behavior`), and unverified limits in `context/evaluations/<task>.eval.md`.
- **Never** modify application code or relax acceptance criteria during an evaluation pass; return findings to `harness-implement`.

---

## 2. Mandatory Acceptance Scenarios (`AT-01` through `AT-10`)

Every release evaluation must verify these 10 product invariants:

| ID | Scenario | Required Verification Proof | Segment |
|---|---|---|---|
| `AT-01` | Containment changes real state | Active `sess_A` succeeds before `revoke_session`; identical request with `sess_A` returns HTTP `denied` + new `target_audit_id` afterward | `saad-range-control` |
| `AT-02` | Legitimate service preserved | After revoking Maya's `sess_A`, Eli's `verify_benign_workflow` probe succeeds with correlated audit ID | `saad-range-control` |
| `AT-03` | Overbroad containment penalized | `temporarily_disable_account` on Maya without restoration yields `contained_but_disrupted` and proportionality/continuity score deductions | `saad-range-control` |
| `AT-04` | Attacker success cannot be faked | A model proposal claiming success in `reason` without a verified `target-api` HTTP read of `doc_finance_07` never triggers `attacker_objective_reached` | `saad-range-control` + `tanvir-red-agent` |
| `AT-05` | Fallback disclosure | Forced Ollama timeout or malformed JSON uses tagged fallback (`"fallback_used": true`) or records `technical_failure`; never presented as live autonomous AI | `tanvir-red-agent` + `ahnaf-lead-ux` |
| `AT-06` | Evidence cannot be forged | `/api/runs/{id}/declare` rejects nonexistent, future, hidden, or cross-run `event_id`s | `saad-range-control` |
| `AT-07` | Replay is read-only | Calling `GET /api/runs/{id}/replay` leaves `target-api` state, event count, and `agent_decisions` count unchanged | `saad-range-control` + `ahnaf-lead-ux` |
| `AT-08` | Reset cleans the range | 10 consecutive `reset` calls produce clean fixture hashes and invalidate all prior session handles | `saad-range-control` |
| `AT-09` | Defender timing is fair | Timeliness score (`10 pts`) uses `visible_at_utc` and scenario clock, excluding Ollama inference latency (`latency_ms`) | `saad-range-control` |
| `AT-10` | Isolation holds | Action validator rejects out-of-policy actions/handles (`0` accepted violations); `target-api` has no outbound internet, host secret, or Docker socket access | `tanvir-red-agent` + `saad-range-control` |

---

## 3. Gate-by-Gate Evaluation Matrix (`G0` -> `G6`)

- **Gate G0 (Contracts & Mocks):** `contracts/` schemas and static fixtures pass unit validation (`SL-001`).
- **Gate G1 (Live Model -> Target -> Audit):** Validated proposal from `services/red-agent/` reaches `apps/target-api/` via `apps/control-api/` and stores a correlated `events` row (`SL-007`).
- **Gate G2 (Real Defense & Continuity):** `revoke_session` denies subsequent `sess_A` access, triggers `adaptation_planner` adaptation/stop, and preserves Eli's workflow (`SL-006`, `SL-008`).
- **Gate G3 (Full P0 Vertical Slice):** Complete browser loop in `apps/web/` passes from Start to Reset (`SL-009`).
- **Gate G4 (Deterministic Rubric & Replay):** 100-point rubric and read-only `/replay` pass determinism and immutability checks (`SL-010`, `SL-011`).
- **Gate G5 (Usability, Responsive & Accessibility):** Viewports `320px`, `390px`, `768px`, and `1440px`, keyboard traversal, and first-time learner walkthrough pass (`FR-D08`).
- **Gate G6 (Security & 10x Reset QA):** All threat tests (`T-01` to `T-12`), 30-trial/10-pair AI benchmarks, and 10x consecutive clean resets pass (`SL-012`, `SL-013`).
