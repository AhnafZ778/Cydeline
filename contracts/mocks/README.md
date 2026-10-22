# `contracts/mocks/` — static learner-visible fixtures

Owned by Saad (`saad-range-control`). Consumers: Ahnaf's `apps/web/` and
Tanvir's `services/red-agent/`.

These files are **static copies of canonical server responses**. They validate
against `contracts/models.py` in `tests/control/test_contracts.py`.

| File | Canonical model | Typical use |
|---|---|---|
| `run.json` | `RunResponse` | Run header / lobby state |
| `event_page.json` | `EventPage` | Event table backfill |
| `sse_frames.jsonl` | `SSEFrame` | EventSource mock stream |
| `attacker_proposal.json` | `AttackerProposal` | Red-agent proposal envelope |
| `declaration.json` | `DeclarationResponse` | Incident declaration result |
| `defender_action.json` | `DefenderActionResponse` | Containment result |
| `verification.json` | `VerificationResponse` | Dual recovery checks |
| `debrief.json` | `DebriefResponse` | 100-point scorecard |
| `replay.json` | `ReplayResponse` | Read-only replay |
| `health.json` | `HealthResponse` | `/api/health` |
| `error.json` | `ErrorResponse` | Structured API error |

Rules:

1. These fixtures never contain `hidden_ground_truth`, an answer key, scores
   derived from hidden state, raw session secrets, or target internals.
2. `event_page.json` uses monotonic `sequence` values and `learner_visible: true`.
3. `run.json.fixture_hash` equals `contracts.scenario.scenario_fixture_hash()`.
4. The debrief fixture is an example only; the server recomputes every score
   from stored target outcomes.
