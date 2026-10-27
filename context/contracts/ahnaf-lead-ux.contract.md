# Task contract: Ahnaf — Lead, Overseer & Defender Command Center (`ahnaf-lead-ux`)

## Current increment: approved observer design (24 October 2026)

Follow `docs/product/AI_OBSERVER_RANGE_PLAN.md` and its independent decision/review log. Design arbitration APPROVED; feature/runtime qualification remains pending. Milestone A is an additive instructor/assigned-observer split view, actual model/validator/target provenance, exercise-tab capture, truthful reconnect/gap states and own-terminal-run review. Live real-model strategy must be absent from learner UI and server DTOs in both modes; this supersedes earlier practice Adversary Lens exceptions while retaining the accepted visual grammar and SOC workflows. Private inputs/notes are blocked, recording scope disclosed, and replay cannot execute recorded content. Coordinate authorization and event contracts with Saad before UI work; preserve original views, accessibility limits, model failures and deferred participant kit. Milestone B adds actual lab Windows read-only observation/replay; C adds timed briefing/results separated from the formative score. No personal desktop recording or invented AI thoughts/typing.

## Audience and outcome
- **Audience:** Junior SOC learner (primary user), cybersecurity instructor (secondary user), competition judges (evaluation audience), and any engineer/agent taking over Ahnaf's segment.
- **Outcome:**
  1. Lead cross-segment contract alignment (`G0`–`G6`) across `ahnaf-lead-ux`, `tanvir-red-agent`, and `saad-range-control`.
  2. Deliver `apps/web/` (React + TypeScript + Vite): a task-led **Mission Workbench** (guide panel + visualization-first workbench) covering all 7 PRD states (Mission Landing, Live Operations, Investigation, Incident Declaration, Containment, Dual Recovery Verification, Debrief + Replay) where a student learns blue-team investigation by facing an AI adversary in real time.
  3. Deliver `tests/e2e/` (Playwright end-to-end browser verification) and `docs/demo/` (3-minute uncut chronological demo).

## Current source identity
- **Repository:** `/home/ahnaf-zakaria/Downloads/Cydeline`
- **Segment Task ID:** `ahnaf-lead-ux`
- **Owned Paths:** `apps/web/`, `tests/e2e/`, `docs/demo/`, `context/AHNAF_CONTEXT.md`
- **Authoritative Specs:** `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` (Sections 5 Epic D, 6, 8.4, 18) and `07_OWNER_D_DEFENDER_UX_QA_DEMO.md`
- **Design plan of record:** `~/.cursor/plans/mission_workbench_ui_ux_0811b79e.plan.md` (Mission Workbench UI/UX). This contract supersedes the earlier "Pure White + Deep Navy + Cool Pop" single-table console contract.

