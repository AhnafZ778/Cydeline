# Task contract: Ahnaf — Lead, Overseer & Defender Command Center (`ahnaf-lead-ux`)

## Audience and outcome
- **Audience:** Junior SOC learner (primary user), cybersecurity instructor (secondary user), competition judges (evaluation audience), and any engineer/agent taking over Ahnaf's segment.
- **Outcome:**
  1. Lead cross-segment contract alignment (`G0`–`G6`) across `ahnaf-lead-ux`, `tanvir-red-agent`, and `saad-range-control`.
  2. Deliver `apps/web/` (React + TypeScript + Vite): a single responsive, keyboard-accessible SOC workspace covering all 7 operational states (Briefing Lobby, Live SOC Event Feed, Investigation Drawer & Evidence Basket, Incident Declaration, Containment Console, Dual Recovery Verification, and 100-Point Debrief + Read-Only Replay).
  3. Deliver `tests/e2e/` (Playwright end-to-end browser verification) and `docs/demo/` (3-minute uncut chronological demo).

## Current source identity
- **Repository:** `/home/ahnaf-zakaria/Downloads/Cydeline`
- **Segment Task ID:** `ahnaf-lead-ux`
- **Owned Paths:** `apps/web/`, `tests/e2e/`, `docs/demo/`, `context/AHNAF_CONTEXT.md`
- **Authoritative Specs:** `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` (Sections 5 Epic D, 6, 8.4, 18) and `07_OWNER_D_DEFENDER_UX_QA_DEMO.md`

## Acceptance examples (observable)
1. **FR-D01 (Lobby & Briefing):** Displays Northstar Analytics scenario briefing, practice/assessment mode badge, sandbox simulation notice, model health status, and Start/Reset controls without exposing hidden answer keys.
2. **FR-D02 & TABLE-01 (Live SOC Event Feed):** Streams learner-visible events via SSE (`/api/runs/{id}/stream`) with `Last-Event-ID` cursor backfill and client deduplication (`LIVE-01`). Supports filtering by `actor_id`, `session_handle`, `source`, `event_type`, `outcome`, and time while preserving monotonic `sequence` ordering and existing Evidence Basket selections.
3. **FR-D03 & FR-D04 (Investigation & Incident Declaration):** Clicking an event opens the Event Detail Drawer showing correlated timeline records; learner adds visible `event_id`s to the Evidence Basket and submits `/api/runs/{id}/declare` with `suspected_session` (`sess_A`) and rationale. Server-rejected IDs show actionable inline errors while preserving form input (`ASYNC-01`).
4. **FR-D05 & SAFE-01/SAFE-02 (Containment Console):** Distinct controls for `revoke_session`, `temporarily_disable_account`, `require_reauthentication`, and `restore_account`. Disruptive actions (`temporarily_disable_account`) show explicit blast-radius warnings and default focus to Cancel in confirmation dialogs. Generates a client `idempotency_key` retained across retries; never shows optimistic "You won" or fake success before confirmed backend response.
5. **FR-D06 (Recovery Verification View):** Displays independent measured check states for `verify_suspicious_session_denied` and `verify_benign_workflow` (`eli@northstar.test`). Terminal recovery requires both checks passing.
6. **FR-D07 & AI-01 (Debrief & Read-Only Replay):** Displays canonical `Outcome`, 100-point rubric breakdown linked to clickable `event_id`s, and step-by-step replay trace (`/api/runs/{id}/replay`), explicitly distinguishing live local model decisions from `"fallback_used": true` steps.

## Selected UI/UX Visual Contract (`ui-ux-design` compliance)
- **Style Grammar:** **Product / operational** paired with **Technical / industrial** precision (`references/taste/styles.md`). Prioritizes high-signal tabular legibility, clear status semantics, zero decorative gradients/slop, and dependable keyboard fluency under time pressure.
- **Primary Visitor Action:** Observe live telemetry -> filter & collect 2+ corroborating `event_id`s -> declare compromised `sess_A` -> execute surgical `revoke_session` -> run dual recovery checks -> inspect debrief.
- **Typography Roles (`D02`):**
  - UI & Body: System/Inter sans-serif (`14px` table/body, `12px` metadata labels, line-height `1.45`).
  - Telemetry Identifiers (`event_id`, `session_handle`, `correlation_id`, `resource_id`, timestamps): Monospace (`JetBrains Mono` / `ui-monospace`, `13px`, `font-variant-numeric: tabular-nums`) so IDs and timestamps align vertically in tables.
- **Color Roles & Contrast (`D04`):**
  - High-contrast operational dark slate surface (`#0B0F17` canvas, `#111827` elevated panels, `#1F2937` structural hairline borders) with WCAG 2.2 AA verified foreground text (`#F9FAFB` primary, `#9CA3AF` secondary).
  - Semantic status encodings always pair color with an explicit text badge and icon glyph (never color-only): `allowed` (info/neutral), `denied` (amber/danger depending on context), `fallback_used` (explicit `[FALLBACK]` badge), `contained_but_disrupted` (warning banner).
- **Responsive & Accessibility Contract (`D10`, WCAG 2.2 AA):**
  - Tested at `1440px` (primary desktop SOC 3-column split: Feed | Drawer/Basket | Controls), `768px` (stacked workspace with tabbed Drawer/Controls), and `390px`/`320px` (scrollable framed table + persistent Evidence Basket bar).
  - Full keyboard traversal (`Tab`, `Enter`/`Space` to toggle evidence selection, `Escape` to close drawer/confirmation modal), visible focus rings, and `prefers-reduced-motion: reduce` respected.

## Constraints and non-goals
- Never compute scores, outcomes, or access decisions in React; all truth comes from Saad's `apps/control-api/`.
- Never fabricate attack animations unsupported by target telemetry.
- Build against static mock fixtures first so frontend progress is never blocked by backend implementation.

## Consequential decisions and reasons
- **Single-Page 7-State Workspace over 7 Disconnected Routes:** Keeps the live SSE connection, Evidence Basket state, and scenario clock persistent while the analyst transitions from monitoring to containment and verification.
- **Fixture-First Adapter Layer (`apps/web/src/api/`):** A toggleable client (`VITE_USE_MOCKS=true|false`) lets `apps/web/` run 100% standalone on Day 1–2 and switch to live `apps/control-api/` endpoints on Day 3.

## Assumptions/unknowns
- Assumes `apps/control-api/` exposes CORS or Vite dev proxy on `/api/runs/*`.

## Next increment
- **Increment A1 (PLAN -> IMPLEMENT):** Scaffold `apps/web/` (React + TS + Vite), create typed static fixtures matching `contracts/`, and implement the 7-state SOC workspace shell with Lobby, Filterable Event Feed, and Evidence Basket.

## Verification commands, interaction checks and required independent review
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- `npx playwright test` (once `tests/e2e/` is scaffolded)
- Keyboard-only walkthrough of the 7 states and SSE disconnect/reconnect simulation.
- Independent evaluation via `harness-evaluate` (`context/evaluations/ahnaf-lead-ux.eval.md`).

## Evidence locations
- `Ahnaf.md`
- `07_OWNER_D_DEFENDER_UX_QA_DEMO.md`
- `context/AHNAF_CONTEXT.md`
