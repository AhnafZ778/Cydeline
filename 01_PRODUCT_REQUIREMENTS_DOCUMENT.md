# SENTINEL LOOP — PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Subtitle:** Human-vs-AI Adversarial Cyber-Defense Training Range  
**PRD version:** 1.0 — implementation baseline  
**Prepared:** 22 October 2026  
**Product stage:** Competition MVP / technical proof of concept  
**Target milestone:** P0 vertical slice by 25 October; release candidate by 29 October; preliminary submission planned for 31 October 2026, subject to official confirmation  
**Team:** Four engineering owners (A: Range, B: AI, C: Control, D: UX)  
**Decision status:** Proposed and scoped; no claim that the product, benchmarks, customer research or learning efficacy have been validated.

---

## 1. Executive summary

**Sentinel Loop** is a browser-based cybersecurity training platform where a human junior defender faces a **bounded, locally hosted AI adversary** inside a fictional company's isolated training environment. Unlike a fixed log-replay exercise, the local model selects its next permitted action using an observation of the current range state. Those actions are executed as real requests against a deliberately configured training target. The target enforces actual session and document access rules and emits genuine application audit events. The defender investigates live telemetry, links evidence to a declaration, applies containment, verifies that malicious access is blocked, and proves that legitimate business tasks still work.

The MVP is deliberately narrow: **one scenario, one target application, one shared quantized model, three sequential logical agent roles, one human learner, one verified end-to-end defensive loop.** The ambition is to prove the quality of interaction, not the number of models, simulated employees or vulnerabilities.

**Product promise:** *Defend a live fictional company against a local AI adversary—and prove that you stopped the threat without breaking the business.*

**What is genuinely live:** AI-selected actions cause actual target requests, which produce observed access decisions and logs. Defensive controls modify the target's authorization state. The next attacker decision receives the updated, sanitized observation.

**What is constrained or simulated:** Company, users, credentials and documents are fictional; the adversary starts with a pre-seeded compromised session; the model is not an unrestricted penetration-testing agent; time pressure is controlled by a scenario clock; replay uses recorded events rather than rerunning stochastic inference.

### 1.1 Core differentiator

Existing cyber ranges, SOC labs and agentic security projects already provide portions of the underlying functionality. The proposed product differentiation is **human-centered, adaptive, measurable defense**: the learner must stop a changing threat, cite the evidence, and maintain legitimate operations. This is a product hypothesis, not a verified unique invention or market advantage.

### 1.2 Primary success criterion

A first-time trainee can complete **start → monitor → investigate → declare with evidence → contain → verify → debrief → replay → reset** without developer intervention, while the platform can show a complete chain from **model proposal → validated action → actual target response → telemetry → defender action → changed access result → evidence-linked score**.

---

## 2. Problem, opportunity and user jobs

### 2.1 Problem statement

Aspiring SOC analysts often encounter guided, scripted exercises where the attack progression is predetermined. These can teach tools and detection patterns, but may not expose learners to an opponent who reacts to their choices. More advanced cyber ranges can require significant infrastructure and instructor preparation. Sentinel Loop seeks to provide a compact, repeatable practice environment focused on the **decision loop**: recognize, investigate, contain, verify and recover.

**Unvalidated assumptions:** Trainees find existing practice insufficiently adaptive; instructors will value this format; a small local model can provide meaningful adaptation; the product can run affordably on student hardware. These must be tested, not asserted as established facts.

### 2.2 Target personas

| Persona | Primary job | Pain / constraint | P0 value |
|---|---|---|---|
| Junior SOC learner (primary user) | Practice incident-response judgment | Limited exposure to live adversarial pressure | A complete guided or timed defensive exercise with debrief |
| Cybersecurity instructor (secondary user) | Run a consistent exercise and explain outcomes | Preparation time and inconsistent evaluation | Reliable reset, reviewed scenario, interpretable scoring |
| Competition judge (evaluation audience, not customer) | Assess technical merit and authenticity | Many visually polished but shallow demos | Inspectable model→target→telemetry→defense proof |
| Training organization (future buyer hypothesis) | Evaluate cohort readiness | Cost, deployment, evidence of learning efficacy | Not addressed commercially in P0 |

### 2.3 Jobs to be done

- **Learner:** “When a suspicious session appears, help me interpret real evidence and decide which containment action stops the attacker with minimal disruption.”
- **Instructor:** “When I run an exercise, give each trainee a reproducible initial state and a debrief I can inspect without manually reconstructing every action.”
- **Platform operator:** “When an AI model or sandbox fails, preserve isolation, stop the run cleanly, and make the failure distinguishable from learner performance.”

---

## 3. Goals, non-goals and measurable outcomes

### 3.1 MVP goals (P0)

| ID | Goal | Measurable proof |
|---|---|---|
| G-01 | Model makes at least one genuine state-aware decision | Structured proposal stored with model ID, sanitized observation hash and validation result |
| G-02 | A model-selected action reaches a real isolated target | Correlated target request, response and audit record |
| G-03 | Human defender investigates with evidence | Incident declaration references existing visible event IDs |
| G-04 | Containment changes actual authorization | Compromised session allowed before revocation and denied after |
| G-05 | Business continuity matters | Eli's legitimate task measured and retained after precise containment |
| G-06 | Outcomes and scores are explainable | 100-point server rubric with source event/action/check IDs |
| G-07 | Runs are safe and repeatable | Clean reset, isolation checks, read-only replay and no hidden-truth leakage |
| G-08 | Demo runs on known local hardware | Measured model decision latency, memory footprint and fallback rate |

### 3.2 Non-goals for October MVP

- Unrestricted offensive hacking, real-world target selection, arbitrary shell commands, network scanning or exploit payload generation.
- Multiple independent models attacking in parallel; full multi-agent swarm orchestration.
- Production SIEM/EDR integration, arbitrary GitHub repo import, arbitrary Docker image execution, or public Internet-facing cyber range.
- Enterprise multi-tenancy, billing, instructor scenario authoring, certifications, leaderboards or hiring decisions.
- Claiming that the model matches an experienced human hacker or that the platform has proven educational efficacy.
- Proving competition superiority; only a technically credible and well-documented submission can be claimed.

### 3.3 Success metrics and decision gates

**Engineering acceptance targets — planned, not measured:**
- 30 local-model structured-response trials: proposed gate **at least 28 valid schemas**; track policy-valid actions separately.
- 10 paired before/after-containment observations: proposed gate **at least 8 meaningful adaptations or appropriate stops**.
- **Zero accepted out-of-policy actions** in the validator test suite.
- **Ten consecutive clean resets** without leaked compromised sessions or cross-run state.
- At least **one fully traced live end-to-end demo**; aim for repeated clean runs during rehearsal.
- Model first-decision latency target **10 seconds or less on actual demo hardware**, otherwise disclose the limitation and adjust scenario pacing. Report median and p95 separately.
- All claimed protected reads and denials have matching target HTTP outcome and audit correlation.

