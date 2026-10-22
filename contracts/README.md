# `contracts/` — frozen cross-segment schemas (Gate G0)

Owner: Saad (`saad-range-control`). Consumers: Ahnaf (`apps/web/`), Tanvir
(`services/red-agent/`), and Saad's `apps/target-api/` + `apps/control-api/`.

## What is frozen

| Module | Contents |
|---|---|
| `enums.py` | The six canonical enums from PRD 8.1 plus shared vocabulary (`Role`, `SessionStatus`, `AccessOutcome`, `EventSource`, `EventType`, `HealthStatus`, `ScoreDimension`). |
| `models.py` | Pydantic DTOs: `EventEnvelope`, `AttackerProposal`, `AgentDecisionRecord`, `DeclarationRequest/Response`, `DefenderActionRequest/Response`, `VerificationResponse`, `DebriefResponse`, `RunResponse`, `EventPage`, `SSEFrame`, `ReplayResponse`, `HealthResponse`, `ErrorResponse`. |
| `adapter.py` | `TargetAdapter` protocol with the seven PRD 8.5 methods and typed result models. |
| `scenario.py` | Loader and invariant checker for `scenarios/stolen-session/v1/`. |
| `mocks.py` | Loader/validator for the static fixtures in `contracts/mocks/`. |
| `schemas/` | Generated JSON Schemas + `enums.json` for non-Python consumers. |

## Regenerate JSON Schemas

```bash
python -m contracts.export_schemas
```

Commit the regenerated `contracts/schemas/` files with any model change.
`tests/control/test_contracts.py::SchemaExportTests` fails if they drift.

## Import (Python)

```python
from contracts import (
    AttackerProposal,
    DefenderAction,
    EventEnvelope,
    RunState,
    TargetAdapter,
)
```

`services/red-agent/` is a standard-library-only source root today; its
`PROPOSAL_FIELDS`, `ATTACKER_ACTIONS`, `ROLES`, `SESSION_STATUSES`,
`LAST_RESULTS`, and identifier grammar are asserted equal to this package by
the parity tests.

## Mocks (TypeScript / tests)

`contracts/mocks/*.json` are learner-visible payloads only. Copy them into
`apps/web/src/api/mocks.ts` or load them from tests. They never contain
`hidden_ground_truth`.

## Change policy

A semantic change to a canonical enum or DTO requires:

1. A PRD amendment (`01_PRODUCT_REQUIREMENTS_DOCUMENT.md`).
2. A note in `context/contracts/master-integration.contract.md`.
3. A `CONTRACT_SCHEMA_VERSION` bump and regenerated `contracts/schemas/`.
4. A passing `python -m unittest discover -s tests/control -v`.
