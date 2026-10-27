# AI observer implementation and continuation

Updated 25 October 2026 (Asia/Dhaka). The accepted design is [AI_OBSERVER_RANGE_PLAN.md](AI_OBSERVER_RANGE_PLAN.md); design approval is separate from implementation evidence.

## Current delivery

Milestone A is implemented on the existing two scenarios. Independent backend and bounded rendered UI evaluation pass after corrections; native snapshot verification passed (382 backend tests plus 18 subtests, typecheck and context synchronization; inputs unchanged). Milestones B (sealed dedicated host and genuine Windows observation) and C (versioned timed opponent, restricted scripts and internal synthetic mail) are not delivered by A.

- The instructor desk links to the AI observation room at `#/live/observer`. Instructors see available exercises and can issue at most two run-specific read-only observer invitations. Revocation and session expiry apply to active streams as well as new requests.
- The activity history records actual model messages, schema/configuration, final response, policy validation, dispatch and confirmed target response with a shared decision ID. A brief AI-stated intent is labeled as such; private model reasoning is not recorded or fabricated. No extra narration call or substitute attacker is introduced.
- Trainees cannot obtain live strategy in either practice or assessment. They can review their own terminal run. The previous practice-mode Adversary Lens exception is superseded by the approved observer design.
- Optional exercise-tab capture shows actual DOM and cursor movement. The consent notice explains the audience and local seven-day retention. Inputs, worksheets, notes and private elements are blocked; personal desktop, microphone, camera, console/network plugins, canvas and cross-origin frame capture are excluded. Recording errors and quotas leave explicit gaps.
- Model/capture detail is AES-GCM encrypted under a private local key, expires after seven days, and has separate core/visual budgets. Core audit has a real disk reservation; audit write or maintenance failure fences further attacker dispatch. Keep the database, key and runtime recordings local and excluded from Git.
- Recorded DOM is untrusted. Replay uses scriptless sandboxed frames, a restrictive network policy and active-content/URL stripping. Read-only observers receive no VM control grant.

## Reproducible evidence

Evidence lives in `docs/demo/observer-a/`. It contains summaries and synthetic test screenshots, not user recordings, instructor codes, observer invitation codes or model transcripts.

| Check | Observed result / scope |
| --- | --- |
| Observer backend | 23 passed; authorization, encryption/expiry/cursors, consent/order/gaps, oversized uploads, reservation/quotas, transcript instrumentation, session expiry, rejected-output privacy and audit/index-write failure fencing |
| Frontend unit tests | 54 passed on 25 October |
| Production build | Passed on 25 October |
| Observer browser suite | Two passed on the disposable fixture; actual rendered masked DOM/cursor, reconnect, segments, grants, terminal review, keyboard pane switching, reflow and replay injection. Existing console/learning/navigation/restoration suite: 25 passed. A later terminal-review navigation link received focused source/build review; no post-link browser-render claim after the browser-policy refusal. |
| Real local model | `real-model-current.json`: Qwen3:1.7b, actual request/final response, accepted validation and HTTP 200 target audit correlation; learner strategy absent |
| Native check correction | Full run initially found missing exported observer schemas (377 passed, one failed, 18 subtests). Exported the three new request schemas; schema regression then passed. The corrected stable full run passed 382 tests plus 18 subtests; `native-receipt-a.json` retains its source identity. |
| Independent evaluation | Backend final scoped PASS: 69 focused tests plus independent fault reproductions; see `BACKEND_REVIEW_2026-10-25.md`. UI v1 failed three findings; v2 passes the same seven required checks/four flows after narrow switching, terminal copy and inert keyboard replay fixes. See `independent-v2/review.md`. |

The browser suite deliberately uses a disposable server with explicit fixture identity and fixture model replies to test UI deterministically. It proves no model capability. The separate real-model proof uses the actual local model once and exports only counts, hashes and audit links. It proves wiring, not adaptation, representative latency or learning effectiveness.

```bash
# Focused server checks
.venv/bin/python -m pytest tests/control/test_observer.py tests/control/test_contracts.py -q

# Web checks
npm --prefix apps/web test
npm --prefix apps/web run build

# Real local-model observer wiring (temporary isolated run; no fallback)
RED_AGENT_TIMEOUT_MS=30000 .venv/bin/python scripts/prove_observer.py --output docs/demo/observer-a/real-model-current.json

# Final snapshot verification after all code/context writes
harness check run /home/ahnaf-zakaria/Downloads/Cydeline
harness check evaluate /home/ahnaf-zakaria/Downloads/Cydeline
```

Browser setup: run `tests/e2e/observer_server.py` on loopback 5190 and a dedicated Vite instance on 5191 proxying that control service. From `tests/e2e`, run `RUN_OBSERVER=1 BASE_URL=http://127.0.0.1:5191 npx playwright test observer.spec.ts`. The tests verify fixture identity before mutation and only clean up the exercise they just created. Do not point this suite at a user's active runtime.

## Preview and next gate

The current preview is `http://127.0.0.1:5188/`, backed by `.runtime/observer-preview` and loopback control/target/tool ports 28000/28001/28002. The local instructor code is stored in `.runtime/observer-preview/instructor-pin`; do not paste it into tracked evidence or URLs. Launch with:

```bash
.venv/bin/python scripts/run_local.py --runtime .runtime/observer-preview --port 28000 --web-port 5188
```

UI loop: private `.harness/observer-ui-loop.json` revision 2, accepted version 2; tracked mirror `docs/demo/observer-a/UI_LOOP.json`. The initial loop-record command used the v1 report subdirectory instead of its parent image directory, so its preserved record contains generated missing-screenshot limitations. The original images are present in `docs/demo/observer-a/independent-terminal-*.png`; no review or version counter was reset. V2 uses its correct self-contained `independent-v2/assets` root.

On 25 October the user explicitly replied **“set it up for me”** to the Windows/host prerequisite question. Local Windows evaluation preparation subsequently completed with actual desktop, finalized base and worker/Guacamole API proof; no dedicated remote host or cloud purchase is inferred. Current laptop inventory: 15,620 MiB total memory, 6,013 MiB available at inspection, 12 logical CPUs, accessible KVM, about 48 GiB disk free. No `.qcow2` or `.iso` was found under Downloads before preparation. These measurements do not qualify the full expanded-host workload.

The networkless Windows Desktop Experience base is installed and configured for observer-preview; actual worker display, gateway authentication, read-only mounts, unchanged base and own validation cleanup pass. See `docs/product/WINDOWS_VM.md` and `docs/demo/windows-setup/`. Browser-rendered Sandbox remains unverified after the browser-control URL policy refusal. Next: sealed-host preflight/provisioning and qualification for expanded B, followed by versioned timed C only after B gates. The existing optional Windows profile is not the future sealed company workstation topology. Neither the live observation room nor gateway fixtures establish a real Windows desktop. Expanded B/C launch remains disabled until the distinct host/isolation/model/load gates pass.

Preserve the existing measured failures: the 1.7b objective matrix remains **10/12, FAIL**; waits/stops do not prove post-block pivots; live coaching has a recorded 51,989 ms tail. The user deferred participant sessions and chose to leave the pilot kit ready. Do not describe the overall expanded range, model quality, learning outcomes, dedicated-host load or Windows readiness as complete.
