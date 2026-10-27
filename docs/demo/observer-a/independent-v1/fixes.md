# Milestone A independent observer UI review v1

**Verdict: fail**

Snapshot: `b5d997dcfcfa179ffecbf31f51074836b481227941db03bf2d0bc7ca9e7df23b`

Generation: `de605414993548abb7cafdc67374d4f5`

## Coverage

- #/live/observer/:run / Instructor observation and reconnect / live restricted observer: reviewed
- #/live/observer/:run / Terminal review and recording segments / own terminal and instructor terminal: reviewed
- #/live/observer/:run / Responsive and keyboard review / 320/390/768/1440: reviewed
- #/live/:run/monitoring / Optional capture masking / live trainee: reviewed

## Checks

- Current isolated observer suite: pass - BASE_URL=http://127.0.0.1:5191 RUN_OBSERVER=1 npx playwright test observer.spec.ts:2passed7.9s; disposable fixture identity verified before test operations.
- Live audience privacy and safe replay: pass - Current2test suite exercises input/private masking, trainee live403, assigned observer read-only403 on abort/revocation403, own-terminal200, reconnect retention, segments, script/form/network replay fixture.
- Truthful terminal AI state: fail - OBS-UI-02 reproduced on current terminalaborted record.
- Narrow observer pane switching: fail - OBS-UI-01;320/390/768 stack both panes instead of accepted switch.
- Keyboard review navigation: fail - OBS-UI-03; top-level real controls show2px orange outlines, but focus enters inert historical screen.
- Reflow and sampled contrast: pass - At320/390/768/1440 document scrollWidth equals viewport. Top-level color-contrast axe rule, iframesfalse:0violations,0incomplete. CSSzoom2 at1440 also had no horizontal overflow; this is not browserzoom or full WCAG proof.
- Sampled reduced-motion static state: pass - emulateMedia reduced-motionreduce; top-level observer DOM had0active CSS animation names. Replay motion/full assistive technology remain unqualified.

## Limits

- This is independent local milestoneA UI/source review, not deployment or B/C readiness.
- Fixture model output tests actual LocalAgent/control/target paths but does not establish genuine-model adaptation. Real-model-current.json is separate single-call proof and was not rerun by this evaluator.
- No Windows desktop, sealed guest isolation, fifteen-minute timing, LAN/loadp95, participant usability or educational-effectiveness claim.
- Full axe scan involving sandboxed replay did not complete and was stopped; targeted top-level contrast scan completed. Manual browserzoom, full screen-reader coverage and replay motion remain unverified.
- Responsive screenshots use synthetic disposable fixture records; raw actual model transcripts and credentials excluded.

## 1. OBS-UI-01 - Narrow observer layout lacks the accepted screen/AI switch

direction-mismatch | major | open

**Route:** #/live/observer/:run

**State:** 320/390/768px live and terminal observation

**Expected:** The approved plan section2 requires narrow layouts to switch between trainee screen and AI activity.

**Observed:** The <=900px rule stacks both sections. At320px terminal review the AI activity starts at document y1483.5; the trainee screen is scaled to a296px card. The two buttons inside the first card switch tab/actions, not trainee/AI panes.

**Consequence:** The agreed narrow observation mode is absent; comparing screen with actual AI activity requires long page travel.

**Reproduce:** Open a fixture run with recorded tab and AI events; use320px width. Inspect both always-visible cards and the absence of a trainee/AI selector.

**Evidence:** apps/web/src/styles/live.css:859,870; apps/web/src/features/live/ObserverView.tsx:139-144. Browser measured AI top1483.5 at320px,1389.8 at390px,1049.5 at768px. Screenshot terminal-320.

**Remedy:** Add an accessible narrow-screen trainee/AI view selector with selected state and one pane shown, retaining desktop split view and recording segment selection.

**Retest:** At320/390/768 widths, use keyboard to switch trainee/AI panes; verify focus, selected state and retained segment/scrub state. Retest1440 split view.


## 2. OBS-UI-02 - Terminal review promises a next model turn

functional-accessibility | minor | open

**Route:** #/live/observer/:run

**State:** aborted terminal run

**Expected:** Terminal review states that AI execution ended, preserving unavailable/stopped reasons where known.

**Observed:** The header says Recorded and lifecycle says aborted, while AI activity says Waiting for the next model turn.

**Consequence:** The review presents contradictory execution state and implies another turn will occur.

**Reproduce:** Open an aborted fixture run with thinking=false and ai_unavailable=false.

**Evidence:** apps/web/src/features/live/ObserverView.tsx:141; current API snapshot terminalaborted. Actual rendered terminal1440 screenshot.

**Remedy:** Derive the AI status copy from terminal lifecycle before pending/generating/idle states; keep exact lifecycle/result visible.

**Retest:** Open completed/aborted/technical_failure reviews and live paused/thinking/unavailable states; verify no pending next-turn claim in terminal views.


## 3. OBS-UI-03 - Keyboard focus enters the inert recorded screen

functional-accessibility | minor | open

**Route:** #/live/observer/:run

**State:** keyboard traversal through recorded tab

**Expected:** The noninteractive replay display is skipped by keyboard; real review controls retain visible focus.

**Observed:** Sequential Tab enters the outer observer iframe after segment selection with no visible outline, and the next Tab reaches a recorded BUTTON inside the nested replay. pointer-events:none blocks the mouse, not this keyboard focus path.

**Consequence:** Keyboard users encounter an unmarked focus stop and historical controls that cannot operate the exercise, before reaching current review controls.

**Reproduce:** At1440px on a terminal run with a recorded screen, Tab from recording segment selector. Inspect document.activeElement and nested contentDocument.activeElement, then press Tab again.

**Evidence:** apps/web/src/features/live/ObserverView.tsx:77; apps/web/src/styles/live.css:864. Browser: outer IFRAME computed outline none; next Tab nested replay activeElement BUTTON.

**Remedy:** Remove outer/nested replay documents from sequential focus and make replay content inert; keep the labelled display available for review without fake historical interactive controls.

**Retest:** Tab/Shift+Tab through the entire observer page; replay DOM controls receive no focus, and slider/segment/details/invitations have visible focus.

