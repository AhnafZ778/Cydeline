# Task contract: Saad — Virtual Company Cyber Range & Trusted Control Plane (`saad-range-control`)

## Current increment: approved observer and sealed timed range design (24 October 2026)

Follow `docs/product/AI_OBSERVER_RANGE_PLAN.md` and its independent decision/review log. Design arbitration APPROVED; no actual Windows/host/runtime readiness is claimed. A adds actor/run-scoped read-only observer grants, active stream revocation, durable provenance/history, strict learner projections in both modes and bounded private capture storage. B requires an isolated dedicated host and genuine operator-provided Windows workstation image, authenticated read-only VM display/recording, explicit host/IPv6/egress/cross-run denial and measured resources. C adds target-owned transactional clock/lease/command/outcome authority and independently validated script/mail jobs using separate v2 contracts. Refactor nested commits before claiming atomic effects; preserve committed breach through uncertain acknowledgments/restarts. Apply the approved 171/180, ≤30 active-second disruption and final-health criteria, with inference counting and no outage win. Preserve canonical legacy enums/timing and old evidence. 25 October status: A authorization/provenance and local Windows base/worker launch evaluated; next atomic owner task is expanded B fail-closed host qualification and sealed-zone provisioning, preserving the separate browser/VM-recording/load gates.

## Audience and outcome
- **Audience:** Ahnaf's `apps/web/` SOC frontend (REST + SSE consumer), Tanvir's `services/red-agent/` decision engine (orchestrated turn provider), competition judges inspecting backend authenticity, and any engineer/agent taking over Saad's segment.
- **Outcome:**
  1. Deliver `contracts/` and `scenarios/stolen-session/v1/`: canonical Pydantic/JSON schemas and the reviewed Northstar Analytics scenario + 100-point rubric configuration.
  2. Deliver `apps/target-api/` & `infra/range/` (Workstream A): the isolated fictional Northstar Analytics FastAPI + SQLite target with real session/account enforcement, target-local audit logs, benign Eli workflow probe, and 10x deterministic reset.
  3. Deliver `apps/control-api/` (Workstream C): the trusted FastAPI + SQLite WAL control plane owning run lifecycle, per-run lock serialization, monotonic `sequence` event store, SSE live streaming with `Last-Event-ID` backfill, incident declaration validation, idempotent defender actions, dual recovery verification, deterministic 100-point rubric + outcome gates, and read-only replay.

## Current source identity
- **Repository:** `/home/ahnaf-zakaria/Downloads/Cydeline`
- **Segment Task ID:** `saad-range-control`
- **Owned Paths:** `contracts/`, `scenarios/stolen-session/v1/`, `apps/target-api/`, `infra/range/`, `apps/control-api/`, `tests/target/`, `tests/control/`, `tests/isolation/`, `context/SAAD_CONTEXT.md`
- **Authoritative Specs:** `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` (Sections 4, 5 Epics A & C, 7, 8, 10, 11, 12), `04_OWNER_A_CYBER_RANGE.md`, and `06_OWNER_C_CONTROL_SCORING.md`

## Acceptance examples (observable)
1. **SL-001 (Canonical Contracts & Scenario v1):** `contracts/` defines `RunState`, `Outcome`, `Mode`, `AttackerAction`, `DefenderAction`, `Verification`, `EventEnvelope`, `AttackerProposal`, `AgentDecisionRecord`, and Target Adapter types; `scenarios/stolen-session/v1/` defines `maya@northstar.test`, `eli@northstar.test`, `sess_A`, `doc_finance_07`, and the 100-point rubric bands.
2. **FR-A01–FR-A06 & AT-01/AT-02/AT-08 (Target Truth & 10x Reset):**
   - Active `sess_A` can inspect status, list documents, and read `doc_finance_07` on `apps/target-api/`, emitting correlated `AuditEntry` records.
   - Calling `apply_defender_action(run_id, "revoke_session", "sess_A")` causes the next request with `sess_A` to return HTTP `denied` with a correlated audit entry, while `check_benign_workflow(run_id)` for `eli@northstar.test` succeeds.
   - Calling `apply_defender_action(run_id, "temporarily_disable_account", "maya")` blocks `sess_A` but disrupts Maya's legitimate account state until `restore_account`.
   - 10 consecutive `reset` / `create_fresh_target` cycles produce clean fixture hashes and invalidate all prior handles (`AT-08`).