## Acceptance examples (observable)
1. **FR-D01 (Mission Landing):** Shows the ticket-style case (SOC-0142), what the learner will practice, time/difficulty, practice-mode badge, fictional-sandbox notice, AI-opponent model/fallback status and exactly one primary CTA (`Start shift`), without exposing hidden answer keys.
2. **FR-D02 & TABLE-01 (Log console):** Learner-visible events render as one structured access-log line each (`time level source method path status session user src_ip latency request_id`), never as prose. Supports query filters (`session:`, `status:`, `user:`, `path:`, `ip:`), pivots (All / Denied / Restricted / By session), Live/Paused with an `N new` pill (`LIVE-01`), and preserves monotonic `sequence` order and pinned evidence across filter changes.
3. **FR-D03 & FR-D04 (Investigation & Declaration):** Row click opens an Inspector drawer (structured fields, raw JSON, related events by session/request id/resource, Pin as evidence). Declare drawer: pick suspected session, confirm pinned evidence, one-line rationale. Server-rejected input shows inline errors while preserving form input (`ASYNC-01`).
4. **FR-D05 & SAFE-01/SAFE-02 (Respond):** Three neutral radio-cards (`revoke_session`, `require_reauthentication`, `temporarily_disable_account`) with Scope / Stops / Side-effects rows and a hover blast-radius highlight on the System Map; a single `Apply` button after selection; confirm dialog with Cancel focused for disruptive actions; client `idempotency_key` retained across retries; success is shown only from a confirmed backend response.
5. **FR-D06 (Verify):** Two paired checks (`verify_suspicious_session_denied`, `verify_benign_workflow`) shown separately; each result also appears as a log line; both must pass to unlock the debrief.
6. **FR-D07 & AI-01 (Debrief):** Canonical `Outcome`, 100-point rubric (gauge + six bars) linked to real `event_id`/action/check ids, decision timeline, "What the logs showed", AI model-vs-fallback provenance, attack-stage strip revealed only here, replay trace read-only.
7. **Anti-oracle rule (PRD UX principles):** The live learner view never renders `risk_label`, prose `summary`, "recommended"/"surgical" badges, pre-action score penalties, or attacker-coloured *outcome* edges. Color encodes observable facts (outcome); suspicion is the learner's own marking (brand orange). Attack chain and annotations appear only after completion. **Exception (V2, explicit user decision):** the *Adversary Lens* (acceptance 9) may show the AI opponent's live moves, but only when the run `mode` is `practice` and the lens is on; `assessment` mode and the "Blind" lens setting render exactly the anti-oracle view above. The lens never shows a verdict ("attacker session", "recommended action") and never changes scoring.
8. **Live shift, then the attack map.** During the run the workbench is the specialist's shift: an activity picture (requests over time, refused vs allowed, the learner's own actions as markers), the log console, and an optional training overlay (Adversary Lens). Activity, Logs and Coach each toggle independently and remember the choice. The n8n-style workflow is **not** on the live shift, because a real analyst does not have that picture while the attack is happening. It is the debrief's attack map: the same circular left-to-right flow (`AI -> source IP -> session -> API gateway -> route or Refused -> protected asset`, plus `Your response`), scrubbable through the run, so the learner can see which track their response cut and which route the AI tried next. Nodes stay keyboard-focusable and open the details dock. AI attribution on that map is revealed only because the run is over.
9. **V2 Adversary Lens (practice mode):** A card shows "AI adversary - live": state (`watching` / `acting` / `stopped`), current move title, move counter, role, model/fallback provenance, and a short move timeline. The AI node on the canvas rings when it acts and its edge to the source IP it used lights up; log lines produced by the adversary carry a small indigo `AI` tag. A `Coached | Blind` toggle controls the lens (default Coached in practice, forced Blind in assessment). Data comes only from canonical snapshot fields (`last_ai_decision`, `ai_step`, `current_ai_role`); no new backend fields are required for the MVP.

## Selected UI/UX Visual Contract (`ui-ux-design` + `ui-ux-designer` compliance)
- **Style grammar (V2 "Ember"):** Product / operational + Technical / industrial on a **warm white** canvas with orange urgency accents and "glowing topology". Task-led layout modeled on LeetCode / TryHackMe (guide left, workbench right), no sidebar. Replaces the V1 white-blue ("cool pop") palette by user decision (2026-10-22: "whiteish orange for more urgency").
- **Surfaces:** canvas `#FFFDFA` (cards), page/guide tint `#FFF8F1`, wells `#FFF1E3`, hairline `#F0E1D1`, strong line `#E0C9B0`; two elevation levels with warm shadows (`rgba(60,30,10,.1)`); faint warm dot-grid behind the workflow canvas.
- **Semantic color roles (never color alone - always paired with label, icon or hatch):**
  - Ink `#1C1410`, secondary `#4A3B31`, muted `#6B5B4E` (all >= 4.5:1 on canvas and tint).
  - **Brand orange** `#C2410C` (fills/buttons, white text 5.2:1), bright `#F97316` (halos, graphics), ink `#9A3412`, soft `#FFF0E3`: primary actions, focus ring, *the learner's own marks* (pinned evidence, suspect ring).
  - Teal `#0F766E` allowed/healthy; Red `#DC2626` refused (always hatched/dashed + label); Gold `#A16207` disruption/warning; Indigo `#4F46E5` **AI-opponent identity only** (complement to the warm UI so the adversary is instantly distinguishable). Violet and cyan are retired.
