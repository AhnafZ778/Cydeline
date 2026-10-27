# Task contract: Master Integration (`master-integration`)

## Current increment: approved AI observer and bounded timed range design (24 October 2026)

The current implementation handoff is `docs/product/AI_OBSERVER_RANGE_PLAN.md`, with confirmed choices and sequential independent review in `docs/product/AI_OBSERVER_RANGE_REVIEW.md`. Final arbitration: **APPROVED, design only**; no new feature or runtime gate has been implemented/passed by that review.

Deliver A (restricted observer on existing scenarios), then B (sealed dedicated-host range and real Windows workstation), then C (versioned timed opponent, internal mail and restricted scripts). Live AI strategy is instructor/assigned-observer only in both practice and assessment, superseding earlier live learner Lens exceptions. Trainees review their own terminal runs. Capture exercise tab and lab VM with notice, not personal desktop. Windows is the trainee workstation, not an endpoint-compromise objective in this release.

Keep legacy six canonical enums/exercise timing intact; use separate versioned timed/tool contracts. New fifteen-active-minute win: no committed adversary finance-canary read, at least 171/180 legitimate business bundles, no business disruption over 30 active seconds, final workflows healthy. Target authority owns transactions, clock, audit, fencing, and verdict. Ordinary inference counts; outages/aborts never award a win. Restricted scripts and internal mail cannot reach outside the owned disposable lab; AI receives target evidence only. Full details and exact limits/gates are in the approved plan.

25 October status: milestone A independently evaluated in its bounded scope; local Windows base and worker/gateway API boot proof now pass. Next atomic action: implement expanded B fail-closed host inventory/qualification and provision its sealed company/script/model/Windows zones on suitable hardware. Browser-rendered Sandbox remains unverified after a browser-tool policy refusal; full B VM observation/isolation/load and C timed opponent remain pending. Preserve AI-LEARN-01/02, missing actual Windows proof, and user-deferred pilot. Expand only after the plan's independent evaluation and real model/host/security gates. Historical sections below remain evidence of prior contracts; conflicting live Lens/old scoped constraints do not override this amendment.

## Audience and outcome
- **Audience:** Ahnaf (Project Lead & Overseer), Tanvir (Local AI Red-Team Owner), Saad (Cyber Range & Control Plane Owner), and any takeover AI agent or engineer entering the repository mid-flight.
- **Outcome:** Coordinate and verify the end-to-end **Sentinel Loop** Competition MVP ("The Stolen Session" at fictional **Northstar Analytics**, `northstar.test`) across all three segments so that a human defender can investigate live telemetry, cite evidence, revoke the compromised session (`sess_A`), verify both suspicious-access denial and Eli's business continuity, inspect a deterministic 100-point debrief, replay the recorded trace without side effects, and reset the range cleanly 10 times consecutively.

## Current source identity
- **Repository:** `/home/ahnaf-zakaria/Downloads/Cydeline`
- **Branch:** `chore/publish-workstreams`
- **Harness Project ID:** `31fd9903-57c9-4f5f-9344-96cef387c8f6`
- **Authoritative Spec:** `01_PRODUCT_REQUIREMENTS_DOCUMENT.md`

