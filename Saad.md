# Saad — Range, integration and completion handoff

**Updated:** 27 October 2026 (Asia/Dhaka)
**Primary owner:** Saad · **AI/learning-quality partner:** Tanvir
**Task:** `saad-range-control`; also coordinate `master-integration` and delegated UI work
[Live context](context/SAAD_CONTEXT.md) · [Contract](context/contracts/saad-range-control.contract.md) · [Evaluation ledger](context/evaluations/saad-range-control.eval.md)

## Start here: take over integration without Ahnaf

Ahnaf has carried the implementation to the current published baseline and is unavailable for the remaining work. **Saad owns completion/integration, including the remaining observer/frontend work listed below; do not leave those tasks waiting for Ahnaf.** Tanvir owns the model, adaptation, coaching and generated-artifact quality in [Tanvir.md](Tanvir.md). Leave `Ahnaf.md` unchanged, preserve its implemented UI, and coordinate through current contracts/context.

This file supersedes its original build-from-scratch checklist. It is a current handoff, not a statement that future range/timing/security gates pass. [REMAINING_WORK.md](docs/product/REMAINING_WORK.md) is the complete backlog; [AI_OBSERVER_RANGE_PLAN.md](docs/product/AI_OBSERVER_RANGE_PLAN.md) is the detailed accepted B/C specification. Do not implement a looser substitute for it.

```bash
python3 scripts/harness_sync.py status
python3 scripts/harness_sync.py takeover --task saad-range-control
harness context resume . --task saad-range-control
git status --short
```

Read your live context/contract, master context/contract, Tanvir's handoff and the current evidence. Published baseline: `c478529` on `chore/publish-workstreams`; reconcile later commits before editing.

## What Ahnaf has already delivered — do not rebuild

- Two actual local-AI scenario paths, variant manifests, isolated target access controls/audits, trusted run orchestration, cases/evidence/worksheets, response/recovery/scoring, progress, coaching scaffolds and terminal replay/export.
- Profiles/cohorts/assignments/injects and a separate instructor shell; server-enforced live AI audience separation, restricted observer grants, encrypted retained provenance and optional masked exercise-tab/cursor capture. Current observer is not a Windows screen recorder.
- Genuine Windows Server 2022 Evaluation Desktop Experience base installed and booted via KVM/ToolWorker; gateway API/display, read-only base/evidence, no guest NIC and scratch/cleanup checks recorded. Actual embedded browser input remains unverified.
- Lean navigation, immersive/minimizable workspace preserving the iframe, explicit reconnect, loopback-only password-free demo mode, and wide scrollable highlighted briefing dialogs for library/assigned starts. Preserve these instead of restoring the old clunky shell.
- Recorded baseline: **400 backend tests +18 subtests,54 frontend tests,build/native Harness PASS**. Lean browser 34 + observer 2 and later briefing 15 / independent 11 have separately scoped evidence.

## Ahnaf's unfinished responsibilities transferred to you

This explicitly transfers the unfinished duties from [Ahnaf.md](Ahnaf.md) §2A/§2C and checklist items 7–8, and [the original defender UX/QA/demo workstream](07_OWNER_D_DEFENDER_UX_QA_DEMO.md). **Saad is now the completion owner for integration, frontend, browser QA, accessibility and demo production; Tanvir supplies AI/learning expertise. No item requires Ahnaf to return.** The seven core screens and live backend wiring are already built despite the old unchecked boxes. Preserve them and qualify the final changed product rather than rebuilding them.