These thresholds are pragmatic proposed release gates, **not** benchmarks already achieved or evidence of market validation. Revisit only through a documented decision.

---

## 4. Scenario design: “The Stolen Session”

### 4.1 Fictional organization and assets

- Organization: **Northstar Analytics** (`northstar.test`, reserved fictional identity for training).
- `maya@northstar.test`: employee whose existing fictional session has been compromised.
- `eli@northstar.test`: unaffected employee who must continue an authorized document workflow.
- `sess_A`: opaque run-scoped handle representing a pre-seeded compromised session.
- `doc_finance_07`: fictional protected internal document; its contents are synthetic and non-sensitive.
- Benign background activity: normal sign-ins, document listings, routine access and an unrelated failed sign-in.

### 4.2 Attacker and defender objectives

**Attacker objective:** Read `doc_finance_07` with the pre-seeded compromised session before effective containment, confirmed by the target's authorization result and corresponding audit event.

**Defender objective:** Correctly identify the compromised session from visible evidence, cite relevant events, stop further unauthorized access, and verify the unaffected user's legitimate task still succeeds. A high-quality defender should choose proportionate containment, not simply disable everything.

### 4.3 Scenario phases

| Phase | Target/model behavior | Learner behavior | Exit condition |
|---|---|---|---|
| P1: Baseline | Target starts clean; benign workflows produce events | Monitor | Reviewed start conditions verified |
| P2: Suspicion | Model performs permitted discovery/status action; target logs requests | Filter, inspect | Suspicious evidence visible |
| P3: Investigation | Model may choose a document-related action within budget | Select evidence, declare | Declaration accepted or time progresses |
| P4: Containment | Target applies requested session/account control | Revoke or restrict | Measured access-state change |
| P5: Adaptation | Model receives updated attacker-visible observation and selects allowed next action or stop | Watch follow-up event | Follow-up target response observed |
| P6: Verification | Control plane triggers real suspicious-denial and benign-workflow checks | Request verification | Both checks pass, fail or remain unresolved |
| P7: Debrief | Immutable trace and rubric computed | Review mistakes and replay | Terminal outcome recorded |

**Pacing rule:** The first protected read must not happen instantaneously before a reasonable opportunity to observe signals and respond. Use a reviewed scenario schedule with a bounded observation window; disclose that pacing is simulated. The model can choose among allowed actions within that window, but cannot bypass server scheduling or budgets.

### 4.4 Branches and consequences

| Learner action | Expected target consequence | Teaching point |
|---|---|---|
| Revoke `sess_A` | Subsequent requests through that session denied; Eli still works | Precise containment |
| Temporarily disable Maya's account | Attacker blocked; Maya's legitimate workflow may also be blocked | Effective but disruptive containment |
| Require Maya reauthentication | Existing session invalidated according to scenario policy | Identity-control trade-off |
| Restore Maya after safe containment | Legitimate workflow resumes without re-enabling compromised handle | Controlled recovery |
| Take unrelated device action (future negative case) | No magical revocation of remote stolen session | Avoid irrelevant actions |
| Do nothing until objective reached | Target records successful protected read | Consequence of delay |

**Important:** The model may react to revocation by inspecting session status, trying a *different predefined allowed* route, or stopping. It must not invent new exploit surfaces or uncontrolled bypasses. “Adaptive” means state-dependent permitted decisions, not unlimited hacking capability.

### 4.5 Terminal states

Canonical `Outcome` values:
- `defended_and_recovered`: suspicious session denied, required legitimate workflow passes, attacker objective not previously reached.
- `contained_but_disrupted`: suspicious access denied but legitimate service remains unavailable.
- `attacker_objective_reached`: protected read verified at any point; later containment is recorded as recovery, not retroactive prevention.
- `timed_out_unresolved`: deadline expires without sufficient verified resolution, including missing verification.
- `aborted`: authorized cancellation.
- `technical_failure`: infrastructure/model/target failure invalidates learner evaluation.

Do not introduce an unverified “win” state in the UI. The UI may show a **verification incomplete** status while `RunState=verification_pending`, but the final outcome must use the canonical enum.

---

## 5. Functional requirements by epic

Priority labels: **P0** = required for 25 October vertical slice; **P1** = optional before 29 October if P0 stable; **P2** = post-submission roadmap.

### EPIC A — Cyber range, target and telemetry (Owner A)

**FR-A01 [P0] Isolated target provisioning.** Given a reviewed scenario version and seed, create a fresh disposable target instance with seeded users, sessions and documents. The instance must have a unique run-scoped identity. **Accept:** fixture hash recorded; no previous-run state is visible.

**FR-A02 [P0] Actual access enforcement.** Protected document routes enforce session and account state in the target API, not in React. **Accept:** request with active `sess_A` receives the scenario-defined result; after revocation, the same handle is denied and produces a new audit record.

**FR-A03 [P0] Target-local audit.** Record request ID, target audit ID, event time, actor/session/resource, outcome and run correlation. Do not log raw session secrets or document contents. **Accept:** each attacker action has a correlated result and audit entry.

**FR-A04 [P0] Defender control adapter.** Implement `revoke_session`, `temporarily_disable_account`, `require_reauthentication`, `restore_account` as target-state operations. **Accept:** duplicate idempotent requests do not produce contradictory state or multiple penalties.

**FR-A05 [P0] Benign workflow probe.** Expose a trusted adapter method to test Eli's authorized access. **Accept:** the probe returns a measured target result and audit ID; broad disruption is visible.

**FR-A06 [P0] Deterministic teardown/reset.** Destroy and recreate or restore target state with clean sessions, documents, audit cursor and scenario version. **Accept:** 10 consecutive reset tests pass with no stale compromised access.

**FR-A07 [P1] Second consequence branch.** Add a meaningful alternate branch such as account disable/recovery; avoid new vulnerabilities before the first branch is stable.

### EPIC B — Local AI adversary (Owner B)

**FR-B01 [P0] Configurable local model runtime.** Use Ollama with a Qwen3-1.7B Q4 candidate and record actual model digest/quantization/hardware. Support a configurable alternative after benchmark. **Accept:** model health, cold/warm latency and decision metadata recorded.

**FR-B02 [P0] Three sequential logical roles.** Implement `scout`, `access_operator`, `adaptation_planner` as role-specific prompts sharing one model instance. **Accept:** trace identifies which role produced each decision; UI never falsely claims independent parallel models.

