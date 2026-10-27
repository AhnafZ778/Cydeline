# Lean shell: independent local-access review

Date: 2026-10-25. Evaluator: fresh `lean_access_review` context; source and native API checks only. Accepted contract: `context/contracts/lean-shell-2026-10-25.contract.md`. Base commit: `dffe457a3dacc83d970b515b9451d02ae63a540c`, dirty worktree; prior observer/Windows changes preserved.

## Findings and resolution

1. **P1, fixed and reproduced independently:** a GET already in flight at a demo role switch could persist the expired pre-switch credential again, sharing the elevated actor dictionary. The original probe produced `old_credential_instructor_access 200`. Middleware now owns an actor copy per request, checks credential revocation after the handler, and rejects stale responses before session persistence (`services/range_runtime/api.py`, session middleware). The same probe now leaves the old expiry at zero and returns instructor access 403. Two regression tests cover elevation and demotion while a request is in flight.
2. **P2, fixed by source inspection:** entering demo instructor mode directly from the management page left the header's cached role as learner. Its Training button skipped demotion. Both entry points now call `openWorkspaceMode`, which always sends the intended role to the server in local demo mode, preserves the selected run, and reloads after cookie rotation.
3. **P2, fixed by source re-evaluation:** `ModeSwitch` previously enabled navigation before its initial session request resolved. A click on Training during that delay could navigate without demoting an existing demo instructor credential. Both buttons now remain disabled until identity loads, a failed identity request displays its error and a Reconnect session retry, and observer identities receive a read-only badge without switching controls.
4. **P1, fixed and reproduced independently:** the new launch readiness probe originally used ambient-proxy-aware `urlopen` with the target's secret header. An owned loopback fake proxy, dummy header, and an unavailable destination established that proxy configuration could receive the header and counterfeit readiness. The launcher now uses `build_opener(ProxyHandler({})).open`. Repeating the same isolated proxy setup produces zero proxy requests and the expected local connection failure. No real credential or external service was used in either reproduction.

## Verification

`PYTHONPATH=. .venv/bin/python /tmp/lean_access_probe.py` independently repeats the interleaving described above using isolated temporary storage and local test clients; it now passes the revocation boundary.

`.venv/bin/python -m pytest tests/control/test_local_demo.py tests/control/test_live_control.py tests/control/test_observer.py -q`: **47 passed**, one existing Starlette TestClient deprecation warning. This includes 11 local-demo cases, normal access-code authentication, persistent ownership, cookie rotation, server-side instructor checks, observer restrictions, Host/peer/Origin checks, spoofed forwarded headers, and privilege revocation when local demo is disabled or a nonlocal Host is used.

The local runner binds its services and Vite to loopback, explicitly disables Uvicorn proxy headers, and enables demo mode only through its local launch environment. The control factory defaults demo mode off. Public session responses expose only public identity fields and the local-demo flag. Request schema prevents arbitrary identity fields and unsupported roles.

The final launcher addition starts the target before control and waits for its authenticated `/health` response, with a 15-second deadline, per-attempt timeout, and child-exit detection. A startup failure reaches cleanup before control can reconcile saved exercises. The explicitly proxy-free readiness client keeps this check on the local dependency. This ordering is source-reviewed; retaining a particular existing paused exercise across the actual preview restart remains the implementer's runtime check. `python3 -m py_compile scripts/run_local.py` passes.

## Snapshot and scope

Reviewed source SHA-256 values:

- `services/range_runtime/api.py`: `e8c64b0ac5f760207033c1ad195a376f528234ef61c079d6e3b34b82ea141e7c`
- `apps/control-api/main.py`: `447b837fdfd932ff4d3ba85eea5035b6d5d129cefd22c4d96e8b28b2f3f64217`
- `scripts/run_local.py`: `34f9722837d30788afea0a8cc74a4f68ff1a5691dc36ab2c6380d7c7c39796be`
- `apps/web/src/features/live/ModeSwitch.tsx`: `e2f87a0d5a9c5fe218b12051f1908367b2647634cf5860ba3d2abaae8866049e`
- `apps/web/src/features/live/TrainingDesk.tsx`: `5915a39f481ead0ecbca4fc956528e50da01b18b3f2e0ba992d160c09ef773d9`
- `apps/web/src/features/live/types.ts`: `966f23a67e1d1babadd123ae9b51e6a5342c57fe8649b47e38db538ffc02e1a1`
- `tests/control/test_local_demo.py`: `5ed3b694732db888c20eab169d7fc3147e4ac44d7a1bc80d6e2a6a4ba40fb260`

Status: **scoped PASS after re-evaluation**. All four findings are resolved within this independent source/native API review of local access and launch readiness. Earlier failing reproductions remain recorded above. Browser-rendered interactions, responsive layout, actual Windows input, external reverse-proxy deployment, multi-worker authority, model acceptance, dedicated-host qualification, and participant learning are not established by this evaluation.