- [ ] **Acting integration lead (S2–S9):** coordinate dependencies and shared-file ownership with Tanvir, maintain contract/schema sign-off and scope, and collect current G0–G6 evidence. Keep completed baseline gates distinct from new B/C qualification. Record decisions, failures and the next owner/action at each checkpoint; prepare the release review without assigning sign-off back to Ahnaf.
- [ ] **Remaining defender/instructor UI and design-system stewardship (S1/S4/S8):** finish actual Windows interaction checks, read-only VM observation/recording, timed briefing/clock/fault/results and causal replay. Preserve the lean navigation, separate instructor view, immersive/minimizable workspace, highlighted scrollable briefing, visible focus and clear requested/applied/verified states. Keep acknowledged evidence, notes and drafts through reconnects; never expose hidden live strategy to trainees.
- [ ] **Final browser QA and full-loop integration (S5/S9/S10):** requalify the committed release across both scenarios, applicable variants and supported practice/assessment/assistance modes. Cover start without terminal/DB edits → filter/cite at least two actual visible event IDs → declare → confirmed containment → both independent recovery checks → authoritative score → read-only replay → clean reset. Include SSE interruption/backfill/order/dedup, offline/errors/conflicts, stale events after reset, double submissions, recovery invalidation and authorized old replay. Preserve existing evidence; record the exact scope of each new run. Tanvir supplies genuine model evidence; fixture browser tests alone do not prove adaptation.
- [ ] **Manual accessibility and responsive release audit (S10):** exercise 200% browser zoom/reflow, 320/390/768/1440 px layouts, complete keyboard journeys and focus, touch controls, a screen reader and reduced motion. Check dialogs, long evidence/replay, preserved work and actual Windows/observer states where supported. Save observations and fix findings; sampled contrast or browser automation is not full WCAG conformance or learner-usability proof.
- [ ] **First-time walkthrough readiness (S11; Tanvir owns the rubric/analysis):** provide a reproducible clean environment, facilitator instructions and authorized evidence export for the existing pilot kit. Capture real confusion/timing/completion only when sessions are authorized. The original 3–5 junior walkthrough suggestion belongs to the user-deferred eight-beginner/two-expert study; do not invent results or make recruiting a prerequisite to this handoff.
- [ ] **Three-minute demo producer (S11; Tanvir supplies narrative/model evidence):** rehearse and record a clean, uncut chronological run plus a backup. Use [DEMO_SCRIPT.md](docs/demo/DEMO_SCRIPT.md): 0:00–0:30 learner problem; 0:30–1:00 product/isolation diagram; 1:00–2:00 real model → target → event → evidence → revoke → denied retry → legitimate success → debrief; 2:00–2:30 bounded local AI/provenance/scoring; 2:30–3:00 measured evidence, limits and planned pilot. Verify the sequence against one actual run, keep screenshots/diagram and playback checks, label prerecorded footage, and never splice unrelated runs as continuous. The script already exists; the final recording and backup are not yet evidenced. Store videos outside Git.
- [ ] **Final release and competition preparation (S11):** confirm the official track, deadline and format; the original 22–31 October work calendar is not official confirmation. Choose a release candidate/feature freeze, run the appropriate final regression and screenshot/accessibility review, and assemble setup instructions, source/model identities, limitations, evidence links and demo assets. Prepare a submission-ready package. External submission/contact/purchase requires its applicable authorization; record the actual receipt only after an authorized submission, never assume it happened.

Tanvir's explicit carryover checklist owns educational coherence, pilot/rubric readiness, AI evidence and accurate demo claims. Cross-check both handoffs before closing release work; update the repo/context so a successor can continue without Ahnaf or old chat history.

## Your remaining work, in delivery order

### S1 — Actual Windows check and sustainable image (P0)

- [ ] Human-check actual embedded Windows display, keyboard/mouse, reconnect, minimize/resume and stop on the real guest. Earlier tool refusal must not be bypassed through another automation route; supported worker/API/VM proof and fixture UI checks are distinct evidence.
- [ ] Preserve `.runtime/windows/windows.qcow2`, private `.runtime/windows/credentials.json` and the configured `.runtime/observer-preview`. Do not rerun installation over the finalized image or expose its credentials/base to Git.
- [ ] Resolve authorized activation or compatible licensed media for continued use. Current official Server2022evaluation stayed offline/unactivated; no licensing bypass and no Internet access from an exercise guest. Read [WINDOWS_VM.md](docs/product/WINDOWS_VM.md).
- [ ] Preserve active user work. Current preview is 5188, control 28000, target 28001, worker 28002; restart the same saved runtime only after inspecting current runs. Password-free switching is loopback-only; `--require-access-codes` disables it.