**FR-B03 [P0] Structured proposals.** Produce JSON matching the canonical proposal schema. **Accept:** malformed output is rejected and logged, never interpreted as a command.

**FR-B04 [P0] Policy enforcement.** Allow only the six enumerated actions and server-mapped opaque targets/handles; validate run state and budgets. **Accept:** arbitrary URLs, commands, paths, secrets and out-of-scope targets are rejected.

**FR-B05 [P0] Closed-loop observation.** Build sanitized attacker-visible state from target outcomes and limited prior decisions; never include hidden answer keys or future events. **Accept:** after session revocation, model receives changed session status and can select a different permitted action or stop.

**FR-B06 [P0] Timeouts and transparent fallback.** A model timeout or invalid output cannot hang the run. **Accept:** fallback/stop behavior is labeled in event trace and debrief; technical failure is distinguished from learner failure.

**FR-B07 [P1] Benchmark and difficulty tuning.** Run paired observations and record action validity, latency and adaptation; do not claim equivalence to expert attackers.

### EPIC C — Control plane, evidence and evaluation (Owner C)

**FR-C01 [P0] Run lifecycle.** Create/start/pause where allowed/contain/verify/complete/timeout/abort runs with validated state transitions. **Accept:** illegal transitions return stable error codes.

**FR-C02 [P0] Event store.** Ingest target audit events and defender actions, assign monotonic per-run sequences and visibility times, preserve correlation. **Accept:** events are immutable once accepted; pagination is stable.

**FR-C03 [P0] Live streaming.** SSE emits learner-visible events with reconnect and backfill. **Accept:** disconnect/reconnect does not lose or duplicate displayed event IDs.

**FR-C04 [P0] Incident declaration.** Learner submits suspected actor/session and selected event IDs. **Accept:** server rejects evidence IDs not visible in that run and stores the declaration immutably.

**FR-C05 [P0] Authorized defender commands.** Apply target actions with idempotency key and run-scoped authorization. **Accept:** command result references actual target audit evidence.

**FR-C06 [P0] Measured recovery.** Trigger both `verify_suspicious_session_denied` and `verify_benign_workflow`. **Accept:** results come from fresh target checks, not cached labels or model assertions.

**FR-C07 [P0] Deterministic rubric.** Calculate a 100-point score from event/action/check records and scenario rules. **Accept:** identical immutable trace yields identical score and evidence references.

**FR-C08 [P0] Read-only replay.** Serve recorded event/action timeline without invoking model or target. **Accept:** replay leaves target state and event count unchanged.

**FR-C09 [P0] Technical-failure semantics.** Target/model outage, failed reset or integrity check produces `technical_failure` or safe pause rather than a false learner loss. **Accept:** debrief identifies infrastructure failure separately.

**FR-C10 [P1] Assessment mode.** No hints; controlled timer; inference delays excluded from learner reaction time.

### EPIC D — Human defender experience (Owner D)

**FR-D01 [P0] Session setup.** Show scenario description, practice/assessment status, simulation warning and start/reset controls. **Accept:** learner understands that target is fictional and live within a sandbox.

**FR-D02 [P0] SOC event feed.** Display new events, source, timestamp, actor, session, resource, outcome and correlation. Support filters by user, session, source, event type, time and outcome. **Accept:** filters preserve chronological ordering and selected evidence IDs.

**FR-D03 [P0] Evidence inspection.** Event detail drawer and investigation timeline with linked related events. **Accept:** learner can identify a suspicious session from actual emitted records without access to hidden truth.

**FR-D04 [P0] Declaration workflow.** Select event IDs, name suspected session, submit with confirmation and error handling. **Accept:** submitted evidence appears in debrief and is auditable.

**FR-D05 [P0] Containment workflow.** Clearly differentiate session revoke, account disable and reauthentication; show operational consequence warnings. **Accept:** displayed success comes from confirmed server response; pending/failure states are visible.

**FR-D06 [P0] Verification view.** Show suspicious-denial and benign-service checks separately. **Accept:** learner cannot complete a successful recovery without both checks passing.

**FR-D07 [P0] Debrief and replay.** Show final outcome, score dimensions, decision timeline, evidence links, unnecessary disruption and model/fallback provenance. **Accept:** every rubric explanation links to a real event/action/check.

**FR-D08 [P0] Accessibility and resilience.** Keyboard-accessible actions, clear focus, semantic labels, no color-only statuses, loading/reconnect/empty/error states, responsive layout. **Accept:** core flow passes basic keyboard and browser smoke tests.

**FR-D09 [P1] Practice-only AI coach.** Hints may summarize **already visible** evidence; no hidden truth, no answer key. **Accept:** hints are disabled in assessment mode and cannot alter scores.

**FR-D10 [P1] Timeline polish.** More readable animations and instructional explanations only after the full loop passes.

---

## 6. End-to-end user experience and screen inventory

Seven states can be one responsive application, not seven disconnected pages:

1. **Lobby / briefing:** scenario, fictional company, objective, practice mode, model status, simulation notice and start.
2. **Operations dashboard:** current alert summary, live stream, normal background activity, filter chips and service-health indicator.
3. **Investigation workspace:** expanded event details, correlated timeline, affected account/session panel and evidence basket.
4. **Incident declaration:** suspected actor/session, chosen event IDs, short rationale and submission confirmation.
5. **Containment console:** explicit action descriptions, blast-radius warning, request progress and observed result.
6. **Recovery verification:** two independent check results, residual uncertainty, option to restore legitimate account where applicable.
7. **Debrief / replay:** outcome, 100-point breakdown, timestamped actions, causal explanation, fallback disclosure and restart.

**UX principles:** show facts before interpretation; keep attacker activity and benign activity distinguishable only through evidence; avoid a “hack succeeded” animation unless confirmed; never hide infrastructure failures; make service disruption visible as a first-class outcome.

---

## 7. System architecture and source-of-truth hierarchy

```text
                  Learner Browser (React / TypeScript)
              events | evidence | contain | verify | replay
                                   |
                        Authenticated API + SSE
                                   |
                                   v
                 TRUSTED CONTROL PLANE (FastAPI)
      run lifecycle | SQLite audit | scenario clock | score | replay
                  /                    |                  \
                 v                     v                   ^
       Local AI Decision         Target Adapter        Target Audit
       Service (Ollama)          (allowlisted)        (correlated)
         untrusted text                |                    |
                 \_____________________|____________________/
                                      v
                  ISOLATED FICTIONAL TARGET (FastAPI)
                 sessions | accounts | documents | access logs
```

