# Sentinel Loop — Foundation Package

**Prepared 22 October 2026** | Four-owner engineering baseline | Competition MVP

## Current continuation — 24 October 2026

The live two-scenario product and beginner learning features are implemented. The foundation checklist below is historical; do not restart Stage 0. Read the [current beginner handoff](docs/product/BEGINNER_LEARNING_HANDOFF.md), [accepted delivery plan](docs/product/BEGINNER_LEARNING_PLAN.md) and [live owner index](context/INDEX.md) for verified results, active checks and remaining measured AI gates. The user chose to leave the pilot kit ready for future sessions; no participant results exist.

At every session entry, run:

```
python3 scripts/harness_sync.py status
python3 scripts/harness_sync.py takeover --task master-integration
harness context resume /home/ahnaf-zakaria/Downloads/Cydeline --task master-integration
```

Inspect actual source and preserve the existing working changes. Follow `AGENTS.md`; checkpoint milestones through `scripts/harness_sync.py update`. Current accepted contract amendments supersede conflicting foundation scope and next actions below.

## What is included (ordered for sequential reading)

1. **`01_PRODUCT_REQUIREMENTS_DOCUMENT.md`** — authoritative PRD with goals, user stories, P0/P1 scope, scenario, 4-owner assignments, architecture, contracts, data schema, scoring, safety, tests, milestones, release criteria and open decisions. **Read this first.**
2. **`02_MASTER_BUILD_PROMPT.md`** — paste into an AI coding assistant at the root of the repo. It tells the assistant how to inspect the project, respect ownership, freeze contracts, implement safely, test and report progress. **This is not the attacker model prompt.**
3. **`03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`** — optional starter policy for the actual small quantized model, strictly limited to the fictional range and enumerated actions.
4. **`04_OWNER_A_CYBER_RANGE.md`** — Workstream 01 (Owner A): Cyber Range & Target Infrastructure (`apps/target-api/`, `infra/range/`).
5. **`05_OWNER_B_LOCAL_AI_RED_TEAM.md`** — Workstream 02 (Owner B): Local AI Red-Team Engine (`services/red-agent/`).
6. **`06_OWNER_C_CONTROL_SCORING.md`** — Workstream 03 (Owner C): Trusted Control Plane, Incident Engine & Scoring (`apps/control-api/`, `contracts/`, `scenarios/`).
7. **`07_OWNER_D_DEFENDER_UX_QA_DEMO.md`** — Workstream 04 (Owner D): Defender Experience, End-to-End QA & Competition Demo (`apps/web/`, `tests/e2e/`, `docs/demo/`).

## Team Member Handover Files (3-Person Parallel Split)

- **`Ahnaf.md`** — Project Lead, Product Overseer, Defender Command Center UX (`apps/web/`), E2E QA (`tests/e2e/`), and the 3-Minute Competition Demo (`docs/demo/`).
- **`Tanvir.md`** — Local AI Red-Team Engine (`services/red-agent/`, `tests/agent/`, `docs/model-card/`).
- **`Saad.md`** — Virtual Company Cyber Range (`apps/target-api/`, `infra/range/`) + Trusted Control Plane, Referee & 100-Point Scoring (`apps/control-api/`, `contracts/`, `scenarios/`).
- **`Takeover.md`** — Copy-paste AI prompts for Ahnaf, Tanvir, and Saad + Emergency Mid-Flight Segment Takeover Protocol.

## Original foundation checklist (historical)

1. Share the PRD with all four owners and review the **Open decisions** section together.
2. Verify the official competition challenge and submission rules; the PRD deliberately does not invent a challenge ID.
3. Record the actual machine's CPU/RAM/GPU/VRAM and confirm whether a dedicated disposable VM is available.
4. Create the monorepo and place the PRD at `docs/product/PRD.md` and master prompt at `docs/prompts/MASTER_BUILD_PROMPT.md`.
5. Run the coding agent with the master prompt, but request **Stage 0 only**. Do not ask it to generate the whole app in one shot.
6. Freeze the enums, event schema, action schema, target adapter and browser API before four parallel implementations diverge.
7. Build the first proof: **local model proposal → validated target request → target audit event**.
8. Then prove **session revocation → denied follow-up → unaffected legitimate access succeeds**.

## Original foundation scope (see accepted amendments for current scope)

One local quantized model, three sequential logical roles, one fictional target, one human defender, one reviewed scenario. Real within-sandbox HTTP and authorization changes; no unrestricted offensive tooling or external targets. The trusted control plane is never an attack target.

## Grounded status

The original foundation documents are design input. Current implementation and evidence live in the handoff and context files linked above. Benchmarks, safety, model quality, user outcomes and competition fit require the relevant recorded checks; participant learning results remain unobserved.

## Existing companion documents

The working project also contains `Sentinel_Loop_v2_Adversarial_Cyber_Range_Blueprint.md` and `Sentinel_Loop_4_Workstreams/` owner handoffs. This package consolidates the current implementation baseline; retain the prior files as reference material.
