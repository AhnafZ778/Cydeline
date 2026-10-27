# Lean training shell — 25 October 2026

User request: reduce overwhelming navigation, focus Windows, show briefing before training, separate instructors and remove local password friction. Contract: `context/contracts/lean-shell-2026-10-25.contract.md`. Retains warm white/orange visual direction, all meaningful tools, existing routes and server authority.

## Implemented behavior

- Four primary destinations: Monitor, Logs, Cases, Workspace. More tools contains Endpoint, Email, Intel, Learning, Company briefing, Assets, Business, Evidence Assistant and terminal Debrief. Resources holds Mission Library, progress and training profile. Placeholder multi-column footer removed.
- Expanded company briefing precedes library launch and assigned exercise launch. Assignments keep exact instructor scenario/version/mode; cancel/missing briefing makes no start request; failure keeps briefing and retry. Live pages link to a separate briefing reference. Coached Begin still gates server clock/adversary.
- Ready lab automatically fills viewport. Top-right minimize restores the SOC; minimized iframe stays mounted and resume preserves connection. Explicit Reconnect reloads only that iframe; stop remains explicit. Parent Escape minimizes when parent controls have focus; guest keyboard behavior is independent. AI-paused notice remains visible in focused lab.
- Instructor management has a distinct header/tabs and no trainee run provider/sidebar/toolbar. Management forms progressively disclose. Observation remains separate and read-only for assigned observers; trainee live AI access stays denied. Heavy playback is lazy-loaded; recorder is downloaded only after optional consent.
- Local launcher now enables loopback-only demo mode. Training/Instructor switch requires no code, rotates credentials and preserves selected run and learner identity. Normal control construction/deployments default to access codes; `scripts/run_local.py --require-access-codes` disables demo mode. Host/peer/origin fences, no forwarded-IP trust, revocation outside demo/local and observer read-only enforced. Concurrent stale responses cannot resurrect rotated credentials. Buttons await session identity and offer retry.
- Launcher starts control after target readiness with a no-proxy local client so saved practice survives restart.

## Running local preview

`http://127.0.0.1:5188/`, runtime `.runtime/observer-preview`, control28000/target28001/worker28002. Restarted with local demo enabled. Previously existing practice was paused before Begin and Windows ready; state and ready job preserved. Temporary API proof identity was returned to learner; no user run aborted or new exercise created. Private Windows image/credentials remain ignored.

## Evaluation and evidence

`docs/demo/lean-shell/`: browser captures, independent access review, independent UI versions and local-preview check. `.harness/lean-shell-loop.json` retains bounded evaluated versions (maximum four), separate from accepted earlier observer loop.

Independent access review: scoped PASS,47 API tests including two concurrency regressions. UI v1 failed stable-URL Reconnect; corrected with frame revision. UI v2 resolved Reconnect but failed assigned prebrief; corrected with exact-version briefing modal. Preserve both failures. V1 used a stale command receipt identity rather than direct identity, and one root capture was later overwritten; its PDF/source/probe remain, so do not describe that historical audit as fully fresh. Later independent captures freeze under version-specific directories.

Frontend54 unit tests, backend400 tests+18subtests and production build pass. Complete native fixture browser matrix34/34 passes on owned5177 with isolated output; observer fixture2/2 passes. Independent UIv3 scopedPASS, bounded loop stopped accepted version3. Its own23/23 regression subset and four-width rendered/source inspection retained in frozen artifacts. Earlier shared-server/output failures are infrastructure failures retained in verification-progress.json; no application assertions failed in the clean rerun. Observer fixture2 passes after restarting expired disposable server. Earlier failed fixture attempt refused absent identity before creating/mutating any run.

## Limits retained

UI screenshots/desktop behavior checks use labelled synthetic gateway fixtures; actual Windows browser input/rendering still requires human verification following prior live URL tool-policy refusal. API and worker boot proof are separate. No full WCAG/screen-reader/browser zoom or participant usability claim. Full sealed dedicated host/VM observation/timed-opponent milestones B/C remain pending. Full local-model objective acceptance remains10/12 failed, coach tail51989ms. Pilot kit remains ready without invented participant observations. This cleanup does not resolve those unrelated gates.

Final native Harness run/evaluate receipt is generated after tracked context synchronization; consult the native receipt for exact current snapshot instead of treating earlier audit identities as deployment proof.

## 27 October 2026 — briefing readability follow-up

User screenshot exposed launch-dialog overflow at1357×605. Briefing launches now use a1080px maximum-width responsive sheet, bounded viewport height, a keyboard/wheel-scroll reading body with visible scrollbar, and a persistent action footer. Public role/policy text uses bold headings, two-column desktop sections and restrained background-highlighted key phrases, stacking at700px and below. Full authored policy remains intact. Both library and assignment launches use this variant; other confirmation dialogs retain their established appearance. Modal keyboard traversal includes summary/scroll regions and reads the current close handler.

Preview5188 restarted with the same `.runtime/observer-preview`; existing practice remained paused before Begin. Native focused browser15/15 pass (six screen sizes including1357×605 and844×390, wheel/keyboard, pinned actions, contrast sample, cancel/focus, assignment modes/retry and existing lean shell). Frontend54 and production build pass. Independent focused review and final native receipt are linked in the owner evaluation/checkpoint. Screenshot evidence: `docs/demo/briefing-layout/`. Actual live browser input in Windows, model/full-range and participant gates remain outside this correction.