**Truth precedence:**
1. Target's actual access enforcement and correlated response establish whether resource access succeeded.
2. The AI service owns only the proposed decision and validation metadata.
3. The trusted control plane owns canonical run events, outcome, score, hidden scenario configuration and replay.
4. The frontend renders learner-visible facts and submits user commands but cannot decide truth.

**Isolation design:** Run the target in a disposable, restricted environment, preferably within a dedicated VM. No outbound Internet from range; no Docker socket or host filesystem mounts; drop capabilities, use resource/time limits and seccomp where supported; use rootless containers when feasible. The trusted control plane and Ollama endpoint are not exposed to the target's network. Validate these assumptions on the actual host. Do not publish the intentionally vulnerable target directly on the Internet.

**Concurrency:** P0 supports one active local exercise. Serialize each run's model/action/defender-state transition. Do not dispatch an attacker request against stale state after a containment operation has committed. Multi-run concurrency is P2.

---

## 8. API and integration contracts

### 8.1 Canonical enums

```text
RunState = created | running | contained | verification_pending | completed | timed_out | aborted | technical_failure
Outcome = defended_and_recovered | contained_but_disrupted | attacker_objective_reached | timed_out_unresolved | aborted | technical_failure
Mode = practice | assessment
AttackerAction = inspect_session_status | list_accessible_documents | request_document | test_existing_session | wait | stop
DefenderAction = revoke_session | temporarily_disable_account | require_reauthentication | restore_account
Verification = verify_suspicious_session_denied | verify_benign_workflow
```

### 8.2 Event envelope

```json
{
  "event_id": "evt_0042",
  "run_id": "run_0001",
  "sequence": 42,
  "timestamp_utc": "2026-10-22T07:00:00Z",
  "visible_at_utc": "2026-10-22T07:00:02Z",
  "source": "target-access",
  "event_type": "document.access",
  "actor_id": "maya",
  "session_handle": "sess_A",
  "resource_id": "doc_finance_07",
  "outcome": "denied",
  "correlation_id": "req_0021",
  "learner_visible": true
}
```

The target emits its own audit ID and correlation ID; the control plane assigns canonical `event_id` and `sequence`. Use monotonic sequence for ordering, event time for causal analysis, and visibility time for learner response timing. Event IDs must be unique per run. Never leak raw bearer tokens in events.

### 8.3 AI proposal envelope

```json
{
  "role": "access_operator",
  "action": "request_document",
  "target_id": "doc_finance_07",
  "session_handle": "sess_A",
  "reason": "The resource was listed as available to this session"
}
```

`reason` is non-authoritative and may be inaccurate. The action is not executed unless it passes JSON-schema validation, run-state validation, action/target/handle allowlists and budget checks. The adapter maps the approved enum to a fixed internal function.

### 8.4 Browser endpoints

| Method | Endpoint | Purpose | Required constraints |
|---|---|---|---|
| POST | `/api/runs` | Create reviewed run | Mode and scenario version validated |
| POST | `/api/runs/{id}/start` | Start run | Legal state transition |
| GET | `/api/runs/{id}/events` | Backfill/filter | Run authorization, cursor pagination |
| GET | `/api/runs/{id}/stream` | Live SSE | Event IDs, reconnect cursor |
| POST | `/api/runs/{id}/declare` | Submit incident/evidence | Evidence visible in same run |
| POST | `/api/runs/{id}/defender-actions` | Apply control | Idempotency key, authorization, measured result |
| POST | `/api/runs/{id}/verify` | Check recovery | Fresh target probes |
| GET | `/api/runs/{id}/debrief` | Score/outcome | Completed or clearly provisional state |
| GET | `/api/runs/{id}/replay` | Immutable trace | No side effects |
| POST | `/api/runs/{id}/reset` | Clean reset | Authorized operator; preserve old audit |
| GET | `/api/health` | Health status | Do not leak credentials or hidden truth |

Errors use `{ "code": "...", "message": "...", "correlation_id": "..." }`. Every state-changing request must be authenticated and authorized, including in local demo mode; a fixed dev login is acceptable only if documented as a local-only limitation.

### 8.5 Target adapter interface (trusted, not browser-accessible)

```text
create_fresh_target(run_id, seed, scenario_version) -> target_instance_id, fixture_hash
execute_allowlisted_attacker_action(run_id, action, handles) -> request_id, status, result, target_audit_id
apply_defender_action(run_id, action, target) -> verified_result, target_audit_id
get_target_events(run_id, cursor) -> ordered target audit entries
check_suspicious_session_denied(run_id) -> measured_result, target_audit_id
check_benign_workflow(run_id) -> measured_result, target_audit_id
destroy_target(run_id) -> teardown_proof
```

### 8.6 Persistence and audit tables

Minimum proposed tables:
- `scenario_versions(id, version, config_hash, review_status)`
- `runs(id, scenario_version_id, mode, seed, state, outcome, started_at, ended_at)`
- `events(id, run_id, sequence, type, source, actor, session_handle, resource, outcome, correlation_id, occurred_at, visible_at)`
- `agent_decisions(id, run_id, step, role, model_id, prompt_hash, observation_hash, proposed_json, accepted_action, rejection_reason, latency_ms, fallback_used)`
- `defender_actions(id, run_id, action_type, target_handle, idempotency_key, requested_at, applied_at, result, target_audit_id)`
- `declarations(id, run_id, suspected_actor, suspected_session, rationale, created_at)`
- `evidence_links(id, run_id, declaration_id, event_id)`
- `health_checks(id, run_id, check_type, observed_result, target_audit_id, checked_at)`
- `scores(id, run_id, rubric_version, breakdown_json, terminal_outcome, computed_at)`

Store model prompt **hash** by default rather than sensitive raw prompts; raw prompts can be captured in restricted local test logs only when justified and scrubbed. Avoid storing secrets in SQLite or user-visible audit events.

---

## 9. Local AI design and model evaluation

### 9.1 Model and runtime candidates

**First candidate:** Qwen3-1.7B at 4-bit quantization through Ollama. **Fallback upgrade candidate:** Qwen3-4B Q4 if resources permit. **Extreme-low-resource baseline:** Qwen3-0.6B Q4 for schema/tool-choice experiments, not a guaranteed effective adversary. Use `llama.cpp` only if it materially improves the measured local deployment.

**Do not invent RAM/VRAM claims.** Quantized weight sizes alone do not capture KV cache, runtime and context overhead. Benchmark the exact hardware, model file, quantization, context length and prompt.

### 9.2 Logical role architecture

- **Scout:** chooses whether to inspect a session or list accessible fictional resources.
- **Access Operator:** chooses a permitted request to the isolated target.
- **Adaptation Planner:** after a defender action, observes changed allowed state and chooses a permitted next action or stops.