3. **FR-C01–FR-C06 (Trusted Orchestration, SSE & Idempotent Defense):**
   - `apps/control-api/` persists all 9 SQLite WAL tables (`scenario_versions`, `runs`, `events`, `agent_decisions`, `defender_actions`, `declarations`, `evidence_links`, `health_checks`, `scores`).
   - `/api/runs/{id}/stream` emits learner-visible SSE events with monotonic `sequence` and supports `Last-Event-ID` cursor backfill without duplicates.
   - `/api/runs/{id}/declare` rejects nonexistent, hidden, or cross-run `event_id`s (`AT-06`).
   - `/api/runs/{id}/defender-actions` enforces per-run serialization locking (`T-07`) and deduplicates repeated `idempotency_key` submissions (`SAFE-02`).
4. **FR-C07–FR-C09 & AT-03/AT-04/AT-07 (Deterministic 100-Pt Rubric & Read-Only Replay):**
   - Computes Recognition (`20`), Containment (`25`), Verification (`20`), Continuity (`15`), Proportionality (`10`), and Timeliness (`10` using virtual scenario time, excluding model inference latency `AT-09`).
   - Enforces Outcome Gates: verified read of `doc_finance_07` -> `attacker_objective_reached` (`AT-04`); disrupted benign workflow -> `contained_but_disrupted` (`AT-03`); both verification probes required for `defended_and_recovered`.
   - `/api/runs/{id}/replay` reads exclusively from immutable SQLite records without invoking `apps/target-api/` or `services/red-agent/` (`AT-07`).

## Constraints and non-goals
- Never expose `apps/target-api/` directly to the learner browser or public internet; all interaction flows through `apps/control-api/`'s allowlisted Target Adapter.
- Never trust model text (`reason`) to mark an attack successful; require correlated target HTTP outcome + `target_audit_id`.
- Bind HTTP servers to `0.0.0.0:$PORT` (with sensible local defaults e.g. `8000` for `control-api` and internal-only `8001` for `target-api`).

## Consequential decisions and reasons
1. **In-Process + HTTP Target Adapter Interface:** Defining `TargetAdapter` as a clean Python protocol in `contracts/` allows fast in-process/ASGI testing during unit/integration tests (`tests/target/`, `tests/control/`) and isolated container HTTP transport in `compose.yaml`.
2. **SQLite WAL Mode with Explicit Schema Migration:** Zero external DB broker overhead while supporting concurrent SSE readers and serialized per-run writer locks.

## Assumptions/unknowns
- Container isolation (`compose.yaml` with `internal: true` network for `target-api`, dropped capabilities, `no-new-privileges`, memory/CPU limits) will be used on the demo host; if a dedicated disposable VM is available, `infra/range/` will support it.

## Inbound change requests from `ahnaf-lead-ux` (PROPOSED — review before `contracts/` freeze)
See `context/contracts/master-integration.contract.md` section "Open cross-team contract change requests". Summary for this segment:
- Add optional `EventEnvelope.network { src_ip, user_agent, http_method, path, status_code, latency_ms, bytes? }` populated from target-local audit/HTTP results (no raw tokens).
- Scenario v1 fixture: `sess_A` source IP + user agent change mid-session; benign sessions (Eli, Priya) stable; benign:suspicious about 6:1 with at least one benign 4xx.
- Treat `summary` and `risk_label` as optional debrief-only annotations; mark red-agent internal events `learner_visible: false`.

