# Workstream 03 — Trusted Control Plane, Incident Engine & Scoring
**Owner:** Engineer C | **Mission:** make the exercise coherent, authoritative, auditable and fair, independent of AI narration and browser state.

## You own
`apps/control-api/`, `contracts/`, canonical scenario specification, server-run lifecycle, orchestration schedule, canonical event store, SSE, authorized defender commands, incident declaration, verification, deterministic scoring, immutable replay, integration contracts and release coordination. You do not invent target HTTP outcomes or let AI decide grades.

## Core design principle
**The control plane is the source of truth about the exercise; the target is the source of truth about what access actually happened.** C accepts target evidence with strict run/correlation validation and stores canonical events. C never treats the model's description of success as a verified outcome. The browser receives a filtered learner view, not ground truth.

### Required P0 modules
1. **Scenario specification:** versioned `stolen-session-v1` config, actors, target IDs, reviewed action set, starting state, win/loss states, benign workflows, scoring rubric and seeded background events. Co-review with A/B/D.
2. **Run lifecycle:** create/start/pause practice only/stop/reset; one active target per local demo; explicit states and terminal outcomes. Use stable run IDs, fixture hash and timestamps.
3. **Orchestration:** schedule B's bounded decisions, dispatch to A through typed adapter, ingest A's measured target result, apply defender actions to A, and update run state. Separate inference time from learner-visible event timing.
4. **Persistence:** SQLite WAL tables for runs, events, agent decisions, defender actions, evidence links, verification checks and score breakdowns. Events immutable and sequenced; reset creates fresh target state without rewriting history.
5. **Live event delivery:** SSE with monotonic IDs, `Last-Event-ID`/cursor reconnect, backfill, dedup and filtering. Learner sees only released events; no future answers.
6. **Investigation/declaration:** receive suspected actor/session and event IDs; verify IDs belong to the run and were visible to learner; store declaration and time.
7. **Defender command processing:** run-scoped authorization, input validation, idempotency keys, audit trail, state transition from A's actual response; deny direct browser-to-target access.
8. **Recovery verification:** call A's measured compromised-session-denial probe and legitimate-workflow probe; store results and correlation IDs; never mark recovered on one check alone.
9. **Deterministic scoring:** server-owned 100-point rubric with event/action/check references; terminal outcomes override cosmetic points. Scores are computed from stored facts, not model output.
10. **Read-only replay:** return the exact recorded event/action trace in order; never re-run model or target actions. Include timestamps, evidence IDs and fallback flags.
11. **API errors and observability:** structured errors, health checks, audit of unexpected failures; separate model/target/control health.

### Suggested scoring rubric (frozen in reviewed scenario)
| Dimension | Points | Evidence |
|---|---:|---|
| Recognition and evidence selection | 20 | Declaration + valid event links |
| Effective containment | 25 | Real post-action target denial |
| Recovery verification | 20 | Both live checks executed |
| Legitimate business continuity | 15 | Defined benign tasks pass |
| Proportionality | 10 | Avoidable disruption and unnecessary actions |
| Timeliness | 10 | Time from first visible signal to effective containment |

**Outcome rules:** attacker reached protected document → `attacker_objective_reached` regardless of later recovery; containment with disrupted benign task → `contained_but_disrupted`; missing verification → `timed_out_unresolved`/unverified; model timeout → technical/fallback status as appropriate. Do not use arbitrary penalties without reviewed rules. Version rubric and explain every component with event IDs.

### API and data contract
Implement the browser API in `00_START_HERE_SHARED_CONTRACT.md`. Freeze Pydantic DTOs and OpenAPI by end of 22 Oct; D develops against generated fixtures. A/B communicate only through typed run-scoped adapters. Use C's event sequence as the SSE ID. All writes require run authorization and input validation.

### Must-pass integration tests
- Complete start → model action → real target event → SSE → defender revoke → target denial → benign pass → debrief → reset.
- Same idempotency key submitted twice: only one applied defender action and score impact.
- Disconnect/reconnect SSE: no lost or duplicate event in client after cursor backfill.
- Evidence ID from another run, hidden event or future event: rejected.
- Replay: compare recorded trace hash before/after; no mutation of A's target and no new B inference.
- Attacker succeeds early: correct terminal outcome even if learner later revokes access.
- Defender disables all users: availability/proportionality penalties and no false full recovery.
- Model timeout or target error: bounded terminal/fallback state, no stuck `running` session.
- Reset x10 and two-run isolation; stale handles never valid in new run.

### Red-team your own segment
- Event-ordering errors can make scores unfair.
- If C trusts a client-provided `outcome=success`, scores are forgeable.
- If learner browser receives hidden event or answer key, the assessment is compromised.
- If recovery checks are inferred rather than measured, the core product claim fails.
- If replay re-executes attacks, it is neither safe nor reproducible.

### Daily tickets
- **22 Oct:** publish canonical JSON/OpenAPI contracts, scenario v1, scoring rubric, mock SSE and debrief fixtures.
- **23 Oct:** run creation, SQLite persistence, typed A/B adapters, action/event ingestion.
- **24 Oct:** SSE, declaration, containment, measured verification.
- **25 Oct:** full P0 run including scoring, replay and reset.
- **26–28 Oct:** idempotency, reconnect, cross-run security, replay hashes, fault injection, rubric audit.
- **29–31 Oct:** integration lead, release gate sign-off, trace evidence for demo.

## Definition of done
An auditor can take a finished run and independently reconstruct which model action executed, which target request succeeded or failed, what the learner saw, which containment action applied, what the two recovery checks measured, and exactly why the final outcome and score were assigned. No AI or browser calculation can override that record.

## Useful references
FastAPI/Pydantic, SQLite WAL, pytest/httpx, SSE/EventSource. Study CyberBattleSim for action/state abstractions and Ares for trace provenance, without importing their entire runtimes.