These are sequential prompts to one local model, not independent models. Each decision has a strict schema, short observation and explicit action budget. Avoid verbose hidden reasoning capture; store short rationale and metadata.

### 9.3 Agent control loop

1. Control plane constructs sanitized attacker-visible observation.
2. B requests structured proposal from local model.
3. B validates schema and action policy; C validates run scope and scheduling.
4. Approved adapter maps enum and opaque handles to a fixed target interaction.
5. Target responds and emits audit; C correlates and stores outcome.
6. Next observation reflects actual changed target state.
7. On invalid output/timeout, record rejection and apply labeled fallback or stop.

**Never** allow model-generated arbitrary URLs, shell commands, external hosts, filesystem paths, exploit payloads or privileged administrative requests.

### 9.4 Fair timing

The learner's clock starts when relevant evidence becomes **visible**. AI inference delay is measured separately. Practice mode may pause; assessment mode may enforce fixed virtual pacing, but hardware slowness must not silently increase learner reaction time. Use a bounded scheduling queue rather than equating model generation speed with attacker skill.

### 9.5 Benchmark protocol

| Test | Procedure | Proposed success region | Failure handling |
|---|---|---|---|
| Schema validity | 30 representative observations | >=28 parse/schema valid | Improve prompt/schema or switch model |
| Policy validity | Attempt invalid action/handle proposals | 0 accepted violations | Release blocker; fix validator |
| State adaptation | 10 paired observations pre/post revocation | >=8 changed useful actions or justified stops | Narrow autonomy claim or change model |
| Latency | At least 10 decisions on demo machine | Target <=10 s first decision; report median/p95 | Adjust pacing, warm model or disclose |
| Evidence coupling | Trace every claimed read/denial | 100% linked to target response and audit | Release blocker |
| Fallback provenance | Force timeout/invalid JSON | Every fallback tagged | Release blocker |

The above are **planned test designs**, not empirical results. Preserve raw counts, denominators, seeds and machine specifications in `docs/model-card/`.

---

## 10. Scoring, outcomes and feedback

### 10.1 Reviewed deterministic rubric (100 points)

| Dimension | Weight | Input evidence | Proposed calculation rule |
|---|---:|---|---|
| Recognition and evidence | 20 | Declaration + linked visible events | Award for correct session/actor and relevance of selected evidence; no credit for nonexistent events |
| Effective containment | 25 | Post-control target denial | Full credit for verified effective, scoped action; no credit for UI-only success |
| Recovery verification | 20 | Two fresh target checks | Require both checks; partial points may show work but not recovered outcome |
| Business continuity | 15 | Benign workflow probes | Credit proportional to required legitimate tasks passing |
| Proportionality | 10 | Defender action sequence | Deduct for unnecessary broad restrictions and avoidable downtime |
| Timeliness | 10 | Evidence visibility → effective containment | Map reviewed scenario clock bands to points; exclude model inference latency |

**Rubric implementation note:** Before code, the instructor/scenario owner must freeze precise point bands in a versioned `rubric.yaml` with unit tests for each branch. This PRD defines dimensions and invariants, not an unreviewed arbitrary formula. Every awarded/deducted point must cite event, action or verification IDs.

### 10.2 Outcome gates take precedence over raw score

- Verified attacker success remains `attacker_objective_reached` even after subsequent containment; report later recovery as a separate fact.
- Attacker denied but benign workflow failed remains `contained_but_disrupted`.
- Both verification checks are mandatory for `defended_and_recovered`.
- Timeout, abort and technical failure are distinct; no false positive success state.
- Hints are logged but not penalized in practice; hints unavailable in assessment.
- Replay reproduces recorded facts, not the model's internal stochastic decision process.

### 10.3 Debrief requirements

Show final outcome; score by dimension; first suspicious event and visibility time; evidence submitted; effective/ineffective controls; attacker actions and real target results; legitimate task status; model name/quantization and fallback usage; remaining uncertainty; recommended next practice. If AI writes an explanation, it may summarize **recorded visible evidence** only and cannot change the score.

---

## 11. Non-functional requirements

| Area | Requirement | Acceptance evidence |
|---|---|---|
| Safety | Range cannot reach Internet, host secrets, Docker socket, control-plane admin, or another run | Documented isolation tests on actual host |
| Authorization | Every run-scoped endpoint verifies user/session and run access | Negative API tests |
| Reliability | Model timeout, invalid JSON, target crash produce bounded failure, not hung UI | Fault-injection tests |
| Replay | Recorded trace is immutable and read-only | Event count/state unchanged after replay |
| Reset | Fresh target with no stale compromised session | 10 sequential reset tests |
| Data integrity | Monotonic event sequence, correlation IDs, idempotent actions | Unit/integration tests |
| Portability | One-command documented local development setup, pinned dependencies | Clean-machine setup rehearsal |
| Performance | Interactive feed and action feedback usable on demo machine | Measured timings, no fabricated SLAs |
| Accessibility | Keyboard workflow, visible focus, semantic labels, no color-only meaning | Browser and manual keyboard smoke tests |
| Privacy | Synthetic users/data only; no real credentials, customer data or leaked documents | Fixture inspection and secret scan |
| Observability | Structured logs, run ID, request ID, model metadata and health checks | Trace of a full run |
| Provenance | Explicit distinction between AI decision, scripted fallback and target-observed result | Debrief + demo review |

---

## 12. Threat model and release blockers

### 12.1 Assets and trust boundaries

**Assets to protect:** host OS, developer credentials, control-plane DB and scoring keys, model runtime, other runs, the Internet, and hidden scenario answer key.

**Untrusted surfaces:** model-generated text, fictional target, logs/document content, learner browser input and scenario-generated HTTP request data.

### 12.2 Priority abuse/failure cases

| ID | Threat / defect | Required mitigation | Release condition |
|---|---|---|---|
| T-01 | Model proposes arbitrary command/URL | Closed action enum, opaque handle mapping, no direct shell/network | Zero accepted out-of-policy actions |
| T-02 | Target escapes or reaches host/external network | Dedicated disposable VM where possible, restricted networking, no privileged mounts, runtime limits | Isolation checks pass |
| T-03 | Prompt injection in target log/document | Treat text as data; schema/policy checks independent of prompt | Malicious text cannot expand action set |
| T-04 | Browser reads hidden truth or scores itself | Server-only answer key and rubric | Negative API/browser tests pass |
| T-05 | Model falsely declares objective success | Require actual target response and audit | Correlation assertion passes |
| T-06 | Replay reruns an attack | Playback from immutable event store only | No new target events during replay |
| T-07 | Race between containment and next attack | Serialize run state transitions and dispatch | Post-revocation requests denied consistently |
| T-08 | Reset retains session or data | Atomic teardown and clean fixture restore | 10 resets pass |
| T-09 | Broad shutdown scores as ideal defense | Continuity and proportionality scoring; outcome gate | Regression test passes |
| T-10 | Model unavailable | Bounded timeout and explicit fallback/technical failure | No hung run or hidden substitution |
| T-11 | Cross-run read/write | Per-run auth and IDs, no shared target state | Negative tests pass |
| T-12 | Competition claim overstates capabilities | Demo provenance, limitations, real trace | Release review signed off |