## Next increment
- Keep the verified target/control, reset, scoring and replay boundaries. Current Docker58/58 and native359+18 pass; model-container/deployed proof and optional Windows remain separate.
- Current scope and evidence: `docs/product/BEGINNER_LEARNING_HANDOFF.md`; preserve prior failed gates.

## Verification commands, interaction checks and required independent review
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- `python3 -m unittest discover -s tests/target -v`
- `python3 -m unittest discover -s tests/control -v`
- Independent evaluation via `harness-evaluate` (`context/evaluations/saad-range-control.eval.md`).

## Evidence locations
- `Saad.md`
- `04_OWNER_A_CYBER_RANGE.md`
- `06_OWNER_C_CONTROL_SCORING.md`
- `context/SAAD_CONTEXT.md`


## Authorized live product implementation amendment
Ahnaf authorized the full phased roadmap in docs/product/IMPLEMENTATION_ROADMAP.md. This amendment supersedes conflicting earlier UI-only/P0 scope limits for the new versioned live product. Keep existing v1 fixtures and canonical enums compatible. The unified SOC console is the live shell; mission evidence/response/verification/debrief are reused inside it. The target and server own all results. Composite business verification includes Eli and a fresh legitimate Maya workflow, so disabling Maya produces real disruption and restoration never resurrects compromised access. All terminal states permit debrief. Optional network telemetry, clock and exact decision/action/audit links are accepted. Practice may expose the Adversary Lens; assessment data is redacted server-side. Build and evaluate bounded vertical increments; mark unverified external services honestly.

## Instructor workflow increment
Implement persisted cohorts and version-pinned assignments. Assignment mode/assistance and membership are enforced server-side. Named handoffs optionally grant a registered receiving analyst access; notes alone never grant access. Instructor injects are bounded communications only and are recorded in the run. Identity logout returns a fresh local profile.

## Evidence-limited assistant increment
Practice-only assistant receives at most twelve selected released target events, never hidden scenario truth, agent rationale, or response authority. Generated claims must cite supplied event IDs and remain labeled unverified until the learner reviews them. Assessment rejects requests server-side. Assistant output cannot execute responses or change scores; inference failures are explicit.


## 2026-10-23: Windows analyst VM
Replace the desktop profile's Ubuntu/XFCE container with genuine Windows running under QEMU/KVM. Require an operator-prepared standalone qcow2 base at WINDOWS_BASE_IMAGE; never silently substitute Linux or download an OS at learner launch. Mount base and released evidence read-only; use a disposable per-launch overlay; keep QEMU/guacd internal and only publish the authenticated Guacamole gateway on loopback. Add memory, image and KVM preflight checks. Existing profile names, authorizations, lease and generation-scoped cleanup stay compatible. Actual Windows boot is blocked until the prepared Windows image is available.


## Approved consolidation — 2026-10-23 (supersedes conflicting earlier fixture/workbench decisions)

Implement one AI-powered SOC using the accepted original console layouts. Root has exactly The Stolen Session (stolen-session/v1) and The Reporting Blind Spot (northstar-breach/v2), compact coached-practice/assessment launch settings, and explicit resume under the one-active-company rule. Original Monitoring becomes Live Monitoring; original Logs and Cases use the same run-scoped snapshot/SSE provider. Preserve original icons, channels, tables, modals, playbook, notes, artifacts, tool arrangements, and training navigation; old run URLs remain valid, old practice links resolve into selected run or landing. No public scripted simulator, sample evidence, invented telemetry, browser grades, or answer keys.

Backend adds authenticated alert ownership/closure comments, idempotent one-case-per-run creation, revision-checked case/playbook/artifact updates with released-evidence validation and old notes/handoffs retained. Declaration, defense, recovery and scoring stay authoritative. Alert closure never ends the attacker. Scenario playbooks gate completion on server records; final feedback/replay is terminal only. Windows/Elastic live in Sandbox; Windows installation and new attack families remain out of scope.

