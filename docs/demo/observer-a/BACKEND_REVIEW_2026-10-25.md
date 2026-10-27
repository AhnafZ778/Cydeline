# Independent backend review — observer milestone A

Current disposition: **SCOPED BACKEND PASS after three reproduced findings were fixed and independently rechecked.** Historical failed reviews remain below.

Date: 2026-10-25. Fresh evaluator context; read-only code review. Scope is current observer backend on existing legacy scenarios. This review does not approve milestones B/C, Windows readiness, a fifteen-minute opponent, model efficacy, rendered UI or deployment.

## Initial disposition (superseded by final recheck below)

**FAIL — two P2 findings reproduced in isolated temporary TestClient ranges.** The focused suite passes, but its coverage misses these failures. Implementation fixes and an independent recheck are required.

1. **P2 — visual write errors can omit the required recording gap.** `services/range_runtime/api.py:467` catches only `DomainError` around visual `observer.emit`. Injecting `OSError` yields HTTP 500 while the persisted capture remains `accepted=true`, `gap=false`, with the exercise running. A disconnected tab cannot repair the metadata afterward. Catch ordinary visual-write errors, persist a monotonic gap and stop that segment; preserve gameplay when core audit remains healthy. If core state cannot be persisted, fence rather than silently claiming uninterrupted recording.

2. **P2 — rejected model fields remain plaintext beyond the encrypted retention path.** `services/range_runtime/agent.py:266` builds a rejection from exception text; `services/range_runtime/engine.py:1111` persists it unchanged in legacy decision/run metadata. A mocked actual LocalAgent reply with invalid role `private-invalid-output` is correctly rejected without dispatch, but the marker remains in unencrypted `agent_decisions.rejection_reason` and `last_decision`. Redacting only the proposal reason/raw proposal does not cover validation diagnostics. Keep the actual diagnostic in sealed observer evidence; legacy metadata needs a safe stage/code or authored generic summary.

## Checks and observations

- Ran `.venv/bin/python -m pytest tests/control/test_observer.py tests/control/test_contracts.py tests/agent/test_contracts_adapter.py -q`: **65 passed**, one existing Starlette/httpx deprecation warning, 6.76 seconds. Includes 19 observer tests; canonical enum and exported schema parity pass.
- Additional independent disposable matrix: in both practice and assessment, all four live observer paths and live export were denied to the trainee; snapshot strategy was absent; an active observer SSE emitted `revoked` after persisted session expiry; own aborted review succeeded and stranger review was denied (six grouped checks passed). An initial version of this auxiliary check mistakenly re-entered application lifespan for each client, triggering intentional assessment restart failure; corrected to the project fixture pattern before the reported checks.
- Used two disposable temporary target/control databases and TestClient for the reproductions; no existing run, fixture server, browser or user runtime was changed.
- Inspected server-side live trainee restrictions in both modes, observer-only route barrier, active grant/expiry checks, own-terminal history, session cache expiry repair, per-run sequence/cursors, encrypted records/key permissions, seven/thirty-day logical purge, admission reservation and quotas, model recording/correlation, validator and dispatch fences.
- The new record callback fences before model/target work after core write failure, and the post-inference observer_failed check fences a proposal even when maintenance cannot persist terminal state. Focused regressions pass.
- Model instrumentation wraps existing selector/action calls; no added model narration call and no private thinking field is recorded. Final reply plus stated intent are evidence, not proof of adaptive efficacy.

## Limits

- This is a scoped source and focused-test review. No production disk exhaustion/forensic deletion, multiprocess authority, private-LAN/TLS deployment or load qualification was performed. Logical SQLite retention is not a forensic secure-erasure claim.
- The current model objective gate remains **FAIL, 10/12**; waits/stops do not establish a successful pivot. Live coaching latency qualification and participant study remain separate unresolved/deferred gates.
- Real Windows, VM read-only gateway/recording, sealed dedicated host and timed broker/scoring are future B/C gates and are not claimed here.

## Evaluated source identity

Branch: chore/publish-workstreams. HEAD: dffe457a3dacc83d970b515b9451d02ae63a540c. Dirty tree reviewed; hashes below identify the inspected backend snapshot.

| File | SHA-256 |
| --- | --- |
| `services/range_runtime/observer.py` | `df9bdd927299ec170cb1f8e235d75eca150b48339a0cc90ec1d92a88c30c3b82` |
| `services/range_runtime/api.py` | `fcb568fceff6330ff4c6ab1ef7f7e6b30660bafa90e37b1cb12f4c86ba1d0646` |
| `services/range_runtime/engine.py` | `68186c6ec624c54da6d8401c204e6c9c9afe75f004f02511bade9a94cb61687a` |
| `services/range_runtime/agent.py` | `7bace6259521541232d6babff6dca5888d50ae9bdd59ae251e4d43ba47957b90` |
| `services/range_runtime/db.py` | `79860073a117f029a45066d6417ab8a15a382c45c5e5701afd8c29c4fa3b9315` |
| `contracts/runtime.py` | `cc66b87c14072ea6be49fd3405bbf14bf7e851fc386c1a54d9d6b14c6220fd4b` |
| `contracts/schemas/ObserverGrantRequest.schema.json` | `71d7a962bb38fbf012de6ae240d9bf466d2699505742c98923d0db18989fb273` |
| `contracts/schemas/CaptureConsent.schema.json` | `2efc493a7a80884178b728cc1fe270c4c2fc4800597c36bdbe6c8f75647ae627` |
| `contracts/schemas/CaptureChunk.schema.json` | `16e85f0e11bc62e201d8b381b8d8dda3718c4242237d4f461b6467fb579421f5` |
| `tests/control/test_observer.py` | `349297fa9c7c3ec374e7dcafbde23b3b0bb2a154a793430478026d2a6f66ab92` |

