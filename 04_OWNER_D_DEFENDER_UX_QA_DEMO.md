# Workstream 04 — Defender Experience, End-to-End QA & Competition Demo
**Owner:** Engineer D | **Mission:** turn the underlying cyber range into a clear, high-pressure but fair learning experience that a first-time trainee can operate and understand.

## You own
`apps/web/`, frontend design system, learner workflow, investigation and evidence interactions, defender command UX, verification controls, debrief/replay visualization, browser E2E tests, usability sessions, and preliminary video production. You do not generate synthetic 'real' logs, decide scores or expose the hidden answer key.

## Learner experience: seven screens/states, not seven separate pages
1. **Scenario briefing:** fictional company, role, protected asset class, success conditions, practice/assessment label. Do not reveal the attacker-held session or answer.
2. **Live SOC workspace:** alerts, searchable events, filters by time/user/session/source/outcome/resource, visible stream state, background benign activity, clear event IDs and timestamps.
3. **Investigation drawer:** user/session/document details from released evidence, select event IDs, build short incident timeline, record hypothesis.
4. **Declare incident:** select suspected user/session, attach evidence IDs, submit to C; distinguish incomplete evidence from incorrect guesses without leaking ground truth.
5. **Containment console:** revoke session, temporarily disable account, require reauth and restore account. Show consequence warnings and confirmation for disruptive actions; report actual backend result, not optimistic UI success.
6. **Verify recovery:** separate buttons/checks for 'suspicious session denied' and 'legitimate workflow succeeds'. Display real measured results and unresolved states.
7. **Debrief and replay:** outcome, score breakdown, evidence links, agent action timeline with fallback labels, harmful actions, service availability, next practice suggestion.

### Required P0 features
- React + TypeScript + Vite; responsive but optimize demo laptop viewport first.
- SSE subscription with `Last-Event-ID` or cursor, reconnect status, backfill and client dedup.
- Event table with at least user/session/time/outcome filtering; selected evidence tray and timeline.
- Incident declaration form with exact event IDs.
- Defensive action buttons wired to C, with loading, errors, confirmations and observed results.
- Recovery checks and explicit pending/failed/verified statuses.
- Debrief view from C's immutable score API; replay from recorded trace without re-executing.
- No UI access to hidden scenario truth, model credentials or raw target tokens.
- Clear difference between live model-selected action and tagged fallback.

### Optional P1 only after full vertical slice
- Practice-only contextual hints, **strictly** from learner-visible evidence and routed through C/B; assessment mode has no hint endpoint.
- Assessment timer and progress indicator tied to C's scenario clock, not wall time spent waiting for model inference.
- One polished branch comparison and clearer timeline visualization.
- Instructor summary export only if core experience is stable.

### Design principles
- Prioritize information hierarchy: critical evidence visible; benign noise present but not overwhelming.
- Make a correct defensive choice discoverable from observable facts, not from guessing the scenario writer's intent.
- Prevent accidental destructive actions with explicit warnings and confirmation.
- Distinguish 'command requested', 'target action applied', and 'recovery verified'.
- Never declare 'You won' because the user clicked Revoke; wait for C's measured outcome.
- Stress comes from meaningful evolving evidence and time pressure, **not** random flashing alerts or confusing UI.
- Make accessibility practical: readable contrast, keyboard support for core controls, labels, visible focus and timestamps.

### Mock-first interface handoff
- On 22 Oct request from C: example events, paginated list, SSE envelope, declaration request/response, defender-action response, verify response, score breakdown, replay response, error shape.
- Build entire UI against static fixtures on 23 Oct; do not wait for live backend.
- Swap to live C endpoints by 24 Oct; report contract drift immediately.
- Treat browser state as ephemeral presentation; C is authoritative for all actions and scores.

### Browser and usability tests
| Journey | Pass criterion |
|---|---|
| Fresh run | User can start without terminal commands or manual DB edits |
| Investigate | User can filter and cite at least two real visible event IDs |
| Contain | User action produces confirmed backend state; errors do not show false success |
| Recover | Two measured checks are independently visible |
| SSE interruption | Reconnect restores ordered events without duplicates |
| Replay | Shows recorded sequence, no new attack activity |
| Reset | New scenario has clean state; old replay remains accessible only as authorized |
| First-time user | Observe 3–5 junior learners if accessible; capture actual confusion, timing and completion |

### Preliminary demo narrative (verify organizer format)
- **0:00–0:30** trainee pain and target learner; no invented market numbers.
- **0:30–1:00** one-sentence product and isolation diagram.
- **1:00–2:00** one chronological sequence: model-selected action → target response → real event → evidence selection → session revoke → denied retry → benign task succeeds → debrief.
- **2:00–2:30** explain one local quantized model, bounded tools, model/runtime provenance, deterministic scoring and safety.
- **2:30–3:00** honest test results if measured, remaining limits, planned instructor pilot.
Record a clean demo and backup. Never splice unrelated runs as though continuous. Label any prerecorded or fallback footage accurately.

### Red-team your own segment
- A beautiful dashboard that does not show *why* an event matters is not a learning tool.
- A confusing interface makes the learner appear less capable than they are.
- If users can see hidden future evidence in API responses, assessment mode is compromised.
- If a stale SSE event arrives after reset, the new run becomes misleading.
- If a UI toast claims success before C confirms target effect, the demo overstates correctness.
- If the demo spends most of its time showing charts, judges may miss the key adaptation/containment proof.

### Daily tickets
- **22 Oct:** wireframes, component hierarchy, data fixture requirements, demo story beats.
- **23 Oct:** mock-driven live dashboard, filters, evidence selection, incident declaration.
- **24 Oct:** wire C's SSE/actions, build verification and debrief views.
- **25 Oct:** full browser E2E P0 path.
- **26–28 Oct:** replay UI, reconnect/error handling, usability observations, video rehearsal.
- **29 Oct:** feature freeze, screenshot and accessibility audit, final E2E regression.
- **30–31 Oct:** record/verify submission and backup; retain receipt.

## Definition of done
A first-time trainee can understand the fictional setting, observe real attack evidence, investigate and cite relevant events, make a defensible containment choice, run both recovery checks and understand the score/replay. No developer console, hidden answer or manual backend manipulation is needed to finish the exercise.

## Useful references
React/TypeScript/Vite, Playwright, accessible component primitives. Study existing SOC dashboards for information architecture and incident timelines; use REA only on authorized applications and convert observations into original UI requirements rather than copying proprietary assets.