- **Glow:** nodes carry soft halos (16-24 % alpha); selected node gets a brand ring; hatch fill encodes "refused" in charts and edges.
- **Workflow canvas grammar:** node = white circle (r 26-36) with 1.5 px border, centered Lucide icon, soft colored halo, label below (12 px bold) and mono sub-label (10.5 px); ports are 4 px dots; edges are 2-4.5 px beziers (teal = allowed, red dashed = refused, indigo dashed = AI, brand dashed = your response); count badges on edges. Selected = brand ring + glow; suspect = brand ring + "suspect" tag; revoked = shield badge.
- **Typography roles:** Space Grotesk (headings, KPI numerals), Inter (UI text), JetBrains Mono + `tabular-nums` (logs, ids). Scale 12/13/14/16/20/28/40. Fonts self-hosted via `@fontsource-variable/*` (offline-safe).
- **Spacing:** 4 px base, 8 px rhythm; card padding 20, grid gap 16, page gutter 24, section gap 24; radii 12 cards / 8 controls / pill chips; log row 28 px.
- **Hierarchy rules:** exactly one primary CTA per phase in the same top-right position of the workbench header; ≤ 8 visible learner controls per phase; detail lives in drawers, not on rows; dev/simulation controls live in a hidden Dev drawer (`?dev=1` or Cmd/Ctrl+K).
- **Motion (four, purposeful and state-bound, each with a `prefers-reduced-motion` static fallback):** (1) request packet travelling the full path IP -> session -> gateway -> route/sink; (2) AI node ring while the adversary is `acting` (static ring + label under reduced motion); (3) new log row highlight fade; (4) one shield pulse + blocked tick on confirmed containment. No decorative loops.
- **Accessibility/responsive (WCAG 2.2 AA):** keyboard map (`/` query, `j/k` rows, `Enter` inspect, `p` pin, `?` help), visible 2 px focus ring, batched `aria-live` announcements, no color-only status; layouts verified at 320 / 390 / 768 / 1440.
- **Simulation-first architecture:** frontend talks only to `ControlPlaneClient`. `StatefulSimulationClient` (default) runs an in-browser range (benign traffic from three employees, hijacked `sess_A` used from a second source IP, deterministic 100-point rubric); `LiveHttpControlClient` (`VITE_API_MODE=live`) targets Saad's `/api/runs/*`.

