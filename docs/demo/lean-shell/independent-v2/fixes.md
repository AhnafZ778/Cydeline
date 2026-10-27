# Lean shell independent UI evaluation v2

**Verdict: fail**

Snapshot: `fef72b3939270c47e3e4ffca024d7004a256cf66f17658c981f5ab5a4ab843c9`

Generation: `6747c52c6b034508bc5d22bf677b8471`

## Coverage

- #/live/:run/monitoring / Primary and secondary navigation / 320/390/768/1440: reviewed
- #/ / Launch briefing then reference / new exercise and coached ready: reviewed
- #/live/instructor / Separate password-free instructor mode / local fixture transition and return: reviewed
- #/live/:run/sandbox / Immersive workspace and minimize / ready320/390/768/1440: reviewed
- #/live/:run/sandbox / Workspace recovery / stable gateway URL reconnect: reviewed
- #/live/:run/monitoring / Keyboard and responsive operation / secondary tools and retained drafts: reviewed
- #/live/profile / Assigned attempt pre-launch briefing / first assigned practice and assessment attempt: reviewed

## Checks

- Primary and secondary navigation: pass - Independent source and20/20 native lean-shell/lean-recovery/navigation/learning browser checks pass. Four primary routes; all supporting routes, legacy URLs, drafts and active-run resume retained.
- Launch briefing and reference: fail - Library flow passes expanded pre-launch briefing and separate reference; coached Begin still required. Additional independent assigned-training browser probe found briefing_before0,start_posts1,confirmation_dialogs0 and direct Monitor navigation. TrainingDesk start bypasses briefing. LEAN-UI-02.
- Separate instructor mode: pass - Native browser local fixture changed authenticated role, rendered distinct management header/tabs with no training rail or live toolbar and no password input; Training restored selected exercise. Backend authorization independently evaluated elsewhere. New recovery check verifies direct instructor entry and delayed session identity keeps Training disabled until actual demotion can occur. Independent instructor screenshots at320/390/768/1440 have no page overflow or password inputs.
- Immersive workspace connection and focus: pass - Native test rendered synthetic guest at exact fullviewport0,0,width,900 at1440/768/390/320; shell inert, top-right minimize reachable. Minimize/resume/Escape retain same iframe/src and one load; focus returns Resume, navigation unmount clears inert.
- Workspace recovery: pass - Explicit reconnect now increments iframe key and opens immersive workspace. Independent probe: loads1 before,2 after reconnect, remains2 after minimize/resume,3 after repeated reconnect; exactly1 launchPOST. Native failed503 launch test retains running investigation, offers retry and successfully opens guest.
- Responsive supporting tools and keyboard: pass - Independent probe sampled all four widths: document scrollWidth equals viewport, More tools keyboard Enter opens/closes with focused2px orange outline and whole panel within viewport. Screenshots inspected; data tables use internal horizontal scroll at narrow widths.
- Sampled accessible names and contrast: pass - Native lean-shell rule scan passed color-contrast,button-name,link-name at320. Keyboard minimize/resume/navigation and disclosure exercised. This is sampled automation, not full WCAG or assistive-technology qualification.
- Lightweight and privacy-preserving shell: pass - Source: instructor and observer lazy imports before learner RunProvider; recorder dynamic import only after optional consent. No new UI dependency. Capture blocks private fields and excludes other desktop/crossorigin; learner AI visibility restrictions retained.
- Reduced-motion static sample: pass - Independent reduced-motion emulation found0activeCSSanimation names in static Monitor. Does not establish replay/VM motion compliance.

## Limits

None recorded within this coverage.

## 1. LEAN-UI-01 - Reconnect does not reload a stable workspace gateway

functional-accessibility | major | resolved

**Route:** #/live/:run/sandbox

**State:** ready Windows minimized after a disconnected guest display

**Expected:** Reconnect reopens the current environment connection without stopping or relaunching the VM.

**Observed:** The control sets connection to data.url. When the gateway URL is unchanged the iframe remains the same loaded document. Independent synthetic frame count stayed1 before and after clicking Reconnect.

**Consequence:** A trainee with a stuck or disconnected embedded guest cannot recover via the offered recovery action.

**Reproduce:** Launch fixture desktop; minimize; click Reconnect while gateway returns the same URL. Observe frame navigation/load count and guest document remain unchanged.

**Evidence:** apps/web/src/features/live/AnalystTools.tsx Reconnect handler; independent-v1/probe.cjs and browser-observations.json reconnect.loads_before=1,loads_after=1. Native suite18/18 passes because it asserts preservation on minimize but does not exercise explicit reconnect.

**Remedy:** Explicitly reload or rekey the existing iframe on Reconnect while preserving its gateway URL, exercise and VM. Ordinary minimize/resume must continue preserving the frame.

**Retest:** Assert minimize/resume causes exactly one frame load, explicit Reconnect causes a second load at the same URL, repeated reconnect works, and no new VM launch POST occurs. Exercise error and retry states.


## 2. LEAN-UI-02 - Assigned training starts without its company briefing

functional-accessibility | major | open

**Route:** #/live/profile

**State:** new assigned practice or assessment attempt

**Expected:** Before starting training, present the assigned scenario company briefing once and let the learner explicitly launch afterward.

**Observed:** LearnerDesk Start assignment directly calls POST/assignments/:id/start then navigates Monitor. Browser probe recorded0briefing panels before click,1startPOST,0confirmation dialogs, immediate exercise route.

**Consequence:** A first-time assigned trainee begins the scenario without role, authority, normal work or response policy. Assessment/independent clocks can begin before this necessary orientation.

**Reproduce:** Return one unused assignment from fixture assignments; open My training; click Start assignment. Observe immediate start request/navigation with no pre-launch company briefing.

**Evidence:** apps/web/src/features/live/TrainingDesk.tsx:60-64,141; independent-v2/probe.cjs and browser-observations.json assignment result; assignment-before-1440.png and assignment-after-1440.png.

**Remedy:** Load the assigned scenario briefing and show a pre-start confirmation before dispatching the existing assignment start request. Keep instructor-fixed scenario/mode/assistance, attempt enforcement and server-owned timing. Do not repeatedly inject briefing into live investigation.

**Retest:** For first assigned coached, independent and assessment attempts, assert no startPOST until the expanded briefing is shown and confirmed; cancel makes no start call, failure retains retry, confirm uses assignment endpoint, and later live pages expose only the reference.

