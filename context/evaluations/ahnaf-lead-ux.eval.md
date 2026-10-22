# Evaluation: Ahnaf — Lead, Overseer & Defender Command Center (`ahnaf-lead-ux`)

- **Verdict:** `blocked` for full release; **simulation-mode vertical slice passes** (see scope below). Blocked only on items that need Saad/Tanvir's live services or an independent evaluator.
- **Evaluated source identity and time:** `2026-10-22` · Branch `chore/publish-workstreams` · base revision `c6bdbad8ea3964dc58fd6d74462dcc7b8a17362e` + uncommitted `apps/web/`, `tests/e2e/`, `docs/demo/`. Exact snapshot hash is in the harness receipt (`harness check evaluate` output), not repeated here because editing this file changes the snapshot.
- **Accepted task contract:** `context/contracts/ahnaf-lead-ux.contract.md` (Mission Workbench + V2: Ember theme, n8n-style workflow canvas, Adversary Lens).
- **Independent evaluator / independence limitations:** This pass was written by the implementing agent after a mechanical test run. It is NOT an independent fresh-context review. A different agent or person should repeat the manual checks below before gate G5.

## Acceptance evidence

Scope: `StatefulSimulationClient` (default). The `LiveHttpControlClient` path compiles and is typed against `contracts/` but was not exercised against a running control API.

- [x] **A1 shell + 7 states** rendered: landing, observe, investigate, declare, contain, verify, debrief (Playwright keyboard-only run reaches debrief).
- [x] **A2 declare / contain / verify**: declare requires session + evidence + rationale (submit stays disabled otherwise); respond is a single Apply with neutral blast-radius cards; verify runs paired probes (intruder refused, Eli still served). Covered by `tests/e2e/mission.spec.ts › keyboard-only run`.
- [x] **V2 workflow canvas**: circular nodes, bezier edges with counts, gateway, Refused sink, protected asset, "Your response" node, data-driven packets, click/Enter opens the details dock, Esc closes it. Covered by `workflow nodes open a details dock`.
- [x] **V2 Adversary Lens**: Coached narration and AI node/log markers; Blind removes all AI hints; assessment mode forces Blind. Covered by `Adversary Lens narrates ...`; unit tests in `apps/web/src/lib/adversary.test.ts`.
- [x] **Anti-oracle (`AI-01`)**: no `risk_label` or prose summary is rendered in the learner view; dock "Ask yourself" content is questions only; ground truth is not read from the scenario fixture.
- [x] **Accessibility (WCAG 2.2 AA, axe tags wcag2a/aa/21a/21aa/22aa, fail on serious or critical)**: zero violations on landing, workbench (AI acting), node dock, event inspector, declare drawer, debrief, and the workbench at 320, 390, 768 and 1440 px.
- [x] **Responsive**: no page-level horizontal scroll at 320, 390, 768, 1440 px; the workflow canvas scrolls inside its own focusable region below 1100 px.
- [x] **Keyboard**: full loop completed without a pointer (Tab/Enter on nodes and buttons, `j`/`Enter`/`p` on logs, Esc closes panels). Developer drawer (`Ctrl+K`) is used only to advance the simulated clock.
- [x] **Reduced motion**: all four state-bound motions have `prefers-reduced-motion` fallbacks (inspected in `flow.css`/`workbench.css`; not automated).
- [ ] **A3 live wiring (SSE/REST, `fallback_used` badge against a real run)**: unverified, needs `apps/control-api/` from Saad.
- [ ] **A4 uncut 3-minute recording**: script written (`docs/demo/DEMO_SCRIPT.md`), not recorded.
- [ ] **Independent review (`grill-my-ui` or a human)**: not done.

## Findings: severity, location, trigger, actual behavior, expected behavior

Fixed during this pass (return-to-Implement loop already closed):

1. **serious** · `FlowCanvas.tsx` node `<g role="button">` · axe `label-content-name-mismatch` on every node · visible text (count, label, sub) was inside the button but not in its `aria-label` · expected: accessible name contains visible text (WCAG 2.5.3). Fix: the button now owns only the shapes and the full name (`label, N requests, sub. Open details.`); visible text is a sibling group marked `aria-hidden`. Same fix on `AdversaryStrip` button (name from content).
2. **serious** · `TopBar.tsx` `.opponent-chip` · axe `aria-prohibited-attr` below 1024 px · `aria-label` on a `<span>` with no role, and the status text was `display: none` when collapsed · expected: status still available to assistive tech. Fix: text is visually hidden (not removed) and the redundant `aria-label` is gone.
3. **minor** · `shell.css` top bar at 320 px · step label "Observe" collided with the clock chip · expected: no overlap. Fix: tighter gaps below 400 px.

Open:

4. **minor / design trade-off** · Coached lens · once the AI acts, its session is named, which shortens the investigation · expected for a teaching mode, but must never be presented in scored runs. Mitigation in place: assessment forces Blind, lens is not sent to scoring. Needs product sign-off from the lead.
5. **minor** · `apps/web/src/lib/adversary.ts` `aiFootprint` · AI attribution of log rows and nodes is a client-side heuristic (matches decisions to sessions/IPs) · expected: server-provided attribution. Pending master-integration contract request 5 (`last_ai_decision` in practice mode, optional `ai_phase`, `agent_step`).
6. **minor** · `StatefulSimulationClient` · IP, user-agent and the 6:1 benign ratio are synthesized client-side · expected: scenario fixture provides them (contract requests 1 and 2 in `master-integration.contract.md`).
7. **info** · `docs/demo/mockups/` is the stale white-blue direction. Not shipped. Safe to delete or refresh.

## Checks, browser observations and artifacts

- `apps/web`: `npm test` (Vitest, 6 files, 35 tests) pass; `npm run typecheck` clean; `npm run build` ok (JS 381 kB, 117 kB gzip; CSS 62 kB).
- `tests/e2e`: `npx playwright test` (system Chrome, `--no-sandbox`, Vite on 5175) 9 of 9 pass in about 70 s. Specs: landing/workbench axe, node dock by keyboard, Coached vs Blind lens, keyboard-only full loop with axe at inspector, declare drawer and debrief, four-viewport layout, first-run tour.
- Manual visual review (hi-res screenshots) at 1440, 768, 390 and 320 px for observe, contained, retry, blind, dock and tour states; 0 console errors across runs.
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline` then `harness check evaluate /home/ahnaf-zakaria/Downloads/Cydeline` (receipt in `~/.local/share/agent-harness/verification/`).

## Unverified criteria and environment limits

- Live API mode, SSE disconnect/reconnect, and `fallback_used` display against a real run.
- Screen readers (NVDA, VoiceOver); only axe plus keyboard traversal were used. Axe cannot prove contrast for text over the SVG dotted grid; contrast was set from token ratios and spot-checked by eye.
- Touch input on a physical phone; layouts were tested with a resized desktop Chrome viewport.
- Firefox and Safari were not run (Chrome only).

## Next action (fixes return to Implement)

- Saad accepts or amends master-integration contract requests 1, 2 and 5 (network block, fixture signal, practice-mode AI telemetry); then switch the web app to `VITE_API_MODE=live` and re-run `tests/e2e` against the control API.
- Record the 3-minute demo from `docs/demo/DEMO_SCRIPT.md`.
- Have a fresh evaluator repeat the manual checks (keyboard, screen reader, phone) before gate G5.