## First independent fix recheck

The implementer added ordinary visual-write exception handling, durable gap/stop state and a global fence when that state cannot persist; legacy rejection text is replaced only after sealed validation capture. Fresh focused run: **68 passed** (22 observer plus schema/canonical/adapter), one existing warning, 10.38 seconds. The two original reproductions are covered by the new regressions and pass.

**FAIL retained — adjacent P2 capture index commit failure.** In the success path after `observer.emit` commits the visual chunk, `state.next_index` is saved in a separate unguarded metadata write (`services/range_runtime/api.py`, `capture_chunk`, success-path `store.put`). A disposable TestClient with this metadata write raising `OSError` produced HTTP 500, `accepted=true`, `next_index=0`, `observer_failed=false`. Retrying the identical capture ID/index after removing the fault produced HTTP 200 and **two stored sealed chunks for index 0**. Failing core authority state must fence dispatch, or the chunk/index must commit atomically; it must not leave apparently valid capture sequencing after an uncertain acknowledgement. No production or shared fixture mutation was used.

Recheck API SHA-256: `0ce2993318de8d444f08803ac6fa90eccc1b556c402a7fe57c79fcef71aa1106`. Recheck engine SHA-256: `20e0500d9f39dc8ee59ff4af4f9b07c0c5ca3b6e4e7c816e25c6c323b89efec6`.

## Final independent fix recheck — scoped backend PASS

The success-path capture index update now sits inside the same guarded visual operation. A failure records `gap=true`, `accepted=false`; if even that metadata cannot persist, the global dispatch fence and best-effort technical failure activate. This is an explicitly incomplete stopped segment, not a claim of atomic capture continuity.

Fresh command: `.venv/bin/python -m pytest tests/control/test_observer.py tests/control/test_contracts.py tests/agent/test_contracts_adapter.py -q`: **69 passed** (23 observer plus 46 schema/canonical/adapter), one existing Starlette/httpx deprecation warning, 8.11 seconds.

Independent disposable TestClient replay of the adjacent fault confirms:

| Failure | First response | Persisted result | Retry | Sealed chunks |
| --- | --- | --- | --- | --- |
| One-shot index metadata fault after chunk commit | 507 | gap=true, accepted=false, next_index=1; gameplay running | 403 | 1 |
| Persistent index/gap metadata failure after chunk commit | 507 | observer_failed=true; run technical_failure | 507 | 1 |

The original visual OSError and rejected-model-field findings are resolved by the independently passing regressions. The actual invalid final output/diagnostic remains available only through encrypted observer history; the public legacy record uses an authored safe rejection summary. No out-of-policy action dispatch was observed.

No remaining actionable finding was identified in this bounded backend review. This disposition covers source and focused behavior on the exact snapshot below. It does not waive final stable native Harness checks, the separate rendered UI/replay review, full host/load/isolation gates, Windows proof, or the existing failed model/learning gates. Future backend edits require a proportional recheck. The coordinator owns the shared task checkpoint and native check receipt so parallel reviewers do not overwrite that state.

### Final evaluated source hashes

Branch: `chore/publish-workstreams`; HEAD: `dffe457a3dacc83d970b515b9451d02ae63a540c`; dirty working tree.

| File | SHA-256 |
| --- | --- |
| `services/range_runtime/observer.py` | `df9bdd927299ec170cb1f8e235d75eca150b48339a0cc90ec1d92a88c30c3b82` |
| `services/range_runtime/api.py` | `02285a9298a7fb0df499ffd7f3a293faed79548dff7ede6636602c4ebb542b80` |
| `services/range_runtime/engine.py` | `20e0500d9f39dc8ee59ff4af4f9b07c0c5ca3b6e4e7c816e25c6c323b89efec6` |
| `services/range_runtime/agent.py` | `7bace6259521541232d6babff6dca5888d50ae9bdd59ae251e4d43ba47957b90` |
| `services/range_runtime/db.py` | `79860073a117f029a45066d6417ab8a15a382c45c5e5701afd8c29c4fa3b9315` |
| `contracts/runtime.py` | `cc66b87c14072ea6be49fd3405bbf14bf7e851fc386c1a54d9d6b14c6220fd4b` |
| `contracts/schemas/ObserverGrantRequest.schema.json` | `71d7a962bb38fbf012de6ae240d9bf466d2699505742c98923d0db18989fb273` |
| `contracts/schemas/CaptureConsent.schema.json` | `2efc493a7a80884178b728cc1fe270c4c2fc4800597c36bdbe6c8f75647ae627` |
| `contracts/schemas/CaptureChunk.schema.json` | `16e85f0e11bc62e201d8b381b8d8dda3718c4242237d4f461b6467fb579421f5` |
| `tests/control/test_observer.py` | `8bdf014eff1988b613c49f4f0541b89a4d1031a5a62f7922dbdd8095279d1a45` |