**Deployment restriction:** Do not expose the intentionally vulnerable target or unrestricted agent tooling to a public network. The demo is an authorized, self-contained training exercise, not a public penetration-testing service.

---

## 13. Four-owner delivery model and interfaces

| Owner | Primary responsibility | Files | Must deliver by P0 |
|---|---|---|---|
| A — Range | Target truth, fixtures, isolation, real telemetry, reset | `apps/target-api/`, `infra/range/` | Real access/denial, benign probe, target audit |
| B — AI | Quantized model, logical roles, bounded decisions, benchmark | `services/red-agent/` | Validated decision + changed-state response |
| C — Control | Contracts, orchestration, run API, persistence, SSE, score, replay | `contracts/`, `scenarios/`, `apps/control-api/` | Traceable end-to-end run and outcome |
| D — UX | Investigation interface, evidence, controls, verification, debrief, E2E | `apps/web/`, `tests/e2e/`, `docs/demo/` | First-time learner completes flow |

**Shared responsibilities:** A owns isolation review, B model provenance, C integration coordinator, D usability/demo. Each owner tests their module and reviews at least one other boundary. With a fifth person, assign independent QA and release operations.

### 13.1 Contract-first dependency map

```text
A target fixtures + adapter stubs ----┐
B agent schema + stub proposals -------+--> C run orchestration + event API --> D live UI
C canonical schemas + mock SSE -------┘              ^                    |
D fixture-driven UI from day 1 ----------------------┴---- joint E2E QA ----┘
```

### 13.2 Merge policy

- Main branch protected; feature branches by owner; small PRs with test evidence.
- Contract changes require C approval and at least one dependent-owner review.
- No new action enum or endpoint without updated schema, mocks, docs and tests.
- No demo-only bypasses that violate the product's claimed causal chain.
- Freeze dependencies, model digest, scenario version and rubric version for release candidate.

---

## 14. Milestones, backlog and release plan

### 14.1 Critical path: 22–31 October 2026

| Date | Gate | A — Range | B — AI | C — Control | D — UX |
|---|---|---|---|---|---|
| 22 Oct | G0 contracts | Fixtures/adapter stubs | Model proposal schema | API/events/rubric freeze | UX wireframe + fixtures |
| 23 Oct | G1 live interaction | Target accepts request, logs | First model action | Correlate action/audit | Feed prototype |
| 24 Oct | G2 real defense | Revocation/benign probe | Observe changed state | SSE and commands | Connected controls |
| 25 Oct | G3 full loop | Reset + target tests | Bounded agent loop | Run lifecycle, verify | Start-to-debrief UX |
| 26 Oct | G4 evidence/replay | Isolation regression | Fallback/benchmarks | Rubric + read-only replay | Debrief UI |
| 27 Oct | G5 usability | Alternate consequence if safe | Model tuning | API resilience | Learner walkthroughs |
| 28 Oct | G6 security QA | Isolation and reset x10 | Invalid JSON/timeout | Cross-run/idempotency | Browser/E2E failures |
| 29 Oct | RC | Pin range | Pin model/digest | Pin schema/rubric | Feature freeze |
| 30 Oct | Demo | Clean range | Trace provenance | Reproducible outcome | Video recording |
| 31 Oct | Submit | Backup env | Backup model mode | Release notes | Submission + receipt |

**Schedule caveat:** The 25 October target is extremely aggressive. If work is not already underway, prioritize the smallest traceable loop over secondary features. Verify official competition challenge, rules and deadlines directly; do not assume this PRD is a substitute for the organizer's current instructions.

### 14.2 P0 cut line

P0 requires: isolated target, pre-seeded compromised session, model-selected bounded action, target audit, event feed, evidence-backed declaration, real containment, suspicious-denial and benign-workflow verification, deterministic score, recorded replay, clean reset and security/provenance disclosure.

**P1 only after P0 passes:** alternate consequence branch, practice hints, assessment mode, model role visualizations, improved onboarding and visual polish.

**P2 after preliminary:** additional reviewed scenarios, instructor dashboard, cohort reporting, independent model instances, stronger sandboxing/VM fleet, scalable scenario authoring, real tool telemetry integrations, evidence-based learning evaluation and commercial pilot.

### 14.3 Suggested initial backlog / dependency order

1. `SL-001` [C, P0] Freeze scenario and event/action enums; generate shared JSON schemas.
2. `SL-002` [A, P0] Build target fixtures and access-control tests.
3. `SL-003` [B, P0] Implement structured model proposal adapter and 30-case benchmark harness.
4. `SL-004` [C, P0] Build run lifecycle, target adapter mocks and canonical event store.
5. `SL-005` [D, P0] Implement event feed and evidence basket from fixtures.
6. `SL-006` [A, P0] Implement revocation, account state and benign probe.
7. `SL-007` [B+C, P0] Connect validated model action to target and correlate telemetry.
8. `SL-008` [C, P0] Implement idempotent defender commands and fresh verification.
9. `SL-009` [D, P0] Connect declaration, containment and verification UI.
10. `SL-010` [C, P0] Implement rubric/outcome gates and immutable replay.
11. `SL-011` [D, P0] Implement debrief/replay and Playwright full-loop test.
12. `SL-012` [A+B+C+D, P0] Isolation, timeout, reset, cross-run and end-to-end release gates.
13. `SL-013` [B, P1] Paired-state adaptation benchmark and alternate branch tuning.
14. `SL-014` [D, P1] Practice hints and assessment UI only if stable.
15. `SL-015` [D+C, release] Record model/target proof, limitations and competition submission.

---

## 15. Test strategy and definition of done

### 15.1 Test layers

- **Unit:** target access policy, action allowlists, state machine, event sequencing, rubric calculations, formatting/filter helpers.
- **Contract:** Pydantic/JSON schema parity, error envelopes, run-scoped IDs, mocked target adapter and browser API.
- **Integration:** model proposal → adapter → target → correlated event; defender command → target state → next attack result.
- **E2E browser:** start, filter, inspect, select evidence, declare, revoke, verify, debrief, replay and reset.
- **Failure injection:** malformed model output, timeout, target restart, SSE reconnect, duplicate command, missing audit, stale run and invalid evidence.
- **Security:** network isolation, no host/Docker socket mounts, no external target access, prompt-injection rejection, hidden-truth and cross-run negative tests.
- **Usability:** first-time learner observes a full scenario with minimal assistance; document confusion and recovery.