### S2 — Qualified host and fail-closed provisioning (B)

- [ ] Implement actual host inventory/readiness: KVM, image validity/permissions, free disk, real per-component memory/CPU allocation plus host reserve, model digest/readiness and isolation capability. Missing or unqualified prerequisites disable expanded launch with exact reasons.
- [ ] Obtain/configure a suitable dedicated host; none is currently connected. Provisional accepted envelope is32 GiB RAM, eight logical CPUs, KVM, SSD, with actual workload headroom proven. Current laptop measurements do not qualify the complete topology. No paid/cloud purchase is automatically authorized.
- [ ] Coordinate model allocation with Tanvir before running a larger model or claiming capacity. Preserve existing optional Windows/Elastic profiles and one-active-company behavior.

**First atomic action:** inventory/preflight the proposed expanded host and document each missing prerequisite; independently human-check the installed local Windows browser while host provisioning is blocked.

### S3 — Sealed company, script, Windows and model zones (B)

- [ ] Provision immutable bases and disposable per-run overlays: trusted supervisor/control/model services, private company guest, no-NIC restricted-script guest/broker channel, and Windows workstation restricted to required company endpoints.
- [ ] Deny Internet/LAN/host-management/cloud-metadata/IPv6/cross-run routes, not just outward bridge traffic. Seal the model zone too; prepare weights/packages/assets before a run. No runtime downloads/CDN/telemetry/externalSMTP/cloudfallback.
- [ ] Keep provisioning credentials, host filesystem, Docker socket, target/scoring DB and management APIs outside model/generated-code/guest access. Registry resolves all reviewed destinations; participant/model text cannot supply arbitrary endpoints or exempt identities.
- [ ] Bind run/actor/commandID/idempotency/epoch/jobgeneration outside model-controlled fields. Validate both schema and capability/handle policy at every leaf operation.

### S4 — Read-only real VM observation and replay (B; includes frontend ownership)

- [ ] Add authenticated per-run Windows screen streaming/recording to the existing instructor split view. Trainees control their own VM; instructors/assigned observers get a separately enforced **read-only** stream with no input/clipboard channel.
- [ ] Implement grant expiry/revocation during streaming, wrong-run/media/export/SSE rejection, reconnect, segment/gap markers, storage reservation/quotas/retention and terminal playback. Keep learner live strategy denied in both practice/assessment and own-terminal review permitted.
- [ ] Preserve optional capture consent and blocked private input/notes, no personal desktop/camera/microphone. Keep actual prompts/final outputs/proposals/rejections/dispatch/target confirmations distinct; never expose private chain-of-thought or fabricate thoughts/typing.
- [ ] Own the necessary changes in `apps/web/` and browser tests while Ahnaf is away. Keep the accepted light operational theme, four main destinations, More tools/resources, separate instructor shell and immersive Windows behavior.

### S5 — Full B acceptance before enabling expanded launch

- [ ] Prove actual trainee input versus observer read-only behavior; run host/LAN/Internet/metadata/IPv6/cross-run denial, resource exhaustion and privilege-boundary tests.
- [ ] Exercise the complete topology with actual Windows/company/script guests, model, capture, one trainee, one instructor and two observers. Targets: decision p95 ≤10 s with 30 s deadline, event delivery ≤1 s, tab/VM view p95 ≤2 s on LAN; Tanvir supplies model evidence. Measure all failures and host/source/configuration identity.
- [ ] Perform10 clean resets with no stale overlays, handles, grants, sessions or cross-run artifacts. Existing smaller container/optional-VM proofs do not establish these new gates.
- [ ] Obtain fresh independent evaluation and retain failed receipts. B remains disabled until its actual host/isolation/model/load gates pass.

### S6 — Trusted 15 active-minute clock, command ledger and verdict (C)

