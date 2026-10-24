<!-- Supplied by the user; original citation tokens are preserved but unresolved. Recovered 2026-10-23. -->

# Sentinel Loop: a beginner SOC experience that proves learning

## 1. What the research supports

**The next step should be a complete learning loop around the two existing scenarios: investigate, make a decision, observe its consequences, receive evidence-backed coaching, and demonstrate the skill again without help.**

That matches your choices: **prove beginner learning, remain local first, and let beginners control the pace.** It also gives us a focused way to test whether the AI attacker improves learning.

The current implementation has demonstrated real model decisions reaching the target, defender actions changing access, and both scenarios reaching verified recovery. Those journeys establish that the core integration works. They do **not** yet establish broad attacker intelligence, reliable variation across repeated runs, beginner usability, or learning effectiveness.

This research combines public learner discussions, practitioner discussions, official product documentation, repository documentation, licenses, and issue histories. Public comments are qualitative evidence; I have not interviewed these users or established how representative they are.

### What users actually describe

| Finding | Evidence | Implication for Sentinel Loop |
|---|---|---|
| **Knowing terminology does not mean knowing how to investigate.** | A learner with a cybersecurity degree and foundational certifications described a practical skills gap and explicitly wanted a structured path rather than being dropped into a lab. A new analyst separately described understanding alert handling but feeling lost inside logs. genui{"citation":{"refs":["turn12view5","turn12view1"]}} | Teach the investigation process inside the console: what question to ask, what evidence could answer it, and how to interpret the result. |
| **Learners need to understand normal activity.** | In the log-analysis discussion, the learner asked how to recognize normal behavior; respondents emphasized understanding the underlying assets rather than only learning a SIEM interface. genui{"citation":{"ref":"turn12view1"}} | Give every exercise a concise company brief, legitimate workflows, asset responsibilities, and expected access patterns. |
| **Evolving incidents are engaging.** | One SOC Simulator user praised the progression from low to high severity alerts, hypothesis building, and investigating with colleagues. They also requested detection-rule editing and additional SIEM support. genui{"citation":{"ref":"turn12view4"}} | Preserve evolving incidents and meaningful consequences. Detection engineering and collaboration are credible later extensions. |
| **There is demand for useful AI guidance, alongside skepticism.** | One learner specifically praised AI report reviews. In the Echo announcement discussion, another wanted small nudges, explanations, and controls against revealing answers; other commenters rejected another generic chatbot and prioritized content quality. genui{"citation":{"refs":["turn10view1","turn12view2"]}} | The assistant must understand the current investigation and help the learner reason. Adding chat alone is insufficient. |
| **Unclear grading undermines trust.** | Users questioned escalation criteria and described report grading as overly particular. These are user accounts, not independently verified assessments of the grading systems. genui{"citation":{"refs":["turn10view2","turn12view3"]}} | Publish the organization’s escalation policy and assessment rubric. Accept multiple defensible investigation paths. |
| **Lost work can erase the value of a session.** | Users reported losing investigation progress after crashes. The thread includes a reported fix and user confirmation. Another review requested autosaving, followed by a vendor response describing an assessment change. genui{"citation":{"refs":["turn12view0","turn12view3"]}} | Saving, reconnection, recovery, and clear submission states belong in the release criteria. |
| **AI feedback can introduce new errors.** | After confirming the crash fix, a user reported that AI feedback attributed a date to their report that they had not entered. genui{"citation":{"ref":"turn12view0"}} | Every factual coaching claim needs traceable evidence; disputed feedback must be reviewable. |

Practitioner evidence points in the same direction. A 2026 study analyzed **892 relevant Reddit posts** about LLM use in cybersecurity operations. It found useful applications in investigation support, queries, scripting, and reporting, alongside reliability concerns and verification overhead. This supports assistance that analysts can inspect; it does not establish demand for autonomous training adversaries specifically. genui{"citation":{"ref":"turn10view3"}}

**I found clearer evidence for realistic practice and trustworthy assistance than for learners explicitly requesting an unrestricted AI attacker.** The attacker remains our product hypothesis: we must demonstrate that adapting to the defender teaches skills that fixed scenarios do not.