Require actual model readiness on create/start. Invalid/timeout model output records a failed decision and system-pauses clock without fallback execution or step consumption. Authenticated AI retry retries the pending turn; defender-induced stale proposals are discarded without outage. Assessment disallows manual pauses, permits only system AI pauses. Preserve canonical enums, policy/schema checks, target audit correlation, response idempotency and authorization.

Acceptance: both scenario workflows, real model-to-target correlated actions and containment/legitimate continuity; case retries/revisions/old data; refresh, tabs, SSE reconnect, isolation and drafts; AI launch/outage/retry/assessment; 320/390/768/1440 keyboard/accessibility; native tests/build/Harness run/evaluate and handoff.


## Authorized beginner learning loop — 2026-10-23

Implement the attached beginner SOC plan in M0–M4: harden terminal immutability, persisted report identity, response/verification/playbook invalidation and draft isolation; add public company briefings, paused coached starts, three authored micro-exercises, revision-checked autosaved six-part worksheets, evidence-grounded Explain/Nudge/Guide coaching with exact citations and disputes, three meaningful target configurations per scenario, trace-linked causal debrief/export and another-variation launch. Keep the two scenario cards, original console layouts, canonical enums, real local attacker, server scoring and assessment restrictions. No new runtime orchestration framework. Assistance never deducts practice points. Variant manifests pin configuration, seed and hashes; exact replay consumes the recorded trace. Older records load with optional fields absent.

Acceptance: native tests/build/browser checks/Harness; 60 adversarial coaching cases; 12 genuine model journeys (2 scenarios × 3 variants × 2 repeats), audit correlations and paired interventions; coaching p95 ≤15s measured on declared hardware. Record failed/unavailable gates honestly. M4 prepares a counterbalanced eight-beginner/two-expert pilot and 0–2 six-skill rubric; no participant findings or educational-efficacy claims without observed sessions. Product records: docs/product/BEGINNER_LEARNING_RESEARCH.md, BEGINNER_LEARNING_PLAN.md, OPEN_SOURCE_ADOPTION.md.


## Authorized local Windows preparation — 25 October 2026

User explicitly requested “set it up for me” after the host/image prerequisite question. Prepare an actual Windows Server Desktop Experience evaluation base on this laptop using official Microsoft media, private local setup credentials, BIOS/IDE standalone qcow2, KVM and no guest network adapter. Keep the image/ISO/answer file/password outside Git. Refuse overwrite of an existing base and reserve disk/memory headroom; do not close unrelated apps or modify other VMs. Verify actual desktop boot and existing authenticated Guacamole display before claiming success. Preserve evaluation activation/expiry requirements; no licensing bypass or automatic paid/cloud provisioning. This is the existing networkless workstation profile only; full B dedicated-host isolation/load, observer VM recording and C timed capabilities stay unqualified/disabled. Record exact source/media/hash/setup state and continuation command at milestones.


## 2026-10-25 authorized lean shell and local demo access
The current user requests reduced navigation, immersive Windows, briefing before launch, separate instructor mode and password-free local testing. Apply `context/contracts/lean-shell-2026-10-25.contract.md`; it supersedes conflicting all-links-visible/repeated-briefing requirements. Preserve scoring, normal deployed authentication, live audience privacy and prior failed/unverified gates.


## 2026-10-27 unavailable-lead handoff
User states Ahnaf implemented the current baseline and will be unavailable. Current remaining-work ownership is specified in `Tanvir.md` and `Saad.md`: Tanvir leads AI/adaptation/coaching/model evidence and learning-quality readiness; Saad leads infrastructure/authority/integration and all remaining VMobserver/timedfrontend/accessibility/operations work, coordinating directly with Tanvir without an Ahnaf dependency. Do not edit `Ahnaf.md`. This documentation handoff changes neither executable permissions nor canonical schemas and preserves all failed/unverified gates, deferred pilot, and explicit purchase/deployment/contact boundaries.