- [ ] Version target authority for monotonic active clock, one-second controller heartbeat, three-second lease expiry, epochs, command ledger, transactional effects/audit/health transitions and idempotent results. Refactor nested `benign()`→`request()` transaction commits before relying on atomicity.
- [ ] Acquire the write transaction before reading deadline/epoch/world state; perform the final fresh validation at the linearization point. Keep inference/VM/network waits outside it. Every web/mail/click/defense entrypoint uses the same trusted handlers.
- [ ] Reconcile unknown acknowledgments by commandID; fence stale/cancelled/late commands. Pause/deadline barriers are serialized with effects. Preserve a committed breach across faults; never award a win while effects are uncertain.
- [ ] Count normal inference against the 15 minutes; enforce 30 s model deadline. Verified technical fault pauses require acknowledged target barrier, ≤60 s wall time per pause and ≤120 s cumulative; unresolved faults become technical failure. Restart/suspension/authority loss cannot reconstruct time to award a win.
- [ ] Enforce no-breach survival plus **≥171/180**fresh business bundles at 5 s intervals,**≤30 active seconds**continuous business disruption and a healthy final 900 s bundle exactly once. Use transactional health transitions for outage duration. Missing/late probes are authority faults, not fabricated backfilled health.
- [ ] Add versioned defended/breached/continuity_failed/aborted/technical_failure semantics while preserving canonical lifecycle compatibility. Timed verdict is separate from the100-point formative learning score; old rubric timing must not silently govern new timed survival.

### S7 — Capability broker, restricted interpreter and internal mail (C)

- [ ] Agree versioned tool/observation schemas with Tanvir first; update `contracts/`, schema exports and the master contract. Preserve current six-action scenario compatibility and existing authoritative validation/scoring.
- [ ] Implement one in-flight model/job and shared token bucket capacity 1: Easy ≤1 operation/10 active seconds, Medium ≤1/5, Hard ≤1/3. All script leaf calls/mail deliveries consume the same adversary budget; only trusted server probes/defender responses are exempt. Continue permitted blocked-state observation every 15 active seconds.
- [ ] Execute a finite Python-shaped AST, **never unrestricted Python `exec`**. Reviewed assignments/literals/collections/conditionals/comparisons and exact `lab.<tool>` calls only; reject loops/functions/classes/imports/dunders/reflection/files/OS/process/socket access.
- [ ] Enforce16 KiB source,8 leaf tool calls/job,30 s wall time,1 CPU,256 MiB RAM,16 MiB scratch,64 KiB output/individual result and128 KiB channel message from parsing through output. Unprivileged guest, broker-held credentials, late-generation fencing and independent validation for every leaf.
- [ ] Add plain-text internal fictional mail, approved roster/in-lab link only,≤3deliveries/round, no attachments/active HTML/outside URLs. Click grants at most one scoped synthetic session per recipient/round, honoring disabled accounts/reauthentication. Quarantine/blocked links have no effect; click alone never equals breach.
- [ ] Provide versioned defender mail-quarantine/link-block controls, real artifacts/status/audits and truthful source labels. Tanvir supplies generation/quality; Saad owns effects, isolation and UI integration.

### S8 — Timed UI, debrief and integration (Saad owns the remaining UI)

- [ ] Extend the existing pre-start briefings with difficulty/capabilities, mail mechanics and exact continuity rules before Begin. Display authoritative clock, pause/fault/connection status and server-confirmed responses without covering the focused workspace.
- [ ] Extend instructor observation with actual code/mail/job outcomes and trainee/VM activity; preserve read-only/role boundaries and the separate instructor layout.
- [ ] Implement precise result explanations, failed continuity condition/bundle count/longest disruption/final workflow evidence, and causal read-only timed replay/export. Preserve acknowledged notes, drafts, worksheets and old scenario URLs/modes.
- [ ] Coordinate frontend/shared-file ownership explicitly with Tanvir; do not wait for changes to `Ahnaf.md` or a response from Ahnaf. Inspect current source because old original owner docs predate this reassignment.

### S9 — Security, fault and genuine timed acceptance