## Acceptance examples (observable)
1. **G0 (Contract Freeze):** `contracts/` defines canonical Pydantic models and JSON Schemas for `RunState`, `Outcome`, `Mode`, `AttackerAction`, `DefenderAction`, `Verification`, `EventEnvelope`, `AttackerProposal`, and the 11 `/api/runs/*` endpoints; static mock fixtures unblock parallel work across `ahnaf-lead-ux`, `tanvir-red-agent`, and `saad-range-control`.
2. **G1 (First Live Causal Link):** A schema-valid, policy-valid proposal from `services/red-agent/` (Tanvir) is dispatched by `apps/control-api/` (Saad) through the Target Adapter to `apps/target-api/` (Saad), producing an actual HTTP result and correlated target audit event stored in SQLite WAL.
3. **G2 (Real Containment & Continuity):** Compromised session `sess_A` (`maya@northstar.test`) reads allowed resources before containment; after `revoke_session` is applied, subsequent `sess_A` requests are denied by `apps/target-api/`, `services/red-agent/` adapts or selects `stop`, and unaffected employee `eli@northstar.test` passes `verify_benign_workflow`.
4. **G3 (Full P0 Loop):** From `apps/web/` (Ahnaf), a learner executes `start -> monitor -> investigate -> declare with evidence -> contain -> verify (both probes) -> debrief -> replay -> reset` without manual database edits or terminal intervention.
5. **G4–G6 (Scoring, Replay & Security Release Gates):** 100-point rubric and outcome gates (`defended_and_recovered`, `contained_but_disrupted`, `attacker_objective_reached`) are deterministic; `/replay` is strictly read-only (`AT-07`); 10 consecutive resets leave zero stale sessions (`AT-08`); 0 out-of-policy model actions are accepted (`T-01`).

## Constraints and non-goals
- **Constraints:** One local quantized model (`Qwen3-1.7B Q4` via Ollama, candidate upgrade `Qwen3-4B Q4`) running 3 sequential logical roles (`scout`, `access_operator`, `adaptation_planner`); strictly 6 allowed attacker actions and 4 allowed defender actions; isolated target with no outbound Internet, no Docker socket, and no host secret mounts; Render-compatible HTTP port binding (`0.0.0.0:$PORT`) where applicable, while keeping the vulnerable target strictly unexposed to the public Internet.
- **Non-goals (P0):** No unrestricted offensive tooling, no shell execution, no arbitrary URLs, no parallel multi-model swarm, no external SIEM/EDR, no multi-tenant billing/leaderboards.

## Consequential decisions and reasons
1. **3-Person Parallel Segment Split (`Ahnaf`, `Tanvir`, `Saad`):**
   - **Saad (`saad-range-control`)** owns both FastAPI+SQLite backend services (`apps/target-api/` + `apps/control-api/` + `contracts/`) to eliminate backend-to-backend handoff latency.
   - **Tanvir (`tanvir-red-agent`)** owns the isolated local AI service (`services/red-agent/` + `tests/agent/` + `docs/model-card/`) so model benchmarking and prompt tuning never block backend or UI progress.
   - **Ahnaf (`ahnaf-lead-ux`)** owns cross-team orchestration, the 7-state React/TS SOC frontend (`apps/web/`), Playwright E2E (`tests/e2e/`), and the 3-minute demo (`docs/demo/`), building against static fixtures first.
2. **Dual-Layer Real-Time Context System:**
   - Every milestone update writes to both `.harness/contexts/<task>.json` (via `harness context checkpoint`) and git-tracked `context/<PERSON>_CONTEXT.md` (via `python3 scripts/harness_sync.py`) so any person or AI agent can take over any segment immediately without re-prompting history.

## Assumptions/unknowns
- **Unknowns to measure in Stage 0:** Exact CPU/RAM/GPU/VRAM on the demo laptop and measured cold/warm latency of `Qwen3-1.7B Q4` via Ollama; official competition track ID and submission portal deadline confirmation.

## Open cross-team contract change requests (filed by `ahnaf-lead-ux`, 2026-10-22)
Status: **PROPOSED — needs Saad sign-off before `contracts/` freeze (G0).** Ahnaf's frontend already ships a simulation that implements all four items, so the UI is unblocked either way.

