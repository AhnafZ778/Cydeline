# Milestone A independent observer UI review v2

**Verdict: pass**

Snapshot: `a78969d15c32006167305973c0c5ac50c6727c27582ffe8ed3686c0e4d08815b`

Generation: `7b7fda35042a48b881f7a040d1e8305d`

## Coverage

- #/live/observer/:run / Instructor observation and reconnect / live restricted observer: reviewed
- #/live/observer/:run / Terminal review and recording segments / own terminal and instructor terminal: reviewed
- #/live/observer/:run / Responsive and keyboard review / 320/390/768/1440: reviewed
- #/live/:run/monitoring / Optional capture masking / live trainee: reviewed

## Checks

- Current isolated observer suite: pass - Current isolated suite passed 2/2 in 10.5 s against verified sentinel-observer-disposable fixture. Same masking/reconnect/auth/replay tests plus pane/terminal regression assertions.
- Live audience privacy and safe replay: pass - Current suite: input/private masking, live trainee403, observer mutation403, revocation403, own-terminal200, transient503 retained history and recovered, capture segments, replay script/form/network isolation.
- Truthful terminal AI state: pass - OBS-UI-02 resolved; actual aborted UI and browser-only lifecycle presentation matrix recorded in browser-observations.json.
- Narrow observer pane switching: pass - OBS-UI-01 resolved; keyboard switches both narrow panes at320/390/768 with selected state and retained segment;1440 split view retained.
- Keyboard review navigation: pass - OBS-UI-03 resolved; Tab/Shift+Tab skips replay to current range and back to segment;35-step traversal retained focus outlines.
- Reflow and sampled contrast: pass - No horizontal overflow at320/390/768/1440. Targeted top-level axe color-contrast:1440 and settled320both panes0violations/0incomplete. Immediate scans during color transitions reported transient mismatched colors;350ms settled rescans passed. CSSzoom2 no overflow, not browserzoom proof.
- Sampled reduced-motion static state: pass - Reduced-motion emulation: top-level observer DOM0active CSSanimation names. This is the bounded static-state check, not replay-motion or assistive-technology qualification.
- Scope and unqualified external gates: not-applicable - This disposition covers the seven retained milestone A UI checks and four retained required route/flows only. Full screen-reader/browserzoom/replay-motion conformance, LAN/loadp95, Windows, B/C, participant usability and educational effectiveness are outside this bounded gate; none is claimed. Fixture-model browser paths do not prove real-model adaptation. Separate real-model-current.json single-call proof was not rerun here. Full sandbox-frame axe did not complete in v1; this review uses targeted top-level contrast and explicit keyboard checks. Backend authorization/storage review remains separate.

## Limits

None recorded within this coverage.

## 1. OBS-UI-01 - Narrow observer layout lacks the accepted screen/AI switch

direction-mismatch | major | resolved

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

functional-accessibility | minor | resolved

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

functional-accessibility | minor | resolved

**Route:** #/live/observer/:run

**State:** keyboard traversal through recorded tab

**Expected:** The noninteractive replay display is skipped by keyboard; real review controls retain visible focus.

**Observed:** Sequential Tab enters the outer observer iframe after segment selection with no visible outline, and the next Tab reaches a recorded BUTTON inside the nested replay. pointer-events:none blocks the mouse, not this keyboard focus path.

**Consequence:** Keyboard users encounter an unmarked focus stop and historical controls that cannot operate the exercise, before reaching current review controls.

**Reproduce:** At1440px on a terminal run with a recorded screen, Tab from recording segment selector. Inspect document.activeElement and nested contentDocument.activeElement, then press Tab again.

**Evidence:** apps/web/src/features/live/ObserverView.tsx:77; apps/web/src/styles/live.css:864. Browser: outer IFRAME computed outline none; next Tab nested replay activeElement BUTTON.

**Remedy:** Remove outer/nested replay documents from sequential focus and make replay content inert; keep the labelled display available for review without fake historical interactive controls.

**Retest:** Tab/Shift+Tab through the entire observer page; replay DOM controls receive no focus, and slider/segment/details/invitations have visible focus.