## Constraints and non-goals
- Never compute scores, outcomes, or access decisions in React; all truth comes from the control plane (or the simulation client standing in for it).
- Never fabricate attack animations unsupported by target telemetry; the map is derived only from emitted events and never pre-highlights the attack path.
- Never leak hidden scenario ground truth (no "attacker" labels, no recommended action, no answer key before completion).
- Build against static simulation first so frontend progress is never blocked by backend implementation.
- P1 fenced (not in this redesign's P0): dark theme, state-reading AI coach (FR-D09), replay scrubber polish, derived badges.

## Contract change requests (need Saad sign-off — see `context/contracts/master-integration.contract.md`)
- Optional `EventEnvelope.network { src_ip, user_agent, http_method, path, status_code, latency_ms, bytes }` for realistic access logs (UI hides columns when absent and derives method/path/status from `event_type` + `outcome`).
- Scenario fixture signal: `sess_A` source IP + user agent change mid-session while benign sessions stay stable (RFC 5737 ranges), benign:suspicious ≈ 6:1.
- `summary` and `risk_label` become optional, debrief-only annotations (not rendered in the live stream).
- Red-agent internal events (`agent.stop`) are `learner_visible: false` and surface only in replay/debrief.
- **V2 (Adversary Lens):** in `practice` mode the control plane exposes `RunStatusSnapshot.last_ai_decision` live (it is already a canonical field) and keeps it `null` in `assessment` mode until completion. Optional later: `ai_phase: thinking | acting | idle` and an `agent_step` link on adversary events so the UI can tag log lines exactly instead of deriving them from session + source IP.

## Consequential decisions and reasons
- **Mission-focused shell over sidebar platform:** one scenario today; a sidebar would be empty chrome on the Mission Workbench (user decision). The Practice Console (`#/practice`, SOC-simulator flow) is the exception: it uses a collapsible tool sidebar because the learner switches tools the way an analyst switches products. That sidebar is console-only and is not added to the workbench.
- **Practice Console visual exceptions (2026-10-22):** Ember-light layout copied from the SOC-simulator flow, not its dark palette. The Closed Alerts tab may use coral as a channel label (paired with the words "Closed alerts"). Severity uses console-scoped `--sev-critical`, `--sev-high`, `--sev-medium`, and `--sev-low` plus the severity word. Stand-in scanner pages (`#/ext`) are exempt from the Ember skin so they read as separate websites. Answer keys stay out of the live view and are applied only when an alert is closed.
- **White theme with glowing topology (V1):** user decision combining light references with dark-SOC visualization vocabulary.
- **Ember theme (V2):** user decision to move from white-blue to warm white + orange for urgency. Orange is the learner's color (actions, marks); indigo is reserved for the AI so the two actors never share a hue; teal/red remain outcome facts.
- **n8n-style circular workflow canvas (V2):** user decision to replace the three-column system map. The canvas explains *where* a request is allowed or refused (gateway authz) instead of only who talked to what.
- **Adversary Lens (V2):** user asked to see what the AI is doing in real time. It is practice-mode coaching, off in assessment, and never alters scoring; trade-off recorded: it makes the "find the odd session" step easier, so scored runs must use Blind.
- **Hand-rolled SVG charts/graph, no chart library:** tiny data volume, deterministic layout, no dependency risk for the offline demo.
- **Single-page phase-driven workspace over routes:** keeps stream, evidence and clock persistent across Observe → Verify.
- **Evidence pinning from drawer/hover, not on every row:** reduces simultaneous controls and visual noise.

## Assumptions/unknowns
- Assumes `apps/control-api/` exposes CORS or the Vite dev proxy on `/api/runs/*`.
- Assumes Saad accepts the optional `network` block; fallback is simulation-synthesized fields with hidden columns.
- Hallway usability test is informal (3 non-security people); no educational-efficacy claims.

## Next increment
- Retain the passed genuine browser workflows and raw canonical replay evidence. Manual zoom, reduced-motion and assistive-technology evaluation remain unverified; pilot kit is ready for future sessions.
- Current scope and evidence: `docs/product/BEGINNER_LEARNING_HANDOFF.md`; preserve prior failed gates.

## Verification commands, interaction checks and required independent review
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- `npm --prefix apps/web run typecheck && npm --prefix apps/web run test && npm --prefix apps/web run build`
- `npx playwright test` from `tests/e2e/` (keyboard-only full loop with axe checks)
- Screenshots at 1440 and 768 via headless Chrome for each increment.
- Independent evaluation via `harness-evaluate` (`context/evaluations/ahnaf-lead-ux.eval.md`).

## Evidence locations
- `Ahnaf.md`
- `07_OWNER_D_DEFENDER_UX_QA_DEMO.md`
- `context/AHNAF_CONTEXT.md`
- `docs/demo/mockups/` (U0 hi-fi mockups and renders)

- **2026-10-22 (V2 build):** Node details use an inline dock instead of a drawer. Node stage names (Adversary, Source IP, Session, Authorize, Route, Outcome, Your action) match the canvas column headers. Landing shows a cropped, non-interactive workflow preview. AI log attribution is a client heuristic (session handle from decisions + source IP the session did not first appear with) until contract request 5 lands.


## Authorized live product implementation amendment
Ahnaf authorized the full phased roadmap in docs/product/IMPLEMENTATION_ROADMAP.md. This amendment supersedes conflicting earlier UI-only/P0 scope limits for the new versioned live product. Keep existing v1 fixtures and canonical enums compatible. The unified SOC console is the live shell; mission evidence/response/verification/debrief are reused inside it. The target and server own all results. Composite business verification includes Eli and a fresh legitimate Maya workflow, so disabling Maya produces real disruption and restoration never resurrects compromised access. All terminal states permit debrief. Optional network telemetry, clock and exact decision/action/audit links are accepted. Practice may expose the Adversary Lens; assessment data is redacted server-side. Build and evaluate bounded vertical increments; mark unverified external services honestly.


## 2026-10-23: Restore the accepted SOC console
User explicitly supersedes the unified-live-shell amendment: every pre-existing practice tab must retain the exact d93b640 presentation and workflow. Restore the original landing and console entry; keep new live mission, progress, learner, instructor, assets, business, assistant and workstation views as additive navigation. Do not discard the uncommitted backend. Sandbox is the authorized exception: retain its panel/card grammar but replace the scripted shell with a real Windows VM gateway. New live views remain available under explicit #/live routes. Preserve the original mission inspector separately from live inspector additions.


## 2026-10-23: Consistent SOC navigation
Use the original TopNav and SideNav components for both practice and live pages. The same seven SOC tool links, four added training links, labels, icons, dimensions, collapse behavior and active-route treatment must remain available on Mission Library, My progress, My training, Instructor and run-specific pages. Live run links are additive; live status/pause/end controls belong in a separate content toolbar and must preserve assessment restrictions. Keep original tab content and backend authorization unchanged. Verify cross-route identity, icon fidelity, active markers, collapse persistence and mobile navigation.


## Approved consolidation — 2026-10-23 (supersedes conflicting earlier fixture/workbench decisions)

Implement one AI-powered SOC using the accepted original console layouts. Root has exactly The Stolen Session (stolen-session/v1) and The Reporting Blind Spot (northstar-breach/v2), compact coached-practice/assessment launch settings, and explicit resume under the one-active-company rule. Original Monitoring becomes Live Monitoring; original Logs and Cases use the same run-scoped snapshot/SSE provider. Preserve original icons, channels, tables, modals, playbook, notes, artifacts, tool arrangements, and training navigation; old run URLs remain valid, old practice links resolve into selected run or landing. No public scripted simulator, sample evidence, invented telemetry, browser grades, or answer keys.

Backend adds authenticated alert ownership/closure comments, idempotent one-case-per-run creation, revision-checked case/playbook/artifact updates with released-evidence validation and old notes/handoffs retained. Declaration, defense, recovery and scoring stay authoritative. Alert closure never ends the attacker. Scenario playbooks gate completion on server records; final feedback/replay is terminal only. Windows/Elastic live in Sandbox; Windows installation and new attack families remain out of scope.

Require actual model readiness on create/start. Invalid/timeout model output records a failed decision and system-pauses clock without fallback execution or step consumption. Authenticated AI retry retries the pending turn; defender-induced stale proposals are discarded without outage. Assessment disallows manual pauses, permits only system AI pauses. Preserve canonical enums, policy/schema checks, target audit correlation, response idempotency and authorization.

Acceptance: both scenario workflows, real model-to-target correlated actions and containment/legitimate continuity; case retries/revisions/old data; refresh, tabs, SSE reconnect, isolation and drafts; AI launch/outage/retry/assessment; 320/390/768/1440 keyboard/accessibility; native tests/build/Harness run/evaluate and handoff.


## Authorized beginner learning loop — 2026-10-23

Implement the attached beginner SOC plan in M0–M4: harden terminal immutability, persisted report identity, response/verification/playbook invalidation and draft isolation; add public company briefings, paused coached starts, three authored micro-exercises, revision-checked autosaved six-part worksheets, evidence-grounded Explain/Nudge/Guide coaching with exact citations and disputes, three meaningful target configurations per scenario, trace-linked causal debrief/export and another-variation launch. Keep the two scenario cards, original console layouts, canonical enums, real local attacker, server scoring and assessment restrictions. No new runtime orchestration framework. Assistance never deducts practice points. Variant manifests pin configuration, seed and hashes; exact replay consumes the recorded trace. Older records load with optional fields absent.

Acceptance: native tests/build/browser checks/Harness; 60 adversarial coaching cases; 12 genuine model journeys (2 scenarios × 3 variants × 2 repeats), audit correlations and paired interventions; coaching p95 ≤15s measured on declared hardware. Record failed/unavailable gates honestly. M4 prepares a counterbalanced eight-beginner/two-expert pilot and 0–2 six-skill rubric; no participant findings or educational-efficacy claims without observed sessions. Product records: docs/product/BEGINNER_LEARNING_RESEARCH.md, BEGINNER_LEARNING_PLAN.md, OPEN_SOURCE_ADOPTION.md.


## 2026-10-25 authorized lean shell and local demo access
The current user requests reduced navigation, immersive Windows, briefing before launch, separate instructor mode and password-free local testing. Apply `context/contracts/lean-shell-2026-10-25.contract.md`; it supersedes conflicting all-links-visible/repeated-briefing requirements. Preserve scoring, normal deployed authentication, live audience privacy and prior failed/unverified gates.

## 2026-10-27 focused briefing readability correction
User screenshot demonstrates the narrow launch modal overflowing the viewport without scroll. Keep the accepted theme and full authored briefing/policy, but use a wide responsive briefing dialog, two-column readable sections on desktop, strong headings and restrained background-highlighted key phrases. Bound dialog height, provide a keyboard-scrollable body and persistent launch/cancel footer, preserve library/assignment timing, errors and settings. Narrow viewports stack without clipping. Restart existing preview5188 with saved runtime. Verify rendered desktop/short/mobile, wheel/keyboard scroll, launch/error/cancel and focused independent review. This is a correction to accepted lean-shell UI, not a new application architecture or reset of the prior accepted bounded loop.