1. **`EventEnvelope.network` (optional block).** Realistic access-log rendering needs: `src_ip`, `user_agent`, `http_method`, `path`, `status_code`, `latency_ms`, optional `bytes`. Saad's target audit already records most of this (FR-A03). If absent, the UI hides the columns and derives method/path/status from `event_type` + `outcome`. Never include raw tokens.
2. **Scenario fixture signal (`scenarios/stolen-session/v1/`).** Mid-session, `sess_A` requests begin arriving from a second source IP and user agent (RFC 5737 documentation ranges, for example `203.0.113.57` / `curl/8.5.0`) while benign sessions stay stable. This is the teachable, unlabeled evidence for session hijack. Keep benign:suspicious traffic roughly 6:1 with at least one benign 4xx so not every 4xx looks malicious. The control plane must not label the attacker's IP or session anywhere learner-visible.
3. **`summary` / `risk_label` are optional, debrief-only annotations.** They must not be rendered in the live learner stream (PRD UX principle: show facts before interpretation; attacker and benign activity distinguishable only through evidence).
4. **Red-agent internal events** (for example `agent.stop`, per-role decisions) are `learner_visible: false` and only appear in replay/debrief.
5. **Adversary Lens telemetry (practice mode only; added 2026-10-22 on user instruction).** In `mode: practice`, `RunStatusSnapshot.last_ai_decision` (already canonical) is returned live after every AI step so the UI can show what the AI is doing in real time; in `mode: assessment` it stays `null` until the run is `completed`. No scoring change. Optional follow-ups: `ai_phase: thinking | acting | idle`, and an `agent_step` link on adversary events so log lines can be tagged exactly. Until accepted, the UI derives AI log tags from the decision's `session_handle` plus the source IP first seen after the first decision.

**Canonical enums are unchanged** (`RunState`, `Outcome`, `Mode`, `AttackerAction`, `DefenderAction`, `Verification`).

## Next increment
- Resolve AI-LEARN-01 with the saved denied/unknown permission traces and a declared model/policy decision. Retain the failed10/12 gate and live coaching latency tail; participant sessions are explicitly deferred.
- Current scope and evidence: `docs/product/BEGINNER_LEARNING_HANDOFF.md`; preserve prior failed gates.

## Verification commands, interaction checks and required independent review
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- `harness check evaluate /home/ahnaf-zakaria/Downloads/Cydeline`
- `python3 scripts/harness_sync.py status`
- Independent evaluation required at Gates `G0`, `G3`, and `G6` using `harness-evaluate` (`context/evaluations/master-integration.eval.md`).

## Evidence locations
- `00_READ_ME_FIRST.md`
- `01_PRODUCT_REQUIREMENTS_DOCUMENT.md`
- `02_MASTER_BUILD_PROMPT.md`
- `Ahnaf.md`
- `Tanvir.md`
- `Saad.md`
- `context/INDEX.md`


## Authorized live product implementation amendment
Ahnaf authorized the full phased roadmap in docs/product/IMPLEMENTATION_ROADMAP.md. This amendment supersedes conflicting earlier UI-only/P0 scope limits for the new versioned live product. Keep existing v1 fixtures and canonical enums compatible. The unified SOC console is the live shell; mission evidence/response/verification/debrief are reused inside it. The target and server own all results. Composite business verification includes Eli and a fresh legitimate Maya workflow, so disabling Maya produces real disruption and restoration never resurrects compromised access. All terminal states permit debrief. Optional network telemetry, clock and exact decision/action/audit links are accepted. Practice may expose the Adversary Lens; assessment data is redacted server-side. Build and evaluate bounded vertical increments; mark unverified external services honestly.


## 2026-10-23: Accepted console restoration and Windows workstation
Ahnaf explicitly restores the d93b640 original landing, mission workbench and all existing SOC practice tab formats. New live range/training/tools remain additive under explicit #/live routes; the backend and canonical enums are retained. Sandbox is the authorized replacement: genuine Windows QEMU/KVM display via Guacamole, isolated scratch overlay and released-evidence CD. Existing Linux workers must be restarted and cannot be silently presented as Windows. Windows OS boot is gated on a prepared BIOS/IDE qcow2 image, documented in docs/product/WINDOWS_VM.md.