### 15.2 Mandatory acceptance scenarios

**AT-01 — Containment changes real state.** Given a valid compromised session and a protected document, when the defender revokes `sess_A`, then a subsequent target request using that handle is denied, and the corresponding event is visible and correlated.

**AT-02 — Legitimate service preserved.** Given Eli's unaffected authorized session, when Maya's compromised session is revoked, then Eli's document workflow continues successfully.

**AT-03 — Overbroad containment penalized.** Given a broad account disablement that stops the attacker but breaks legitimate workflow, the terminal outcome is `contained_but_disrupted` until restored and verified, with proportionate scoring consequences.

**AT-04 — Attacker success cannot be faked.** Given a model message claiming success but no verified target read, the control plane must not mark `attacker_objective_reached`.

**AT-05 — Fallback disclosure.** Given model timeout, the run either continues via explicitly tagged deterministic fallback or records technical failure; the debrief must not present fallback as autonomous AI.

**AT-06 — Evidence cannot be forged.** Given a browser declaration referencing another run's event ID or hidden event, the server rejects it.

**AT-07 — Replay is read-only.** Given a completed run, replay must not alter the target, emit new target audit records, or invoke the model.

**AT-08 — Reset cleans the range.** Given any completed/aborted run, a reset yields a new clean target state and invalidates stale compromised handles.

**AT-09 — Defender timing is fair.** Given variable model inference delays, the learner reaction metric uses event visibility and virtual scenario time, not raw inference wall time.

**AT-10 — Isolation holds.** Given an adversary proposal or target content that attempts to reach forbidden resources, the action validator and network boundaries prevent out-of-scope access.

### 15.3 Definition of done for the MVP

The project is **not** done when the dashboard looks finished. It is done when the complete loop runs from clean setup; the model's role is accurately described; all target outcomes are independently corroborated; real containment affects subsequent requests; both recovery checks are measured; scores and replay derive from immutable trace; reset is reliable; isolation checks pass; and the team can reproduce the demo on the intended machine with documented limitations.

---

## 16. Product risks, assumptions and falsifiable experiments

The following are **hypotheses or unknowns**, not established findings.

| ID | Critical assumption | Cheapest discriminating test | Failure/stop condition | Owner |
|---|---|---|---|---|
| H1 | Q4 local model can choose useful legal actions | 30 schema trials + 10 paired states | Too many invalid or repetitive choices; narrow autonomy claim | B |
| H2 | Live target coupling is stable | 10 repeated action/response/audit chains | Missing correlation or fabricated success | A+C |
| H3 | Defender controls matter causally | Before/after access and benign probe | UI-only effects or broad shutdown equals success | A+C |
| H4 | The system is safe on demo hardware | Isolation and resource-cap test in dedicated environment | Any uncontrolled egress/host access | A |
| H5 | Learner can finish without developer help | 3–5 convenience-sample walkthroughs if available | Repeated task failure/confusion | D |
| H6 | Adaptive training improves learning | Later matched scripted-vs-adaptive pilot with blind rubric | No measured improvement; revise proposition | Product team |
| H7 | Instructors value the product enough to adopt | Later interviews plus observed pilot scheduling/commitment | No adoption behavior despite positive comments | Product team |
| H8 | Competition track fit is strong | Official challenge wording and rubric check | No matching challenge; revise submission positioning | Product lead |

**Interpretation:** A few convenience-sample walkthroughs can identify UX defects but cannot establish educational efficacy or market demand. A successful model benchmark on one laptop cannot establish general reliability. Existing competing products invalidate claims of category-level originality, not necessarily the product's usefulness.

### 16.1 Evidence classification policy

For every decision-critical statement in documentation, mark it as **fact**, **inference**, **hypothesis** or **unknown**. For externally sourced facts, record source URL, date, claim supported, and limitations. Do not invent user interviews, competitor statistics, benchmark outcomes or competition rules.

---

## 17. Reuse strategy and open-source provenance

| Component | Candidate repository | P0 stance | Why |
|---|---|---|---|
| Local inference | https://github.com/ollama/ollama | Integrate | Local runtime and structured JSON outputs |
| Small model | https://github.com/QwenLM/Qwen3 | Benchmark candidate | Small model sizes; local quantized ecosystem |
| Alternate inference | https://github.com/ggml-org/llama.cpp | Optional alternative | Efficient quantized inference |
| Autonomous agent architecture | https://github.com/usestrix/strix | Study only | Agent roles, evidence and orchestration concepts; too broad for P0 |
| Adversarial agent architecture | https://github.com/dreadnode/ares | Study only | Red/blue agent separation and controlled evaluation |
| State/action research | https://github.com/microsoft/CyberBattleSim | Study concepts | Observation, action and reward/state design |
| Intentionally vulnerable training app | https://github.com/erev0s/VAmPI | Reference / optional | API-security training patterns; custom minimal target remains simpler |
| Larger vulnerable API | https://github.com/OWASP/crAPI | P2 | Useful future training environment, heavy for P0 |
| Detection rules | https://github.com/SigmaHQ/sigma | P2 | Later detection engineering and rule formats |
| Authorized reverse engineering | https://github.com/morluto/rea | Research only | Study authorized flows; not a runtime dependency |

**Reuse rule:** Before copying code or models, inspect the actual license, dependencies, model terms, maintenance state and security implications. Cite the source in `docs/provenance/THIRD_PARTY.md`. Architecture inspiration is not code reuse. No arbitrary third-party vulnerable service should be deployed on the public Internet.

---

## 18. Competition narrative and demonstration

**Positioning hypothesis:** The best fit is an AI + cybersecurity/education challenge if the official Idea to Unicorn catalogue offers it. The exact challenge ID and rubric remain **unverified in this PRD** and must be confirmed before submission. Do not fabricate a track name.

**Proposed three-minute narrative** (timings are internal storyboard targets; confirm official video instructions):

| Time | Show | Proof |
|---|---|---|
| 0:00–0:30 | Problem and learner | Why fixed incident drills do not cover adaptive response well enough (as a hypothesis) |
| 0:30–1:00 | Product and architecture | Human defender, isolated target, one local model with logical roles |
| 1:00–2:00 | Uncut live sequence | Model action → target audit → defender revoke → denied follow-up → benign workflow succeeds |
| 2:00–2:30 | AI and evaluation | Model ID/quantization, action validator, provenance, deterministic score |
| 2:30–3:00 | Outcome and roadmap | Evidence-linked debrief, limitations, next pilot and adoption hypothesis |