We also need accurate competitive positioning. TryHackMe already documents dynamic alert queues, real tools, and AI case-report feedback. LetsDefend describes generating scenarios using attacks and logs from real environments. Immersive offers exercises using operational SIEM tools. “Other simulators are all static” would be an inaccurate claim. genui{"citation":{"refs":["turn20view0","turn20view1","turn20view2"]}}

Our proposed distinction is more specific:

> **A beginner can defend a functioning company against a responsive AI adversary, understand why each decision mattered, and demonstrate the skill again on an unfamiliar variation.**

That is a positioning hypothesis to validate.

## 2. What to borrow from other platforms and repositories

### Teaching patterns from outside cybersecurity

| Reference | Documented approach | What we should adopt |
|---|---|---|
| **CS50 Duck** | Conceptual and debugging assistance grounded in course material, with explicit rules governing assistance. genui{"citation":{"ref":"turn17view4"}} | Contextual explanations using approved learning material and the learner’s current evidence. |
| **Boot.dev** | Small practical challenges before full projects, with a Socratic assistant intended to avoid supplying answers. genui{"citation":{"ref":"turn15view5"}} | Short prerequisite exercises and gradually reduced guidance. We should record assistance without penalizing beginners for asking questions. |
| **Scrimba** | Feedback considers challenge criteria rather than requiring the teacher’s exact solution. Its implementation article documents grading errors, disputes, and an evaluation suite. genui{"citation":{"ref":"turn17view3"}} | Evaluate reasoning against explicit criteria, accept valid alternatives, and provide a feedback dispute mechanism. Retain our authoritative server scoring. |
| **Scrimba contextual explainers** | Explanations use the selected code, current lesson state, and narration available at that point. genui{"citation":{"ref":"turn22view2"}} | “Explain this event” should use the selected event and current investigation state, without inventing a separate example. |
| **KodeKloud** | Embedded assistance and short sessions combining explanations with real hands-on labs. These are documented product capabilities, not independent evidence of effectiveness. genui{"citation":{"ref":"turn17view2"}} | Offer small lessons at the moment a learner encounters a missing concept. |
| **CodeCrafters** | Its authoring guidance explicitly recommends observing beginners because experts miss confusing steps. genui{"citation":{"ref":"turn20view5"}} | Observe actual beginners before expanding the curriculum. |

There is also a reason to measure independent performance. A randomized study in high-school mathematics found that unrestricted AI assistance could improve practice performance while harming subsequent unaided performance; learning safeguards mitigated that problem. This is evidence from another subject, so it informs our evaluation design rather than predicting SOC outcomes. genui{"citation":{"ref":"turn20view3"}}

### Open-source adoption decisions

These are documentation and license assessments, not completed integration benchmarks.