## Approved consolidation — 2026-10-23 (supersedes conflicting earlier fixture/workbench decisions)

Implement one AI-powered SOC using the accepted original console layouts. Root has exactly The Stolen Session (stolen-session/v1) and The Reporting Blind Spot (northstar-breach/v2), compact coached-practice/assessment launch settings, and explicit resume under the one-active-company rule. Original Monitoring becomes Live Monitoring; original Logs and Cases use the same run-scoped snapshot/SSE provider. Preserve original icons, channels, tables, modals, playbook, notes, artifacts, tool arrangements, and training navigation; old run URLs remain valid, old practice links resolve into selected run or landing. No public scripted simulator, sample evidence, invented telemetry, browser grades, or answer keys.

Backend adds authenticated alert ownership/closure comments, idempotent one-case-per-run creation, revision-checked case/playbook/artifact updates with released-evidence validation and old notes/handoffs retained. Declaration, defense, recovery and scoring stay authoritative. Alert closure never ends the attacker. Scenario playbooks gate completion on server records; final feedback/replay is terminal only. Windows/Elastic live in Sandbox; Windows installation and new attack families remain out of scope.

Require actual model readiness on create/start. Invalid/timeout model output records a failed decision and system-pauses clock without fallback execution or step consumption. Authenticated AI retry retries the pending turn; defender-induced stale proposals are discarded without outage. Assessment disallows manual pauses, permits only system AI pauses. Preserve canonical enums, policy/schema checks, target audit correlation, response idempotency and authorization.

Acceptance: both scenario workflows, real model-to-target correlated actions and containment/legitimate continuity; case retries/revisions/old data; refresh, tabs, SSE reconnect, isolation and drafts; AI launch/outage/retry/assessment; 320/390/768/1440 keyboard/accessibility; native tests/build/Harness run/evaluate and handoff.


## Authorized beginner learning loop — 2026-10-23

Implement the attached beginner SOC plan in M0–M4: harden terminal immutability, persisted report identity, response/verification/playbook invalidation and draft isolation; add public company briefings, paused coached starts, three authored micro-exercises, revision-checked autosaved six-part worksheets, evidence-grounded Explain/Nudge/Guide coaching with exact citations and disputes, three meaningful target configurations per scenario, trace-linked causal debrief/export and another-variation launch. Keep the two scenario cards, original console layouts, canonical enums, real local attacker, server scoring and assessment restrictions. No new runtime orchestration framework. Assistance never deducts practice points. Variant manifests pin configuration, seed and hashes; exact replay consumes the recorded trace. Older records load with optional fields absent.

Acceptance: native tests/build/browser checks/Harness; 60 adversarial coaching cases; 12 genuine model journeys (2 scenarios × 3 variants × 2 repeats), audit correlations and paired interventions; coaching p95 ≤15s measured on declared hardware. Record failed/unavailable gates honestly. M4 prepares a counterbalanced eight-beginner/two-expert pilot and 0–2 six-skill rubric; no participant findings or educational-efficacy claims without observed sessions. Product records: docs/product/BEGINNER_LEARNING_RESEARCH.md, BEGINNER_LEARNING_PLAN.md, OPEN_SOURCE_ADOPTION.md.

2026-10-23 evaluation-driven correction: the first uncontained objective matrix reached10/12objectives; both Reporting variation3runs switched too late after discovering missing document permission. Preserve those failures. Feed only actual target-returned document listings into bounded model observations; distinguish authorization403from revoked access. Filter proposed per-route actions by the existing route signal/time window before generation as well as at execution. Keep12steps, pacing, schemas, validation and no substitute attacker execution. Rerun the full12journey matrix after correction.

24 October 2026 (Asia/Dhaka): the user explicitly chose **“Leave the pilot kit ready”**. This delivery completes the engineering and study-preparation work; recruitment, actual eight-beginner/two-expert observations and delayed follow-up remain future work. No learning-effectiveness, retention or certification claim is authorized by engineering checks.