**Required truthfulness:** Display or disclose if a model decision was replaced by deterministic fallback; distinguish recorded replay from live execution; avoid presenting a pre-recorded trace as live if it is not. Show actual measured latency and test counts only after running tests. Do not claim an experienced hacker-equivalent model or proven educational outcomes.

---

## 19. Operational setup and developer experience

### 19.1 Proposed repository

```text
sentinel-loop/
  README.md
  .env.example
  contracts/
  scenarios/stolen-session/v1/
  apps/target-api/
  infra/range/
  services/red-agent/
  apps/control-api/
  apps/web/
  tests/target/
  tests/agent/
  tests/control/
  tests/e2e/
  tests/isolation/
  docs/product/
  docs/architecture/
  docs/threat-model/
  docs/model-card/
  docs/provenance/
  docs/demo/
  scripts/
  compose.yaml
```

### 19.2 First-run developer requirements

- A documented, pinned development environment with Python, Node, container/VM prerequisites and Ollama installed as appropriate.
- `.env.example` with safe defaults; no committed secrets.
- Separate local control API and isolated target API; model service accessible to trusted control plane only.
- One command or short documented sequence to start services; one command to run tests; one command to reset the range.
- Health checks distinguish control plane, target and model availability.
- Test fixtures and mock APIs allow each owner to work independently before integration.
- An offline/recorded demonstration mode is clearly labeled as playback or deterministic fallback, never as autonomous live attack.

### 19.3 Decisions to record in ADRs

`ADR-001`: target isolation strategy and actual host constraints.  
`ADR-002`: Ollama vs llama.cpp and model benchmark.  
`ADR-003`: per-run sequencing/clock and concurrency.  
`ADR-004`: scenario/rubric versioning and outcome semantics.  
`ADR-005`: event ingestion trust and correlation.  
`ADR-006`: deployment and demo fallback policy.

---

## 20. Open decisions and change control

| Decision | Current recommendation | Owner | Due |
|---|---|---|---|
| Demo machine hardware | Benchmark CPU/RAM/GPU/VRAM; do not assume model speed | B + team | Before model commitment |
| Host isolation | Disposable VM + restricted containers if feasible | A | Before target launch |
| Exact competition challenge | Verify official organizer portal/rules | Product lead | Before final pitch |
| Practice vs assessment | Practice P0; assessment P1 | C+D | After full loop |
| Rubric point bands | Freeze in reviewed versioned scenario | C + instructor reviewer | Before scoring code |
| Attacker scheduling | Short observation window and explicit action budget | B+C | Before live integration |
| Authentication | Local-only learner login; run-scoped permissions | C | Before browser integration |
| Licensing/provenance | Verify exact upstream versions and licenses | Each owner | Before merge |

**Change-control rule:** A P0 requirement may be removed only if the team records why, what product claim must be narrowed, which tests change, and how the demo will disclose the limitation. No scope expansion after release candidate without explicit approval.

---

## 21. Immediate groundwork checklist (first 24 hours)

- [ ] Four owners read and sign off on this PRD and the master build prompt.
- [ ] Record available machines, OS, RAM, CPU, GPU/VRAM and container/VM capability.
- [ ] Verify official competition challenge, rules, deadline and submission requirements.
- [ ] Create the monorepo and owner directories; protect the main branch.
- [ ] Freeze event/action/run enums and generate schema fixtures.
- [ ] Freeze the target adapter and browser API, including error format and idempotency.
- [ ] Write the reviewed scenario fixture and versioned scoring rubric; separate hidden answer key.
- [ ] Build mocked target/model responses so C and D can proceed immediately.
- [ ] Define the network boundary and run the first isolation smoke test.
- [ ] Benchmark the first Q4 model on the actual machine before designing around assumed latency.
- [ ] Open tickets `SL-001` through `SL-012` with owners, dependencies and acceptance tests.
- [ ] Schedule a daily end-to-end integration check; target the first model→target→audit trace before UI polish.

---

## 22. References and provenance

**Primary internal source materials** (available in the working project context):
- `Sentinel_Loop_v2_Adversarial_Cyber_Range_Blueprint.md` — prior product architecture, threat model, scoring and timeline.
- `Sentinel_Loop_4_Workstreams/00_START_HERE_SHARED_CONTRACT.md` — canonical four-owner contracts.
- `04_OWNER_A_CYBER_RANGE.md` through `07_OWNER_D_DEFENDER_UX_QA_DEMO.md` — owner-level handoffs.
- `Brain.zip` — Grounded Brainstorm skill pack; applied its evidence, assumption, red-team and experiment discipline.

**External technical references** (official/upstream; links are for further inspection, not evidence that the MVP works):
- Ollama structured outputs: https://github.com/ollama/ollama/blob/main/docs/capabilities/structured-outputs.mdx
- Qwen3 official repository: https://github.com/QwenLM/Qwen3
- Qwen3-1.7B model card: https://huggingface.co/Qwen/Qwen3-1.7B
- Docker rootless security: https://docs.docker.com/engine/security/rootless/
- Docker seccomp: https://docs.docker.com/engine/security/seccomp/
- Docker Engine security: https://docs.docker.com/engine/security/
- OWASP crAPI: https://github.com/OWASP/crAPI
- Strix: https://github.com/usestrix/strix
- Dreadnode Ares: https://github.com/dreadnode/ares
- Microsoft CyberBattleSim: https://github.com/microsoft/CyberBattleSim

**Evidence note:** The upstream documentation supports the feasibility of structured local model outputs and restricted container configurations; it does **not** prove that a small quantized model is a competent adversary or that any specific sandbox is secure. Those are implementation tests.

---

## 23. Approval / release decision record

| Gate | Reviewer | Status | Evidence link |
|---|---|---|---|
| Product scope and scenario | Product lead + A/B/C/D | Not reviewed | TBD |
| Contracts frozen | C + dependent owners | Not reviewed | TBD |
| Target and containment truth | A + C | Not tested | TBD |
| Model autonomy/validity | B + C | Not tested | TBD |
| Defender full-loop UX | D + C | Not tested | TBD |
| Isolation and reset | A + independent reviewer | Not tested | TBD |
| Scoring and replay integrity | C + D | Not tested | TBD |
| Demo claims/provenance | All owners | Not reviewed | TBD |
| Competition submission | Product lead | Not submitted | TBD |

**Final release principle:** The smallest trustworthy adversarial training loop wins over the largest unverified feature set. No release gate may be marked complete without an artifact or actual test result.
