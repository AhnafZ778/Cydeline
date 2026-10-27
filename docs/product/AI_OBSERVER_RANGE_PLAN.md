# Sentinel Loop: live AI observer and bounded timed range

Date: 24 October 2026 (Asia/Dhaka).
Status: **APPROVED — design only**, following sequential independent review and final arbitration.
Implementation status: not implemented. This document does not establish runtime readiness.

## 1. Resume here

Read this plan, `AI_OBSERVER_RANGE_REVIEW.md`, the master task contract, and the current owner packet before changing code. Reconcile them against the working tree. The existing implementation was published at `dffe457a3dacc83d970b515b9451d02ae63a540c` on `chore/publish-workstreams`; discussion and planning documents are newer local work. Do not infer a new push from the earlier publication request.

Next atomic action: begin milestone A with the observer authorization/provenance contract and its focused backend tests, then build the UI on those server guarantees. The final independent arbiter accepted every recorded reviewer resolution; retain the review log and keep runtime qualification separate.

Preserve these unresolved facts:

- The current Qwen3:1.7b objective gate failed: 10 of 12 journeys passed. Both Reporting service-dependent repeats failed adaptation. Post-containment waits/stops are not proven pivots.
- The coaching benchmark passed its authored cases, but a separate live answer took 51,989 ms. Do not hide that tail behind the isolated benchmark.
- No real Windows image is configured on the present laptop. Existing gateway proof does not establish an actual Windows desktop.
- The user deferred participant sessions: leave the pilot kit ready, without invented observations or learning-effectiveness claims.
- Current active context occupancy is unknown. Checkpoint at milestones rather than guessing a percentage.

## 2. Confirmed intent and product boundaries

Build a real local AI opponent that chooses permitted actions against functioning fictional company services. It can generate limited executable lab scripts and internal training emails, observe target responses, and choose a different permitted path when a defense blocks it. Model failure, poor choices, waiting, and lack of adaptation remain visible; no scripted substitute counts as AI execution.

During a live exercise, only instructors and assigned read-only observers see the AI detail and trainee activity. Trainees investigate using ordinary SOC evidence; they can review their own AI trace after the round ends. This supersedes the existing practice-mode live Adversary Lens exception, including server responses, exports, and SSE—not just frontend visibility.

The accepted instructor layout is a split view: the trainee exercise tab or lab Windows desktop on the left, real AI activity and artifacts on the right. A synchronized timeline supports post-round review. Narrow layouts switch between views instead of squeezing both columns.

Operational defaults:

- Dedicated lab host; laptop acts as a browser client. One active round initially. Qualification load is one trainee, one instructor, and two assigned observers; larger audiences are unqualified.
- Fifteen active minutes, starting only after readiness checks and an explicit Begin action. Ordinary model generation and browser disconnection count toward that time.
- Windows is the trainee workstation for this release. The AI attacks the private company backend and internal mail system. Windows endpoint compromise is a separate future attack family.
- The AI receives its own target-visible evidence, prior tool results, declared starting access, and its capability manifest. It never receives trainee cursor recordings, notes, instructor commentary, or the full hidden target world.
- A win requires protecting the finance canary document and legitimate operations. Any committed adversary read of that document is an immediate breach loss, even if the client never receives the response.

## 3. Authorization and isolation

Every run has an operator-owned, versioned scenario manifest naming targets, fixtures, tool capabilities, objective, workflows, timing, and resource limits. No participant can supply a new destination URL, external account, domain, attachment, exploit framework, or command interpreter.

Retain the current trusted FastAPI control plane, SQLite WAL persistence, and local Ollama service. Separate these from disposable per-run guests:

| Component | Purpose | Permitted access |
| --- | --- | --- |
| Trusted supervisor/control/model services | Provisioning, validation, scoring, model inference, recording access | Management services only; model has no provisioning credentials |
| Company Linux guest | Audited identity, documents, fictional internal mail and click mechanics | Required private lab services only |
| Script Linux guest | Execute a restricted lab program | No NIC; one bounded job channel to the broker |
| Windows guest | Trainee company workstation | Private company web/mail endpoints only |