24 October finishing correction: the temperature-0 selector matrix completed 7/12. Four Reporting trials selected null while permissions were still unknown; preserve the failure traces. Restore the previously measured 0.1 temperature and clarify that unknown means untested permission eligible for exploration, while null is reserved for all-blocked observations. Record the exact observed objective states with the selection for audit. The model still chooses among all context aliases including null; policy, execution, pacing and budgets remain unchanged. A fresh complete matrix is required.

24 October completion-setting decision: the predefined exact initial unknown-permission context comparison at `docs/model-card/learning/2026-10-23T18-38-06.701086Z-selector-completion.json` timed out with thinking enabled after 32032ms and completed correct alias JSON in 2472ms with thinking disabled. Final selector uses thinking disabled, 80 output tokens and temperature 0.1 within the unchanged 30000ms CPU budget. Incomplete final replies retain sanitized completion metadata and never dispatch an action. Private reasoning is never parsed as a choice. This diagnostic alone is not scenario acceptance; a fresh full objective/intervention run is required. The preceding clarified-thinking matrix remains explicitly interrupted after six completed trials, with its partial Reporting trace retained.


## Authorized local Windows preparation — 25 October 2026

User explicitly requested “set it up for me” after the host/image prerequisite question. Prepare an actual Windows Server Desktop Experience evaluation base on this laptop using official Microsoft media, private local setup credentials, BIOS/IDE standalone qcow2, KVM and no guest network adapter. Keep the image/ISO/answer file/password outside Git. Refuse overwrite of an existing base and reserve disk/memory headroom; do not close unrelated apps or modify other VMs. Verify actual desktop boot and existing authenticated Guacamole display before claiming success. Preserve evaluation activation/expiry requirements; no licensing bypass or automatic paid/cloud provisioning. This is the existing networkless workstation profile only; full B dedicated-host isolation/load, observer VM recording and C timed capabilities stay unqualified/disabled. Record exact source/media/hash/setup state and continuation command at milestones.


## 2026-10-25 authorized lean shell and local demo access
The current user requests reduced navigation, immersive Windows, briefing before launch, separate instructor mode and password-free local testing. Apply `context/contracts/lean-shell-2026-10-25.contract.md`; it supersedes conflicting all-links-visible/repeated-briefing requirements. Preserve scoring, normal deployed authentication, live audience privacy and prior failed/unverified gates.


## 2026-10-27 unavailable-lead handoff
User states Ahnaf implemented the current baseline and will be unavailable. Current remaining-work ownership is specified in `Tanvir.md` and `Saad.md`: Tanvir leads AI/adaptation/coaching/model evidence and learning-quality readiness; Saad leads infrastructure/authority/integration and all remaining VMobserver/timedfrontend/accessibility/operations work, coordinating directly with Tanvir without an Ahnaf dependency. Do not edit `Ahnaf.md`. This documentation handoff changes neither executable permissions nor canonical schemas and preserves all failed/unverified gates, deferred pilot, and explicit purchase/deployment/contact boundaries.

Follow-up clarification: explicitly carry over Ahnaf's original unfinished leadership/UX/QA/demo duties into both owner handoffs. Saad owns integration coordination, remaining UI, final browser regression/manual accessibility, walkthrough environment, uncut three-minute demo/backup and release/submission preparation. Tanvir owns the corresponding educational review, pilot/rubric readiness, AI qualification and demo-claim accuracy. Original unchecked frontend setup/seven-screen/API-wiring tasks are completed foundations, not new work. Actual participant sessions remain deferred; preserve `Ahnaf.md` byte-for-byte. Acceptance for this documentation increment: every unfinished original duty has a named owner, a deliverable and a link to the existing T/S backlog; source code and executable permissions remain unchanged.