- [ ] With Tanvir run real 15 minute scenarios across three seeds/difficulty: no-defense objective, blocked-route feasible alternative, all-blocked denial through deadline, actual Hard mail/scripts. No injected fallback attacks or model claims counted as target success.
- [ ] Test concurrent defense/protected reads, pause/deadline acceptance races, duplicate/lost acknowledgment, cancellation/late calls, nested-budget bypass, target/control restart, host suspension, delayed probes, storage full and streaming grant revocation.
- [ ] Test171 versus 170 bundles,exactly 30 s versus >30 s outage, disable/restore, final unhealthy workflow and no compromised-access resurrection. Replay reproduces the recorded result without model/target side effects.
- [ ] Fresh independent evaluation must distinguish narrower existing proof from expanded release readiness. Include source/model/manifest/host identities and all failed/unavailable gates.

### S10 — Operations, accessibility and test storage

- [ ] Before shared deployment, qualify authenticated HTTPS/WebSocket gateway/reachable origins, standard access codes/auth, session/role/grant revocation, backup/reset/recovery, quotas/retention and deployment capacity. Never publish the password-free local demo through a shared proxy. Recheck applicable provider requirements before any hosted-model integration.
- [ ] Complete manual browser zoom/reflow, assistive-technology/screen-reader, keyboard/touch and reduced-motion checks with preserved work and readable states. Existing sampled automation is not full WCAG or representative usability evidence.
- [ ] Automate bounded cleanup of **disposable test** observer reservations. 53 old completed pytest reservation files consumed about 53 GiB and required manual cleanup; clean rerun passed 400 tests. Do not weaken live audit admission or delete user runtimes/images/records to make tests pass.
- [ ] Preserve the current working local preview and deployment/startup instructions; do not commit runtime secrets, signed grants, Windows media/credentials, model weights or video recordings.

### S11 — Product/demo handoff and explicit deferrals

- [ ] Maintain final engineering documentation/model limits with Tanvir, prepare/rehearse an actual verified 3 minute demo and submission-ready material if still required. Official track/deadline/format are unconfirmed; obtain them from the relevant authority rather than assuming old planned dates. No submission, purchase or contacting others is authorized just by this handoff.
- [ ] Tanvir maintains the learning-quality/pilot kit; Saad supplies reliable environments and evidence export. Actual eight-beginner/two-expert sessions, unfamiliar transfer and delayed retention remain **user-deferred**; do not invent participant outcomes or quietly assign them back to unavailable Ahnaf.
- [ ] Additional endpoint/phishing families, scenario publication/team extensions and larger Linux VM provider remain later roadmap scope where not covered by B/C. Keep them visible in the backlog; do not describe absent evidence or broad roadmap aspirations as implemented functionality.

## Source map and verification

Runtime: `services/range_runtime/{api,engine,target,adapter,db,observer,tool_worker,learning}.py`; entrypoints `apps/{control-api,target-api,range-worker}/`; contracts/scenarios in their existing folders. UI: `apps/web/src/features/live/`, shared `features/console/Chrome.tsx`, `styles/live.css`. Proofs: `scripts/verify_compose_isolation.py`, `scripts/prove_windows_gateway.py`, `scripts/prove_optional_tools.py`, `scripts/capture_windows_vm.py`; inspect usage before running against a runtime. Create missing expanded isolation tests when implementing B; a legacy path mention is not an existing suite.

```bash
python3 scripts/check_runtime.py
npm --prefix apps/web test
npm --prefix apps/web run build
python3 scripts/harness_sync.py update --task saad-range-control --phase IMPLEMENT \
  --complete "Exact completed change and measured evidence" \
  --next-step "Next atomic action or named blocker"
harness check run .
harness check evaluate .
```

Run affected project-native browser checks on disposable fixtures, never broad cleanup against a user's active run. Use separate fixture ports/output for concurrent verification. At integration milestones also checkpoint `master-integration`; preserve Tanvir's 10/12 objective FAIL and 51989 ms coach tail until their own measured gates pass. Record completed work, exact remaining work, blockers, source/evidence and next action at each handoff. Keep `Ahnaf.md` byte-for-byte unchanged.