Use immutable prepared base images and disposable writable overlays. Only the trusted supervisor can access VM administration. Generated programs cannot modify target code, its database, trusted health checks, clock, lease, or scoring authority. No host secret mounts, Docker socket, host filesystem sharing, or management credentials enter a guest or model context.

The host firewall denies Internet, LAN, host management, cloud metadata, cross-run traffic, and IPv6 escape paths; explicitly allow required flows. An isolated bridge alone is insufficient because isolated networks can still reach the host. Seal the model service zone too. Install approved packages, weights, and assets before the run; no runtime downloads, external DNS, telemetry, CDN, SMTP, or cloud inference fallback.

All identities, data, and email recipients are fictional. No real password collection, harmful payload, outside delivery, or outside exfiltration is part of this release. The protected objective is an actual authorized target-handler read of synthetic finance document contents.

Policy basis: this scope is designed around explicit authorization, owned educational targets, consent, and prevention of external effects, reflecting the [OpenAI Usage Policies effective 29 October 2025](https://openai.com/policies/usage-policies/revisions/2025-10-29/), applicable on this planning date. It is not an OpenAI approval or a guarantee of future compliance. Recheck the effective policy before release or any OpenAI-hosted provider integration; the main policy page currently announces a later effective date. The planned runtime uses a local model.

## 4. Real AI actions and difficulty

Every proposed operation passes a strict schema and an independent capability/handle policy check. Bind run, actor, command ID, idempotency key, epoch, job generation, and model decision outside model-supplied arguments. Resolve destinations through the trusted scenario registry. Reject arbitrary URLs, redirects, paths, role exemptions, and unknown handles. Tool replies are untrusted data, not authority to expand capabilities.

| Difficulty | Available adversary capabilities | Maximum dispatch rate |
| --- | --- | --- |
| Easy | Reviewed browser-session inspection, document listing/read, session test, wait/yield | One adversary target operation per 10 active seconds |
| Medium | Easy capabilities plus the reviewed Reporting API route | One per 5 active seconds |
| Hard | Medium capabilities plus internal mail and restricted lab scripts | One per 3 active seconds |

These are maximum rates, not promises about inference speed. Use one in-flight model/job and a token bucket of capacity one. Every adversary target dispatch, including a nested script call or mail delivery, consumes the same bucket. Trusted business probes, health checks, and defender responses do not consume it; model/script fields cannot select an exempt identity. Thus nested scripts cannot multiply attack throughput. Fixed mail quotas remain separate.

Wait/stop is a yielded turn, not an early finish of the timed round. The next turn remains scheduled; when all routes are blocked, offer permitted observation turns every 15 active seconds. Do not reactivate a revoked route or inject fresh access to make the opponent look busy. The reviewed phishing-click mechanic is the sole new-access mechanism in this scope. No automated fallback execution or narration is permitted.

### Restricted lab programs

The UI calls these **restricted lab scripts**, never an unrestricted terminal or general Python environment. A finite Python-shaped AST interpreter executes assignments, literals, lists/dictionaries, conditional branches, comparisons on prior results, and exact allowlisted `lab.<tool>` calls. It executes the submitted program and real permitted requests; the code view is an artifact of that job, not a cosmetic animation.

Reject loops, function/class definitions, imports, generic attribute traversal, dunders, reflection, evaluation of generated code, files, OS/process operations, and sockets. Do not hand the source to unrestricted Python `exec`.

Limits apply from parsing through evaluation and output construction: 16 KiB source, eight leaf tool calls per job, 30 seconds wall time, one CPU, 256 MiB process memory, 16 MiB scratch tmpfs, 64 KiB combined output or individual tool result, and 128 KiB maximum channel message. Run unprivileged inside the disposable guest. The broker holds all credentials and validates every leaf again. On timeout/cancellation, fence the job generation and reject late requests. Output is data, never a control-plane instruction.

### Internal training mail

Allow plain-text drafts, delivery to a reviewed fictional roster, and status of the AI's own training messages. Maximum three deliveries per round; no attachments, active HTML, external links, or arbitrary recipients. A reviewed in-lab link can grant at most one scoped synthetic session per recipient per round, honoring account-disable and reauthentication state. Quarantined mail or a blocked link has no effect. A click alone does not lose the round; a subsequent actual adversary objective read does. Versioned defender tools provide mail quarantine and link blocking alongside existing session/account/API credential controls. Explain this synthetic mechanic in the briefing.

## 5. Authoritative timing, effects, and results

Extend the trusted target authority rather than accepting browser or model claims. The target owns its active monotonic clock, lease epoch, command ledger, objective evidence, business health transitions, and timed verdict.

Each authority operation acquires SQLite `BEGIN IMMEDIATE` before reading lease/deadline/world state. Helpers receive the existing transaction and never commit independently. Refactor the current nested `benign()` → `request()` transaction pattern before relying on it. The final fresh clock/epoch check under the write transaction is the operation's linearization point. Atomically record the world change or protected-read result, target audit, idempotent command result, health transitions, and any breach verdict. No model, network, VM, or long-running job wait occurs under that transaction.

All target entry points—including company web actions, defenses, mail insertion, and click effects—use these handlers. Mail delivery is a local mailbox database insertion, not an external SMTP side effect. Target transaction order decides competing commands. Pause/deadline barriers change the epoch in the same serialized authority; earlier valid committed effects count, later stale work is rejected. Resolve uncertain acknowledgements by command-ID ledger lookup, not by sending a fresh command or assuming nothing happened.

Normal inference counts against the fifteen minutes. Each model call has a 30-second deadline. A verified model/target fault pauses only when the target acknowledges the pause barrier; do not erase earlier inference latency. A separate controller heartbeat runs every second; the target fences on a three-second lease expiry. Instructor pause/resume/stop is separately authorized and audited. A fault may pause for at most 60 wall seconds, with 120 wall seconds cumulative technical pause, before technical failure.

Browser reconnect resumes the actual snapshot and history; it does not restart the timer. A controller/target process restart, host suspension, or loss of reliable clock authority invalidates an interrupted round after ledger reconciliation. Preserve an already committed terminal result, especially breach; otherwise mark technical failure rather than reconstructing a monotonic clock and awarding a win.

Continuity rules are fixed and disclosed before Begin:

- Healthy baseline before start, excluded from the denominator.
- Business bundles at active seconds 5, 10, …, 900: 180 bundles, each passing only if every named legitimate workflow passes. At least 171/180 must pass.
- The 900-second bundle is the final bundle, counted once, and all its workflows must pass.
- Use actual fresh legitimate Maya/Eli document workflows and the legitimate Reporting workflow where that profile includes Reporting. Legitimate reauthentication never resurrects compromised access.
- Every business-affecting world mutation also evaluates workflow health transactionally. Its exact active-time health transitions determine the longest continuous disruption; it must not exceed 30 active seconds. Do not infer duration by counting failed sample timestamps.
- Record actual observation timestamps. A missed or more-than-one-second-late scheduled probe is an authority fault: fence/pause and reconcile, or invalidate the round. Never backfill invented historical observations. A defender-induced business denial is a real continuity failure, not a technical excuse.

At the deadline, fence adversary/security changes, reconcile prior accepted commands, and perform the final trusted workflow check before committing the result. No final win is issued while command effects are uncertain.

| Timed result | Meaning | Canonical lifecycle state |
| --- | --- | --- |
| `defended` | No breach; continuity percentage, duration, and final-health conditions all pass | `completed` |
| `breached` | Actual adversary canary read committed; immediate terminal loss | `completed` |
| `continuity_failed` | No breach, but at least one continuity rule fails at the deadline | `completed` |
| `aborted` | Instructor ends the round | `aborted` |
| `technical_failure` | Unresolved authority/model/infrastructure failure, with no earlier committed terminal result | `technical_failure` |

Do not translate survival into legacy `defended_and_recovered` or claim containment without its evidence. Keep the existing 100-point rubric as separate formative learning feedback. A high learning score cannot overturn a lost or technically invalid round. The result page names the exact failed condition, bundle count, longest disruption, and final workflow evidence.

## 6. Observer experience, privacy, and storage

Record each actual supplied prompt, schema/configuration, sanitized target observation, final structured model reply, and short **AI-stated intent**. Do not extract private chain-of-thought, invent thoughts, or use an extra model to retrospectively narrate a rationale as fact. Link the next observation and decision to the actual prior target evidence; a changed action alone does not prove intelligent adaptation.

Distinguish proposal, validator rejection, dispatch, target confirmation, and the independent target status allowed/denied/error. “Executed” never means successful protected access. Show invalid proposals, timeouts, waiting, stopping, stale work, and unavailable execution honestly. Code and email panels show real generated artifacts and their audited outcomes; no simulated typing or unsupported attack animations.

Use durable per-run observer sequences, correlation IDs, and server timestamps with SSE cursor backfill/deduplication. Observer updates target one second after server events; captured tab/VM activity targets p95 two seconds on the qualified LAN host. Client recording clocks are approximate display alignment only, never scoring authority.

Enforce authorization on history pages, SSE, artifact fetches, exports, media, VM frames, and replay. Signed-in instructors and assigned observers can read live data; a trainee can read only their own terminal-run review. Observers cannot send VM input, defend, start, pause, resume, or stop. Use actor-bound viewer leases of at most 30 seconds with authenticated proxies that terminate active sessions on revocation. Do not expose transferable Guacamole grant URLs or reuse trainee grants for observers. Enforce read-only input opcodes at the gateway and disable clipboard/file transfer. Require same-origin authenticated sessions over TLS on the private LAN/VPN; public deployment is out of scope.

Before joining, disclose and obtain acknowledgment for exercise recording. Capture only the exercise tab DOM/cursor and the dedicated lab VM display. Self-host pinned `@rrweb/record` and `@rrweb/replay` packages. Explicitly mask all browser inputs and block notes/private elements. No console/network plugins, canvas recording, or cross-origin iframe recording. Cursor sampling is capped at 10 Hz, batched every 250 ms. The VM is captured separately through its actual Guacamole console/protocol recording, including the visual pointer; keystroke logging is off. VM pixels are recorded, so the notice expressly says to enter fictional lab information only. Do not claim DOM input masking also masks text rendered inside Windows.

Sandbox replay of captured DOM so recorded content cannot execute scripts, submit forms, navigate, or issue network requests. Prepackage owned fonts/assets. Neither recordings nor cursor activity feed the adversary or determine grades.

Keep encrypted local visual captures, prompts, code/mail artifacts, and outputs for seven days; minimal result/audit metadata for thirty days. Keep keys and runtime credentials outside Git and guest/model contexts. Cap total visual capture at 2 GiB per run and reserve 1 GiB for bounded core events/artifacts. Refuse launch without storage capacity. A visual quota or recorder failure creates an explicit gap and incomplete-replay label while gameplay/core auditing continue. Core audit storage failure fences the round; do not silently drop audit data. Expired content and older hash-only histories stay visibly absent rather than being reconstructed.

## 7. Interfaces and compatibility

Keep all six canonical legacy enums and legacy exercise semantics intact. Add a separate timed contract/version and namespace; do not silently extend legacy `AttackerAction` with mail or scripts.

- `/api/v2/runs`: create the fixed 900-second timed profile with scenario/version, existing practice/assessment mode, and difficulty; read learner-safe state and submit typed, idempotent defenses. Duration and capability manifest are server-owned.
- Instructor control routes authorize pause/resume/stop separately from observer access. Instructor grant routes assign/revoke per-run read-only observers; assignments never imply exercise control.
- `/api/observer/runs/{run_id}` exposes authorized event history/SSE, sanitized artifacts, recording metadata/chunks, and read-only VM/replay access for either supported legacy runs or v2 runs. Permission is checked for the run and current lifecycle, not inferred from knowledge of the identifier.
- Authenticated capture uploads are scoped to the active trainee/run and bounded by payload and storage limits. Capture is observational and untrusted.
- Add versioned tool proposal/result, observer event/grant/capture, difficulty manifest, and timed snapshot/result models. New timed clients use `TimedOutcome`; legacy endpoints do not serialize v2 runs as legacy outcomes. Aborted and technical results remain reviewable by their owner.
- Add migrations for run profiles/leases, command and job generations, observer grants/events, and capture/artifact manifests. Existing runs retain their original timing and scoring. Old prompt-hash-only records are labeled incomplete.

## 8. Delivery sequence and ownership

The accepted order is **observer first, expanded range second**. No deployment, purchases, or new GitHub publication is inferred from this plan.

| Milestone | Deliverable | Owner responsibilities | Exit gate |
| --- | --- | --- | --- |
| A: restricted observer | Full actual transcript/provenance capture, server-side live audience separation, read-only grants, split-screen exercise-tab capture, terminal review on existing scenarios | Tanvir: model-call evidence; Saad: storage/auth/SSE; Ahnaf: UI/capture/replay | Focused authorization, provenance, privacy, reconnect, and rendered-UI checks plus independent evaluation |
| B: sealed range and real Windows | Dedicated host, offline model zone, private company guest, disposable script guest, real Windows workstation, authenticated read-only VM display and recording | Saad: provisioning/isolation/authority; Ahnaf: VM observer/replay; Tanvir: model readiness | Real Windows desktop and input/read-only distinction, egress/host/cross-run tests, resource/load proof, ten clean resets |
| C: bounded timed opponent | Versioned clock/result authority, difficulty broker, scripts/internal mail/click effects, target-evidence adaptation, timed debrief | Saad: authority/transaction/scoring; Tanvir: proposal/tools/quality; Ahnaf: briefing, status, result explanation | Full timed model matrix, race/fault/security tests, native checks, fresh independent evaluation |

At A, preserve the existing visual grammar and original SOC workflows while removing live real-model strategy leakage. New observer views are additive. Use keyboard access, WCAG 2.2 AA contrast targets, visible focus, tabular IDs, reduced-motion states, preserved drafts, and explicit Live/Paused/Disconnected/Gap labels. Do not claim manual accessibility conformance before the relevant checks.

Expanded candidate: local Qwen3:8b in non-thinking mode, pinned by model digest/configuration for evaluation. This is a qualification candidate, not a claim that it solves the 1.7b failures. No automatic cloud fallback, unbounded prompt/model roulette, or model training is part of the plan. If it fails the declared gate, retain the failure and leave the expanded profile disabled pending a new explicit capability decision.

Provisional host envelope: 32 GiB RAM, eight logical CPUs, KVM, SSD; Windows 4 GiB/two vCPU, company 2 GiB/two vCPU, script guest 1 GiB/one vCPU, control/gateway 2 GiB, plus measured model allocation and 4 GiB host reserve. A GPU is optional only if the measured complete workload passes. Resource preflight checks actual allocation plus headroom and prevents swap thrashing; the nominal RAM figure alone is not readiness proof. Require operator-provided compatible licensed Windows image and verify the actual desktop. Missing image/KVM/isolation/storage/model or capacity evidence disables launch with a specific reason.

## 9. Acceptance and evaluation

Use project-native backend/frontend/build/browser checks and `harness check run` / `harness check evaluate`. Existing test counts are historical baseline evidence, not a pass for the new code. Evaluate each material increment independently; fixes return to Implement.

Required scenarios:

1. Authorization/privacy: live trainee denied in both modes and through every export/media/SSE path; correct own-terminal review; forged run/actor IDs; wrong-run artifacts; revoked/downgraded active observers; copied/expired grants; observer input/clipboard attempts; hidden notes/input masking; replay injection and no network execution; retention expiry and visual quota gaps.
2. Tool isolation: malformed/injected model output, unknown handles/tools, indirect AST access, CPU/memory/output/channel exhaustion, nested budget bypass, cancellation/late calls, forged exempt identity, invalid recipients/URLs, cross-run access, host/LAN/IPv6/metadata/Internet egress. Zero out-of-policy dispatches.
3. Authority races: concurrent defenses/protected reads, pause/deadline before and after acceptance, lost acknowledgments, duplicate dispatch, job timeout, nested-helper commit regression, competing processes, target/control restart, host suspension, missing/delayed probes, disk-full, grant revocation during streaming. A committed breach survives every subsequent error; uncertain effects never become a win.
4. Continuity examples: 171 versus 170 passing bundles; outage exactly 30 versus more than 30 active seconds; temporary disable/restore; final unhealthy workflow; no duplicated final bundle; fresh legitimate access without resurrected attacker credentials. Deterministic replay reproduces the result without executing model/target work.
5. Genuine fifteen-minute model qualification across three seeds per difficulty: no-defense trials reach the actual objective; Medium/Hard fixtures with a blocked route and a feasible unknown alternative demonstrate an audited model-chosen alternative and objective read; all-blocked fixtures remain denied and continue permitted observation until the deadline. Easy single-route fixtures use the no-defense and all-blocked cases. No credit for injected fallback actions or waits/stops presented as pivots. Hard additionally proves real generated restricted-script execution and the reviewed internal-mail/click path.
6. Full concurrent host load: actual Windows plus company/script guests, AI, capture, one trainee, one instructor, and two observers. Measure decision p95 ≤10 seconds with a 30-second invocation deadline, server event delivery ≤1 second, and tab/VM view p95 ≤2 seconds on LAN. Record source/model/config/host identity and all failures. Ten resets leave no stale overlays, grants, sessions, or cross-run artifacts.

These are release gates, not observed results. A missing independent evaluator or hardware/model proof stays missing. Participant studies remain deferred.

## 10. Durable checkpoints

Store review findings and dispositions in `AI_OBSERVER_RANGE_REVIEW.md`. Amend each owner's task contract before its consequential work. At every implemented/evaluated milestone use the existing `scripts/harness_sync.py update` workflow to synchronize native harness state and tracked context: phase, verified completion, decisions, retained failures, exact next atomic action, and evidence. Do not put project choices in durable personal preferences. Keep recordings and credentials excluded from Git.

The master packet must point to this plan and the unresolved review/runtime gates. Never overwrite existing model failures, pending Windows proof, or the user-deferred pilot with a generic “complete” status.

## Primary references checked

- [OpenAI applicable usage policy](https://openai.com/policies/usage-policies/revisions/2025-10-29/) and [announced later policy](https://openai.com/policies/usage-policies/).
- [libvirt network XML](https://libvirt.org/formatnetwork.html): network isolation needs explicit host restrictions.
- [Apache Guacamole 1.6 configuration](https://guacamole.apache.org/doc/gug/configuring-guacamole.html) and [JSON authentication](https://guacamole.apache.org/doc/gug/json-auth.html): read-only, recording and grant expiry capabilities; active revocation remains our gateway responsibility.
- [rrweb library guide](https://rrweb.com/docs/guide): self-host modern recording/replay packages with explicit privacy options.
- [Qwen3 official repository](https://github.com/QwenLM/Qwen3): local model family and inference configuration; no inference of application-level qualification.
