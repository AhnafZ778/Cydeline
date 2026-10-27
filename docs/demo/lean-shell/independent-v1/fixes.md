# Lean shell independent UI evaluation v1

**Verdict: fail**

Snapshot: `fe8e4dc566ef3b31b0e482c97a275e7b7d69b43eae6f74ebc11b22dd9aa96953`

Generation: `0d970d5ec43b4fdda94aede04dd8499d`

## Coverage

- #/live/:run/monitoring / Primary and secondary navigation / 320/390/768/1440: reviewed
- #/ / Launch briefing then reference / new exercise and coached ready: reviewed
- #/live/instructor / Separate password-free instructor mode / local fixture transition and return: reviewed
- #/live/:run/sandbox / Immersive workspace and minimize / ready320/390/768/1440: reviewed
- #/live/:run/sandbox / Workspace recovery / stable gateway URL reconnect: reviewed
- #/live/:run/monitoring / Keyboard and responsive operation / secondary tools and retained drafts: reviewed

## Checks

- Primary and secondary navigation: pass - Independent source and18/18 native lean-shell/navigation/learning browser tests: four primary routes, all supporting tools retained under More tools, legacy URLs and active-run resume preserved.
- Launch briefing and reference: pass - Native browser flow rendered expanded briefing before start, no briefing panel in live Monitor, dedicated Company briefing reference accessible; coached Begin still required. Source matches server acknowledgement path.
- Separate instructor mode: pass - Native browser local fixture changed authenticated role, rendered distinct management header/tabs with no training rail or live toolbar and no password input; Training restored selected exercise. Backend authorization independently evaluated elsewhere.
- Immersive workspace connection and focus: pass - Native test rendered synthetic guest at exact fullviewport0,0,width,900 at1440/768/390/320; shell inert, top-right minimize reachable. Minimize/resume/Escape retain same iframe/src and one load; focus returns Resume, navigation unmount clears inert.
- Workspace recovery: fail - Independent browser probe: gateway frame loads1 before Reconnect and1 afterward despite click. Source setConnection(data.url) leaves stable URL unchanged; no remount/reload. Evidence independent-v1/browser-observations.json and reconnect-1440.png.
- Responsive supporting tools and keyboard: pass - Independent probe sampled all four widths: document scrollWidth equals viewport, More tools keyboard Enter opens/closes with focused2px orange outline and whole panel within viewport. Screenshots inspected; data tables use internal horizontal scroll at narrow widths.
- Sampled accessible names and contrast: pass - Native lean-shell rule scan passed color-contrast,button-name,link-name at320. Keyboard minimize/resume/navigation and disclosure exercised. This is sampled automation, not full WCAG or assistive-technology qualification.
- Lightweight and privacy-preserving shell: pass - Source: instructor and observer lazy imports before learner RunProvider; recorder dynamic import only after optional consent. No new UI dependency. Capture blocks private fields and excludes other desktop/crossorigin; learner AI visibility restrictions retained.
- Reduced-motion static sample: pass - Independent reduced-motion emulation found0activeCSSanimation names in static Monitor. Does not establish replay/VM motion compliance.

## Limits

None recorded within this coverage.

## 1. LEAN-UI-01 - Reconnect does not reload a stable workspace gateway

functional-accessibility | major | open

**Route:** #/live/:run/sandbox

**State:** ready Windows minimized after a disconnected guest display

**Expected:** Reconnect reopens the current environment connection without stopping or relaunching the VM.

**Observed:** The control sets connection to data.url. When the gateway URL is unchanged the iframe remains the same loaded document. Independent synthetic frame count stayed1 before and after clicking Reconnect.

**Consequence:** A trainee with a stuck or disconnected embedded guest cannot recover via the offered recovery action.

**Reproduce:** Launch fixture desktop; minimize; click Reconnect while gateway returns the same URL. Observe frame navigation/load count and guest document remain unchanged.

**Evidence:** apps/web/src/features/live/AnalystTools.tsx Reconnect handler; independent-v1/probe.cjs and browser-observations.json reconnect.loads_before=1,loads_after=1. Native suite18/18 passes because it asserts preservation on minimize but does not exercise explicit reconnect.

**Remedy:** Explicitly reload or rekey the existing iframe on Reconnect while preserving its gateway URL, exercise and VM. Ordinary minimize/resume must continue preserving the frame.

**Retest:** Assert minimize/resume causes exactly one frame load, explicit Reconnect causes a second load at the same URL, repeated reconnect works, and no new VM launch POST occurs. Exercise error and retry states.