| Project | Useful contribution | Decision |
|---|---|---|
| **[Strix](https://github.com/usestrix/strix)** — Apache-2.0 | Autonomous application pentesting, tool execution, sandboxing, and validation of findings. genui{"citation":{"refs":["turn16view0","turn15view1"]}} | Study action-validation and execution-feedback patterns. Keep our existing attacker and authoritative control plane for this increment. |
| **[KC7](https://github.com/KC7-Foundation/kc7)** — Apache-2.0 code | Investigation narratives, query-driven pivots, and beginner-oriented analysis. genui{"citation":{"refs":["turn15view4","turn23view6"]}} | Use as the closest teaching reference. Author our own exercises around our real target; do not assume every hosted scenario or media asset shares the code license. |
| **[CALDERA](https://github.com/apache/caldera)** — Apache-2.0 | Adversary-emulation orchestration, techniques, operational reporting, and plugins. genui{"citation":{"ref":"turn15view2"}} | Revisit as an optional execution adapter when adding endpoint scenarios. Avoid introducing another orchestration system now. |
| **[Atomic Red Team](https://github.com/redcanaryco/atomic-red-team)** — MIT | Small, repeatable ATT&CK-mapped detection tests. genui{"citation":{"refs":["turn15view3","turn23view5"]}} | Use selected tests later to validate genuine endpoint telemetry and response. It is a test library, not an adaptive attacker. |
| **[Adversary Emulation Library](https://github.com/center-for-threat-informed-defense/adversary_emulation_library)** — Apache-2.0 | Full and focused micro-emulation plans with prerequisites and expected behaviors. genui{"citation":{"ref":"turn23view2"}} | Adopt the discipline of bounded, documented behaviors when authoring future attack families. |
| **[Attack Flow](https://github.com/center-for-threat-informed-defense/attack-flow)** — Apache-2.0 | Structured descriptions of how attacker actions connect. genui{"citation":{"ref":"turn23view3"}} | Reference its representation for future exports. Build the immediate debrief from our existing recorded events. |
| **[Sigma](https://github.com/SigmaHQ/sigma)** | Detection-rule examples and a portable detection vocabulary; repository rules use DRL 1.1. genui{"citation":{"ref":"turn23view4"}} | Defer rule importing to a detection-engineering increment with explicit attribution and license handling. |

Two tempting shortcuts should stay outside this release:

- **CyberBattleSim** is an abstract agent-research environment; it would not supply the operational telemetry our learner needs. genui{"citation":{"ref":"turn21view5"}}
- The original **DetectionLab** repository states that it is no longer actively maintained. It is useful historical reference, but a poor default foundation for new deployment work. genui{"citation":{"ref":"turn19search5"}}

Strix’s issues are especially relevant to your local-first decision. Users reported repetitive generation, timeout configuration difficulties, and tool calls appearing as text instead of executing. The latter issue was closed following corrective work. These reports do not prove current Strix is unsuitable; they identify failure cases we must benchmark before adopting its patterns or dependencies. genui{"citation":{"refs":["turn20view6","turn20view7"]}}

**Default: add no new runtime framework in this increment.** Reuse concepts and narrowly selected components only where they reduce measured implementation work.

## 3. The next product increment

Keep the accepted original console, shared navigation, two landing cards, and existing investigation workflow. Add depth through the current briefing, case, assistant, debrief, and training surfaces.

### A. Finish the reliability baseline

Before adding learning features, resolve the outstanding consolidation review items:

- Terminal views display persisted server records and reject further exercise mutations.
- Later response actions invalidate any recovery verification and dependent playbook completion that is no longer valid.
- Local drafts cannot masquerade as the submitted terminal report.
- Refresh, reconnection, concurrent tabs, and ownership changes cannot overwrite newer state or mix runs.
- Complete the updated browser journeys and save machine-readable proof of real model decisions, target actions, and correlated audit events.

These are release gates, not claims that fresh verification has already passed.

### B. Introduce a short briefing and a coherent learning path

Each scenario briefing explains:

- The analyst’s role and authority.
- The company’s legitimate browser and reporting workflows.
- The available evidence sources and their limitations.
- Escalation criteria and the meaning of successful recovery.

First coached launches begin **paused**, with an explicit **Begin investigation** action. Practice retains manual pause; assessment retains its timed behavior and manual-pause restriction. AI failure pauses remain separate.

Use the existing training area for three optional micro-exercises: reading an authentication event, comparing normal and suspicious access, and distinguishing session revocation from credential revocation. These are clearly labeled learning exercises, not replacements for the live AI scenarios.

### C. Make the existing case teach investigation

Add an optional structured worksheet inside Incident Details:

1. Observation.
2. Working hypothesis.
3. Supporting and contradicting evidence.
4. Scope and remaining uncertainty.
5. Proposed action and business impact.
6. Verification and handoff.

Reuse pinned events and case artifacts. Do not require a particular query sequence or specific prose to receive useful feedback.

Autosave worksheet drafts to the backend with revision checks and visible **Saving / Saved / Reconnect required** states. Preserve an unsynchronized local copy until acknowledged. Concurrent edits must present a recoverable conflict rather than silently discard work.

Keep the final submitted report distinct from editable drafts.

### D. Turn Evidence Assistant into an inspectable coach

Provide three assistance levels:

- **Explain:** interpret a selected field, event, or concept.
- **Nudge:** suggest a question worth investigating.
- **Guide:** offer a query pattern and explain what different results would mean.

The learner executes queries and response actions.

The coach receives only approved learning material, public company documentation, released run evidence, and the learner’s authorized case content. It must not receive hidden attacker plans, future events, or unreleased ground truth.

Every factual response includes supporting event references or exact report excerpts. Unsupported conclusions are labeled as hypotheses. Invalid references cause the response to be rejected or regenerated within a bounded retry budget.

Record assistance level, evidence revision, model version, and feedback disputes. Asking for help does not reduce practice scores. Assessment disables coaching while keeping authorized documentation available.

If coaching fails, show its unavailable state and retain authored reference material. If the attacker model fails, preserve the existing system pause and authenticated retry behavior. Never substitute scripted attacks.

### E. Add meaningful variation within the existing scenarios

Create **three validated configuration variants per scenario**:

- **Stolen Session:** vary the compromised principal/session, legitimate concurrent access, and relevant background activity.
- **Reporting Blind Spot:** vary the browser and reporting access configuration, affected resources, and legitimate reporting dependencies.

Variation must change the investigation or containment decision. Changing only names and IP addresses is insufficient.

Each variant initializes the actual target, legitimate activity, evidence, and scoring consistently. The attacker chooses among valid actions from its observations; the server continues to enforce capabilities and prerequisites.

Store a versioned variant manifest, seed, model configuration, and decision/action trace. A seed reproduces initial conditions; **exact replay uses the recorded trace**, because model generation is not guaranteed to reproduce identically.

Difficulty is fixed at launch. Coaching cannot secretly weaken the attacker during an assessment.

### F. Explain consequences after the exercise

Extend the existing debrief with:

- What the learner could observe at each decision.
- Which evidence supported or contradicted the conclusion.
- What the defender action changed.
- What the attacker actually attempted next.
- Whether legitimate workflows remained available.
- One recommended exercise addressing the observed gap.

Keep server-calculated scores and outcomes authoritative. AI commentary is advisory and cannot rewrite results.

After completion, allow an evidence-linked report export and **Try another variation**. Clearly distinguish coached and independent attempts. Do not claim that a simulator score certifies professional readiness.

### Minimum interface changes

Extend the current runtime contracts with:

- Versioned variant metadata.
- Revision-checked worksheet drafts.
- Coaching requests and responses with validated evidence references.
- Assistance history and feedback disputes.
- Post-run skill observations with provenance.

Reuse existing case and assistant APIs where applicable; keep all operations authenticated and run-scoped. Terminal runs permit reading and exporting recorded material, not appending exercise activity. Older runs load with optional fields absent, preserving existing notes, handoffs, and scores.

Canonical action and lifecycle enums remain unchanged.

## 4. How we prove this is useful

### Engineering and AI evaluation

Run native tests, production build, browser journeys, Harness verification, and Harness evaluation.

Add focused coverage for:

- Draft recovery after refresh, disconnect, and concurrent edits.
- Run isolation, authorization, revision conflicts, and retry idempotency.
- Terminal immutability and verification invalidation.
- Unsupported evidence references, invented report quotations, answer leakage, and instructions embedded in untrusted logs.
- AI unavailable at launch, mid-run failure, retry without duplicate actions, and assessment restrictions.
- Navigation, keyboard behavior, saving feedback, and layouts at 320, 390, 768, and 1440 pixels.

For genuine AI, run **12 complete journeys**: two scenarios × three variants × two repetitions. Record hardware, model digest, prompt version, latency, failures, decisions, and target audit correlation. Add paired intervention checks showing how changed defender state affects subsequent authorized attacker behavior.

Passing requires actual target execution and verified consequences—not a plausible model explanation. Different seeds alone are not proof of meaningful adaptation.

Create a **60-case coaching evaluation set**, evenly covering valid alternative reasoning, misconceptions, unsupported claims, leakage attempts, conflicting evidence, and unavailable data. Every factual feedback claim must have a valid reference; every critical leakage or authority violation blocks release.

Measure local-model latency on declared hardware. Set a pilot usability budget of **15 seconds at the 95th percentile for coaching**. If the existing model misses quality or latency gates, record the supported hardware/model combination honestly; do not conceal the problem through scripted behavior.

### Observe beginners directly

Recruit **eight beginners** across foundational-certification and helpdesk/career-transition backgrounds, plus **two experienced analysts** to review realism and the rubric.

Use observed sessions:

1. A short independent baseline investigation.
2. A coached investigation.
3. An unfamiliar independent variation.
4. A follow-up investigation approximately one week later.

Counterbalance comparable variants to reduce order effects. Record where learners hesitate, what they misunderstand, which hints help, and whether they can explain their containment choice.

Use six human-reviewed skills, each scored 0–2: triage, querying, evidence interpretation, scoping, containment judgment, and recovery/handoff. Keep this research rubric separate from the current exercise score. Map the skills to NICE terminology without implying certification. genui{"citation":{"ref":"turn23view0"}}

Pilot progression gates:

- At least six of eight learners make two meaningful evidence pivots without facilitator intervention.
- At least six contain the unfamiliar variation while preserving legitimate work.
- Median independent performance improves by at least two points on the 12-point rubric.
- No participant loses acknowledged saved work.
- Experts identify no unresolved critical realism or grading defect.

These are formative product gates, not statistically conclusive evidence of learning effectiveness. Preserve negative findings and revise the increment when it fails them.

## 5. Harness delivery, documentation, and release boundaries

Deliver in five bounded milestones:

| Milestone | Deliverable | Required evidence |
|---|---|---|
| **M0 — Reconcile** | Fresh repository/context review and consolidation fixes | Recorded working-tree state; completed regression journeys |
| **M1 — Orient** | Briefings, practice pacing, worksheet persistence | Beginner walkthrough and persistence checks |
| **M2 — Coach** | Grounded assistance and dispute handling | Coaching evaluation results |
| **M3 — Vary** | Six validated variants and causal debrief | Real-model journeys and intervention checks |
| **M4 — Validate** | Observed beginner pilot and revised learning flow | Findings, gate decisions, evaluation, and handoff |

When implementation access is restored:

- Run Harness status and take over `master-integration`; read the companion skill, current master context, contract, and PRD.
- Read affected Ahnaf, Tanvir, and Saad contexts/contracts before changing their segments. Reconcile `git status` and `git diff`, preserving unrelated work.
- Amend the master contract before consequential work. Record UX ownership in Ahnaf’s contract, coaching/attacker evaluation in Tanvir’s, and persistence/variant authority in Saad’s.
- Preserve the accepted Visual Contract, canonical enums, schema validation, authorization, and scoring authority.

Maintain three linked product records:

- `docs/product/BEGINNER_LEARNING_RESEARCH.md`: sources, user observations, dates, contradictory evidence, confidence, and hypotheses.
- `docs/product/BEGINNER_LEARNING_PLAN.md`: requirements, form behavior, milestones, acceptance checks, and research decisions.
- `docs/product/OPEN_SOURCE_ADOPTION.md`: inspected versions, licenses, proposed reuse, attribution, maintenance considerations, and integration decisions.

Each requirement links **evidence → contract → implementation → verification**. Document launch, worksheet, closure, and feedback-dispute forms with their validation, persistence, accessibility, and error behavior.

After each material milestone, update native Harness state and tracked context, run `harness check run`, perform a separate evaluation pass, run `harness check evaluate`, and record findings in the relevant evaluation ledger. Final handoff must distinguish automated results, manual observations, unresolved defects, and exact next actions.

**Release defaults:** local AI, beginner learning first, two scenario cards, accepted console layouts, learner-controlled coached practice, timed assessment, and no additional orchestration framework. Windows installation, new attack families, multiplayer, SIEM rule editing, and institutional administration remain subsequent increments.

**Current limitation:** the shell failed before executing Harness status and file reads with `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`. Consequently, this turn produced research and a plan; it did not update repository Markdown or complete a fresh Harness checkpoint. M0 must reconcile the actual repository before implementation.
