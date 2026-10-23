#!/usr/bin/env python3
"""
Sentinel Loop — Real-Time Multi-Person Harness Context & Takeover Engine.

Bridges the local `harness` CLI (`harness context` / `harness check` / `harness catalog`)
with git-tracked per-person context files (`context/AHNAF_CONTEXT.md`,
`context/TANVIR_CONTEXT.md`, `context/SAAD_CONTEXT.md`, `context/MASTER_INTEGRATION_CONTEXT.md`,
and `context/INDEX.md`) so any teammate or AI coding agent can hand off or take over
any segment at any moment without needing prior chat history.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent


def resolve_harness_bin() -> Path:
    override = os.environ.get("HARNESS_BIN")
    if override:
        return Path(override).expanduser()
    found = shutil.which("harness")
    if found:
        return Path(found)
    return Path.home() / ".local" / "bin" / "harness"


HARNESS_BIN = resolve_harness_bin()

TASKS: dict[str, dict[str, Any]] = {
    "master-integration": {
        "owner": "Ahnaf (Lead Overseer) + Tanvir + Saad",
        "person_file": "MASTER_INTEGRATION_CONTEXT.md",
        "brief_doc": "01_PRODUCT_REQUIREMENTS_DOCUMENT.md",
        "contract_path": "context/contracts/master-integration.contract.md",
        "eval_path": "context/evaluations/master-integration.eval.md",
        "owned_dirs": ["contracts", "scenarios", "apps", "services", "infra", "tests", "docs"],
        "lifecycle": {
            "plan": [
                "Stage 0: Repo & hardware audit, order docs 00-07, create Ahnaf/Tanvir/Saad handoffs",
                "Stage 0: Establish Task Contracts (context/contracts/*.contract.md) and Evaluation ledgers (context/evaluations/*.eval.md)",
                "Gate G0: Freeze canonical enums (RunState, Outcome, Mode, AttackerAction, DefenderAction, Verification) and JSON schemas",
            ],
            "implement": [
                "Stage 1 (SL-001): Create monorepo skeleton, contracts/, scenarios/stolen-session/v1/, and static mocks",
                "Stage 2-3 (G1 / SL-002, SL-003, SL-007): Connect Tanvir's red-agent proposal -> Saad's control-api -> Saad's target-api -> correlated audit event",
                "Stage 4 (G2 / SL-004, SL-006, SL-008): Verify sess_A works pre-revocation, fails post-revocation, and Eli's benign workflow passes",
                "Stage 5 (G3 / SL-005, SL-009): Connect Ahnaf's 7-state SOC UI to Saad's live SSE + REST endpoints for full P0 loop",
                "Stage 6 (G4 / SL-010, SL-011): Implement 100-point deterministic rubric, outcome gates, and read-only replay",
            ],
            "evaluate": [
                "Stage 7 (G5): First-time learner walkthrough, keyboard accessibility, and responsive viewport verification (320/390/768/1440px)",
                "Stage 7 (G6 / SL-012): 10 consecutive clean resets (AT-08), 0 out-of-policy model actions (T-01), prompt-injection rejection (T-03), cross-run isolation (T-11), and egress block (T-02)",
                "Release (SL-015): Pin digests/hashes and record uncut 3-minute chronological demo with honest fallback provenance",
            ],
        },
        "default_packet": {
            "phase": "PLAN",
            "goal": "Deliver and verify the end-to-end Sentinel Loop Competition MVP across Ahnaf (UX/Lead), Tanvir (Local AI Red-Team), and Saad (Target Range & Control Plane) through Gates G0-G6.",
            "acceptance": [
                "Gate G0: Canonical enums, Pydantic/JSON schemas, and mock fixtures frozen in contracts/",
                "Gate G1: Validated local model action reaches isolated target-api and emits correlated target audit event",
                "Gate G2: Compromised sess_A allowed before revoke_session and denied after; eli@northstar.test benign workflow passes",
                "Gate G3: Full browser defensive loop (start -> monitor -> investigate -> declare -> contain -> verify -> debrief -> replay -> reset) runs end-to-end",
                "Gate G4-G6: 100-pt deterministic rubric, read-only replay (AT-07), 10x clean reset (AT-08), and 0 out-of-policy model actions (T-01)",
            ],
            "architecture": [
                "01_PRODUCT_REQUIREMENTS_DOCUMENT.md",
                "02_MASTER_BUILD_PROMPT.md",
                "AGENTS.md",
                "Agent_Instructions/SKILL.md",
                "context/contracts/master-integration.contract.md",
            ],
            "decisions": [
                "Split execution into 3 parallel segments: ahnaf-lead-ux (Ahnaf), tanvir-red-agent (Tanvir), and saad-range-control (Saad)",
                "Combine Workstream A (target-api) and Workstream C (control-api + contracts) under Saad to eliminate backend-to-backend handoff friction",
                "Maintain dual-layer context (native harness context checkpoint + git-tracked context/*.md via scripts/harness_sync.py) for zero-context-loss takeover",
            ],
            "completed": [
                "Reorganized foundation and workstream markdowns into sequential order 00 to 07",
                "Created Ahnaf.md, Tanvir.md, and Saad.md parallel segment handover specifications",
                "Enrolled repository in harness (project_id: 31fd9903-57c9-4f5f-9344-96cef387c8f6) and created Plan/Implement/Evaluate contracts",
            ],
            "remaining": [
                "Execute Stage 1 (SL-001): Create monorepo directory skeleton, contracts/ schemas, and scenarios/stolen-session/v1/",
                "Pass Gate G1: First live model proposal -> control-api -> target-api -> audit event",
                "Pass Gate G2: Real session revocation + Eli continuity verification probe",
                "Pass Gate G3: Wire apps/web/ to live control-api SSE and REST endpoints",
                "Pass Gates G4-G6: 100-pt rubric, read-only replay, 30-trial AI benchmark, 10x reset test, and 3-minute demo",
            ],
            "blockers": [],
            "uncertainties": [
                "Demo hardware CPU/RAM/GPU/VRAM and measured Ollama Qwen3-1.7B Q4 cold/warm latency must be recorded during Increment B1",
                "Official competition challenge track ID and submission deadline format to be confirmed by Product Lead (Ahnaf)",
            ],
            "next_step": "Execute Stage 1 (SL-001): Scaffold contracts/ and scenarios/stolen-session/v1/ with canonical enums, Pydantic schemas, and static mock fixtures to pass Gate G0.",
            "evidence": [
                "00_READ_ME_FIRST.md",
                "01_PRODUCT_REQUIREMENTS_DOCUMENT.md",
                "02_MASTER_BUILD_PROMPT.md",
                "context/contracts/master-integration.contract.md",
                "context/evaluations/master-integration.eval.md",
            ],
        },
    },
    "ahnaf-lead-ux": {
        "owner": "Ahnaf (Team Lead, Overseer & Defender Command Center UX)",
        "person_file": "AHNAF_CONTEXT.md",
        "brief_doc": "Ahnaf.md",
        "contract_path": "context/contracts/ahnaf-lead-ux.contract.md",
        "eval_path": "context/evaluations/ahnaf-lead-ux.eval.md",
        "owned_dirs": ["apps/web", "tests/e2e", "docs/demo"],
        "lifecycle": {
            "plan": [
                "Lock shared API endpoints (/api/runs/*), SSE event envelope, and error format with Saad and Tanvir (Gate G0)",
                "Establish UI/UX Visual Contract (Product / operational + Technical / industrial style grammar, WCAG 2.2 AA contrast, tabular-nums monospace IDs, ASYNC-01, LIVE-01, SAFE-01, SAFE-02, TABLE-01, AI-01)",
                "Define the 7 single-page workspace states: (1) Lobby Briefing, (2) Live SOC Feed + Filters, (3) Investigation Drawer + Evidence Basket, (4) Incident Declaration, (5) Containment Console, (6) Dual Recovery Verification, (7) 100-Pt Debrief + Read-Only Replay",
            ],
            "implement": [
                "Increment A1 (SL-005): Scaffold apps/web/ (React + TypeScript + Vite) with static mock fixtures and implement States 1-3 (Lobby, Filterable SSE Feed, Detail Drawer, Evidence Basket)",
                "Increment A2 (SL-005/SL-009): Implement States 4-6 (Incident Declaration form, Containment Console with blast-radius warnings + idempotency keys, and Dual Recovery Verification view)",
                "Increment A3 (SL-009/SL-011): Implement State 7 (100-Point Debrief scorecard with clickable event_ids + fallback_used provenance badges + Read-Only Replay) and wire VITE_USE_MOCKS=false to Saad's live apps/control-api/",
                "Increment A4 (SL-011/SL-015): Write Playwright E2E full-loop test in tests/e2e/ and record the 3-minute uncut demo in docs/demo/",
            ],
            "evaluate": [
                "Verify LIVE-01: SSE disconnect/reconnect restores ordered events via Last-Event-ID without duplicates or lost Evidence Basket state",
                "Verify SAFE-01/SAFE-02: Disruptive containment shows confirmation with Cancel default focus; duplicate clicks send identical idempotency_key; UI never claims success before server confirmation",
                "Verify Responsive & Accessibility (D10 / WCAG 2.2 AA): Inspect at 320px, 390px, 768px, and 1440px; full keyboard traversal; prefers-reduced-motion respected",
                "Run fresh independent harness-evaluate / grill-my-ui review and record verdict in context/evaluations/ahnaf-lead-ux.eval.md",
            ],
        },
        "default_packet": {
            "phase": "PLAN",
            "goal": "Oversee cross-team integration and deliver the 7-state React/TypeScript Defender Command Center (apps/web/), Playwright E2E suite (tests/e2e/), and 3-minute competition demo (docs/demo/).",
            "acceptance": [
                "FR-D01/D02: Lobby briefing + live SSE event table with filters (user, session, source, type, outcome, time) preserving monotonic sequence and Evidence Basket selections",
                "FR-D03/D04: Event Detail Drawer + Incident Declaration submitting visible event_ids and suspected_session (sess_A)",
                "FR-D05: Containment Console distinguishing revoke_session, temporarily_disable_account, require_reauthentication, and restore_account with blast-radius warnings and idempotency keys",
                "FR-D06: Recovery Verification view requiring both verify_suspicious_session_denied and verify_benign_workflow to pass",
                "FR-D07/D08: 100-point Debrief + Read-Only Replay with fallback provenance badges, keyboard accessibility, and Playwright E2E pass",
            ],
            "architecture": [
                "Ahnaf.md",
                "07_OWNER_D_DEFENDER_UX_QA_DEMO.md",
                "context/contracts/ahnaf-lead-ux.contract.md",
                "apps/web/",
                "tests/e2e/",
                "docs/demo/",
            ],
            "decisions": [
                "Use Product/operational + Technical/industrial UI grammar with tabular-nums monospace identifiers and non-color-only status badges",
                "Build all 7 SOC states against static JSON fixtures first (Increment A1-A2) so UI work never blocks on Saad's backend",
                "Use a single-page state workspace so SSE connection and Evidence Basket persist across investigation, containment, and verification",
            ],
            "completed": [
                "Defined Ahnaf's role, deliverables, and parallel workflow in Ahnaf.md",
                "Authored complete task & visual contract in context/contracts/ahnaf-lead-ux.contract.md",
            ],
            "remaining": [
                "Increment A1: Scaffold apps/web/ (React + TS + Vite) with static mock fixtures and build Lobby, Event Feed, Detail Drawer, and Evidence Basket",
                "Increment A2: Build Incident Declaration, Containment Console (with idempotency + warnings), and Dual Recovery Verification UI",
                "Increment A3: Build 100-Pt Debrief & Read-Only Replay views and connect live API + SSE to Saad's apps/control-api/",
                "Increment A4: Add Playwright E2E test in tests/e2e/ and record 3-minute demo in docs/demo/",
            ],
            "blockers": [],
            "uncertainties": [
                "Awaiting Saad's live apps/control-api/ for Increment A3 live wiring (unblocked for Increments A1-A2 via static fixtures)",
            ],
            "next_step": "Start Increment A1: Scaffold apps/web/ (React + TypeScript + Vite), add mock fixtures matching contracts/, and implement Lobby + Filterable SOC Event Feed + Evidence Basket.",
            "evidence": [
                "Ahnaf.md",
                "07_OWNER_D_DEFENDER_UX_QA_DEMO.md",
                "context/contracts/ahnaf-lead-ux.contract.md",
                "context/evaluations/ahnaf-lead-ux.eval.md",
            ],
        },
    },
    "tanvir-red-agent": {
        "owner": "Tanvir (Local AI Red-Team Engine Owner)",
        "person_file": "TANVIR_CONTEXT.md",
        "brief_doc": "Tanvir.md",
        "contract_path": "context/contracts/tanvir-red-agent.contract.md",
        "eval_path": "context/evaluations/tanvir-red-agent.eval.md",
        "owned_dirs": ["services/red-agent", "tests/agent", "docs/model-card"],
        "lifecycle": {
            "plan": [
                "Freeze AttackerProposal JSON schema, 6 allowed AttackerAction enum values, 3 sequential logical roles (scout, access_operator, adaptation_planner), and sanitized observation input contract",
                "Review 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md and context/contracts/tanvir-red-agent.contract.md",
            ],
            "implement": [
                "Increment B1 (SL-003): Build services/red-agent/ schemas, sanitized observation builder, 2-stage validator (JSON schema + role/action/handle allowlist policy validator), and deterministic timeout fallback with fallback_used=true tagging",
                "Increment B2 (FR-B01/B02/B05): Connect Ollama client (Qwen3-1.7B Q4 candidate) with role-specific prompts for scout, access_operator, and adaptation_planner, recording model_id, prompt_hash, observation_hash, and latency_ms",
                "Increment B3 (SL-007/SL-013): Wire choose_action() and validate_action() into Saad's apps/control-api/ turn scheduler and run the 30-trial + 10-pair benchmark suite into docs/model-card/",
            ],
            "evaluate": [
                "Verify T-01 & T-03: Run validator fuzz and prompt-injection tests in tests/agent/ — require 0 accepted out-of-policy actions, unknown handles, shell strings, or URLs",
                "Verify H1 (Autonomy & Adaptation): Run 30 observation trials (target >=28/30 valid schema) and 10 paired pre/post-revocation trials (target >=8/10 meaningful adaptation or stop)",
                "Verify AT-05 (Fallback Provenance): Force model timeout and malformed JSON; verify run continues safely and logs fallback_used=true",
                "Run fresh independent harness-evaluate review and record verdict in context/evaluations/tanvir-red-agent.eval.md",
            ],
        },
        "default_packet": {
            "phase": "PLAN",
            "goal": "Deliver the bounded local AI adversary service (services/red-agent/), two-stage safety validator, and empirical benchmark suite (tests/agent/, docs/model-card/).",
            "acceptance": [
                "FR-B01/B02: Single local quantized model (Qwen3-1.7B Q4 via Ollama) operating sequentially as scout, access_operator, and adaptation_planner",
                "FR-B03/B04: Two-stage validator enforces strict JSON schema and allowlisted actions/handles (0 out-of-policy actions accepted)",
                "FR-B05: Post-revocation observation causes adaptation_planner to change action or select stop in >=8/10 paired trials",
                "FR-B06: Timeouts and invalid outputs recover cleanly via explicitly tagged deterministic fallback (fallback_used: true)",
            ],
            "architecture": [
                "Tanvir.md",
                "03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md",
                "05_OWNER_B_LOCAL_AI_RED_TEAM.md",
                "context/contracts/tanvir-red-agent.contract.md",
                "services/red-agent/",
                "tests/agent/",
                "docs/model-card/",
            ],
            "decisions": [
                "Use one shared Ollama model instance prompted sequentially across 3 logical roles rather than parallel multi-model swarm",
                "Enforce a strict two-stage validator (Pydantic/JSON schema + run-policy allowlist) independent of LLM prompt adherence",
                "Tag any timeout or invalid-output recovery with fallback_used=true so demo provenance is 100% transparent",
            ],
            "completed": [
                "Defined Tanvir's role, deliverables, and parallel workflow in Tanvir.md",
                "Frozen starter runtime prompt in 03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md and contract in context/contracts/tanvir-red-agent.contract.md",
            ],
            "remaining": [
                "Increment B1: Implement services/red-agent/ (observation builder, 2-stage validator, timeout fallback) and unit tests in tests/agent/",
                "Increment B2: Connect Ollama client (Qwen3-1.7B Q4) and measure cold/warm decision latency on demo hardware",
                "Increment B3: Execute 30-trial schema benchmark + 10-pair adaptation benchmark and document results in docs/model-card/",
            ],
            "blockers": [],
            "uncertainties": [
                "Cold/warm latency of Qwen3-1.7B Q4 on local hardware to be measured during Increment B2",
            ],
            "next_step": "Start Increment B1: Implement services/red-agent/ (schemas, observation builder, two-stage validator, and tagged fallback) + unit tests in tests/agent/.",
            "evidence": [
                "Tanvir.md",
                "03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md",
                "05_OWNER_B_LOCAL_AI_RED_TEAM.md",
                "context/contracts/tanvir-red-agent.contract.md",
                "context/evaluations/tanvir-red-agent.eval.md",
            ],
        },
    },
    "saad-range-control": {
        "owner": "Saad (Virtual Company Cyber Range & Trusted Control Plane Owner)",
        "person_file": "SAAD_CONTEXT.md",
        "brief_doc": "Saad.md",
        "contract_path": "context/contracts/saad-range-control.contract.md",
        "eval_path": "context/evaluations/saad-range-control.eval.md",
        "owned_dirs": [
            "contracts",
            "scenarios",
            "apps/target-api",
            "infra/range",
            "apps/control-api",
            "tests/target",
            "tests/control",
            "tests/isolation",
        ],
        "lifecycle": {
            "plan": [
                "Define canonical enums, EventEnvelope, AttackerProposal, TargetAdapter interface (7 methods), and 11 Browser API endpoints in contracts/",
                "Define Northstar Analytics scenario v1 fixtures (maya@northstar.test, eli@northstar.test, sess_A, doc_finance_07) and 100-point rubric bands in scenarios/stolen-session/v1/",
            ],
            "implement": [
                "Increment S1 (SL-001): Build contracts/ (enums, Pydantic/JSON schemas, static mock payloads for Ahnaf & Tanvir) and scenarios/stolen-session/v1/",
                "Increment S2 (SL-002, SL-006 — Workstream A): Build apps/target-api/ (Northstar FastAPI + SQLite, session/document routes, revoke_session, temporarily_disable_account, require_reauthentication, restore_account, Eli benign probe, target audit log, and deterministic reset) + tests/target/",
                "Increment S3 (SL-004, SL-007, SL-008 — Workstream C): Build apps/control-api/ (SQLite WAL 9 tables, monotonic sequence, SSE /stream with Last-Event-ID backfill, /declare validation, per-run locked idempotent /defender-actions, /verify dual probes) + tests/control/",
                "Increment S4 (SL-010, SL-012): Implement deterministic 100-point rubric + outcome gates, read-only /replay, compose.yaml isolation config, and tests/isolation/",
            ],
            "evaluate": [
                "Verify AT-01, AT-02, AT-03, AT-08: Compromised sess_A succeeds before revocation and is denied after; Eli benign probe passes; broad disable triggers contained_but_disrupted; 10 consecutive resets leave zero stale sessions",
                "Verify AT-04, AT-06, AT-07, AT-09, T-07, T-11: Model text alone cannot trigger attacker_objective_reached; cross-run or hidden evidence IDs rejected; /replay causes zero target/model calls; duplicate idempotency_key deduplicated; virtual scenario clock excludes inference delay",
                "Run fresh independent harness-evaluate review and record verdict in context/evaluations/saad-range-control.eval.md",
            ],
        },
        "default_packet": {
            "phase": "PLAN",
            "goal": "Deliver canonical contracts (contracts/, scenarios/), the isolated Northstar Analytics target range (apps/target-api/, infra/range/), and the trusted control plane with SSE, verification, 100-pt scoring, and replay (apps/control-api/).",
            "acceptance": [
                "SL-001: Canonical enums, schemas, and scenario v1 fixtures published in contracts/ and scenarios/stolen-session/v1/",
                "FR-A01-A06: apps/target-api/ enforces real session/account state for sess_A and doc_finance_07, passes Eli benign probe, emits audit logs, and passes 10 consecutive clean resets",
                "FR-C01-C06: apps/control-api/ persists 9 SQLite WAL tables, streams SSE with Last-Event-ID backfill, validates declarations, and serializes idempotent defender commands",
                "FR-C07-C09: Deterministic 100-point rubric + outcome gates and side-effect-free read-only /replay",
            ],
            "architecture": [
                "Saad.md",
                "04_OWNER_A_CYBER_RANGE.md",
                "06_OWNER_C_CONTROL_SCORING.md",
                "context/contracts/saad-range-control.contract.md",
                "contracts/",
                "scenarios/stolen-session/v1/",
                "apps/target-api/",
                "apps/control-api/",
            ],
            "decisions": [
                "Consolidate Workstream A (target-api) and Workstream C (control-api + contracts) under Saad for unified FastAPI + SQLite backend execution",
                "Implement TargetAdapter protocol supporting both direct in-process testing and isolated container HTTP transport",
                "Use SQLite WAL mode with per-run lock serialization so containment commits before the next attacker request is dispatched (T-07)",
            ],
            "completed": [
                "Defined Saad's role, deliverables, and parallel workflow in Saad.md",
                "Authored complete backend task contract in context/contracts/saad-range-control.contract.md",
            ],
            "remaining": [
                "Increment S1 (SL-001): Create contracts/ (canonical enums, schemas, mock fixtures) and scenarios/stolen-session/v1/",
                "Increment S2 (SL-002, SL-006): Build apps/target-api/ and tests/target/ (including 10x clean reset test)",
                "Increment S3 (SL-004, SL-008): Build apps/control-api/ (SQLite store, SSE stream, declaration, idempotent actions, dual verification) and tests/control/",
                "Increment S4 (SL-010, SL-012): Implement 100-point rubric, outcome gates, read-only /replay, and tests/isolation/",
            ],
            "blockers": [],
            "uncertainties": [
                "Confirm whether demo host uses rootless Docker compose internal network or dedicated disposable VM for infra/range/",
            ],
            "next_step": "Start Increment S1 (SL-001): Create contracts/ and scenarios/stolen-session/v1/ with canonical enums, Pydantic models, and static mock fixtures.",
            "evidence": [
                "Saad.md",
                "04_OWNER_A_CYBER_RANGE.md",
                "06_OWNER_C_CONTROL_SCORING.md",
                "context/contracts/saad-range-control.contract.md",
                "context/evaluations/saad-range-control.eval.md",
            ],
        },
    },
}


def run_harness(*args: str) -> dict[str, Any]:
    cmd = [str(HARNESS_BIN), *args]
    try:
        proc = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True)
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"harness CLI not found at {HARNESS_BIN}. Install it or set HARNESS_BIN to its path."
        ) from exc
    if proc.returncode != 0:
        raise RuntimeError(f"Command {' '.join(cmd)} failed: {proc.stderr.strip() or proc.stdout.strip()}")
    return json.loads(proc.stdout)


def get_git_dirty_files() -> list[str]:
    proc = subprocess.run(
        ["git", "-C", str(REPO_ROOT), "status", "--porcelain", "--untracked-files=normal"],
        capture_output=True,
        text=True,
    )
    lines = [line.strip() for line in proc.stdout.splitlines() if line.strip()]
    return lines


def packet_file(task: str) -> Path:
    return REPO_ROOT / "context" / "packets" / f"{task}.json"


def write_task_files(task: str, packet_data: dict[str, Any]) -> dict[str, Any]:
    pfile = packet_file(task)
    pfile.parent.mkdir(parents=True, exist_ok=True)
    mirror = {
        "task": task,
        "phase": packet_data.get("phase", "PLAN"),
        "goal": packet_data["goal"],
        "acceptance": packet_data["acceptance"],
        "architecture": packet_data["architecture"],
        "decisions": packet_data["decisions"],
        "completed": packet_data["completed"],
        "remaining": packet_data["remaining"],
        "blockers": packet_data["blockers"],
        "uncertainties": packet_data["uncertainties"],
        "next_step": packet_data["next_step"],
        "evidence": packet_data["evidence"],
    }
    pfile.write_text(json.dumps(mirror, indent=2, ensure_ascii=False) + "\n")
    meta = TASKS[task]
    (REPO_ROOT / "context" / meta["person_file"]).write_text(
        render_person_context_md(task, meta, mirror)
    )
    return mirror


def checkpoint_task_in_harness(task: str) -> dict[str, Any]:
    pfile = packet_file(task)
    resumed = run_harness("context", "resume", str(REPO_ROOT))
    existing_tasks = resumed.get("tasks", [])
    expected_rev: int | None = None
    if task in existing_tasks:
        current = run_harness("context", "resume", str(REPO_ROOT), "--task", task)
        expected_rev = current.get("packet_revision", 0)

    cmd = ["context", "checkpoint", str(REPO_ROOT), "--task", task, "--input", str(pfile)]
    if expected_rev is not None:
        cmd.extend(["--expected-revision", str(expected_rev)])
    return run_harness(*cmd)


def render_person_context_md(task: str, meta: dict[str, Any], packet: dict[str, Any]) -> str:
    phase = packet.get("phase", "PLAN")

    def fmt_list(items: list[str], checkbox: str | None = None) -> str:
        if not items:
            return "- _None recorded_\n"
        prefix = f"- [{checkbox}] " if checkbox is not None else "- "
        return "".join(f"{prefix}{item}\n" for item in items)

    lifecycle = meta["lifecycle"]
    owned_dirs = ", ".join(f"`{d}/`" for d in meta["owned_dirs"])

    return f"""<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py — DO NOT DELETE SECTIONS -->
# Live Context & Instant Takeover Packet: `{task}`

| Field | Value |
|---|---|
| **Segment / Task ID** | `{task}` |
| **Assigned Owner** | {meta["owner"]} |
| **Active Lifecycle Phase** | **`{phase}`** (`PLAN` → `IMPLEMENT` → `EVALUATE`) |
| **Primary Handover Spec** | `{meta["brief_doc"]}` |
| **Task Contract (`harness-plan`)** | `{meta["contract_path"]}` |
| **Evaluation Record (`harness-evaluate`)** | `{meta["eval_path"]}` |
| **Checkpoint JSON Mirror** | `context/packets/{task}.json` (mirrored to `.harness/contexts/{task}.json`) |
| **Owned Directories** | {owned_dirs} |

---

## 1. Instant Takeover Protocol (For Ahnaf or Any AI Agent)

If the current owner is blocked, offline, or switching AI sessions, run these **3 commands** to take over this segment with 100% context in under 5 seconds:

```bash
# 1. Reconcile harness checkpoint with current git tree & verification status
python3 scripts/harness_sync.py takeover --task {task}

# 2. Native harness resume for this task packet
harness context resume . --task {task}

# 3. Run project-native verification checks
harness check run .
```

---

## 2. Current Objective & Immediate Next Action

- **Goal:** {packet["goal"]}
- **IMMEDIATE NEXT STEP (`next_step`):**
  > **{packet["next_step"]}**

---

## 3. Real-Time Execution Progress

### Completed Work (`completed`)
{fmt_list(packet["completed"], checkbox="x")}
### Remaining Work (`remaining`)
{fmt_list(packet["remaining"], checkbox=" ")}
### Active Blockers (`blockers`)
{fmt_list(packet["blockers"])}
### Open Uncertainties / Assumptions (`uncertainties`)
{fmt_list(packet["uncertainties"])}

---

## 4. Full Harness Lifecycle Plan (`Plan` → `Implement` → `Evaluate`)

### Phase A — `harness-plan` (Architecture, Contracts & Decisions)
{fmt_list(lifecycle["plan"])}
### Phase B — `harness-implement` (Bounded Vertical Increments)
{fmt_list(lifecycle["implement"])}
### Phase C — `harness-evaluate` (Independent Verification & Release Gates)
{fmt_list(lifecycle["evaluate"])}

---

## 5. Accepted Task Contract Summary & Key Decisions

### Observable Acceptance Criteria (`acceptance`)
{fmt_list(packet["acceptance"])}
### Consequential Decisions (`decisions`)
{fmt_list(packet["decisions"])}
### Architecture Entry Points (`architecture`)
{fmt_list(packet["architecture"])}
### Verified Evidence Files (`evidence`)
{fmt_list(packet["evidence"])}

---

## 6. How to Update This Context in Real Time After Any Edit

Whenever you complete an increment, hit a blocker, or finish an evaluation on `{task}`, run:

```bash
python3 scripts/harness_sync.py update \\
  --task {task} \\
  --phase IMPLEMENT \\
  --complete "Describe the completed increment and test run" \\
  --next-step "Describe the exact next atomic task"
```

This single command atomically updates `.harness/contexts/{task}.json`, `context.md`, `context/packets/{task}.json`, `context/{meta["person_file"]}`, and `context/INDEX.md`.
"""


def render_index_md(all_packets: dict[str, dict[str, Any]]) -> str:
    rows = []
    for task_id, meta in TASKS.items():
        pkt = all_packets[task_id]
        blocker_count = len(pkt.get("blockers", []))
        blocker_str = "NONE" if blocker_count == 0 else f"{blocker_count} BLOCKER(S)"
        rows.append(
            f"| `{task_id}` | {meta['owner']} | **`{pkt.get('phase', 'PLAN')}`** | "
            f"`context/{meta['person_file']}` | {blocker_str} | {pkt.get('next_step', '')} |"
        )
    table_body = "\n".join(rows)

    return f"""<!-- AUTO-SYNCHRONIZED BY scripts/harness_sync.py -->
# Sentinel Loop — Real-Time Harness Context & Instant Takeover Index

This directory (`context/`) is synchronized with the local `harness` engine (`.harness/contexts/*.json` and root `context.md`). It guarantees that **Ahnaf**, **Tanvir**, **Saad**, or any AI coding assistant (Cursor, Codex, Claude Code, Antigravity) can take over any segment at any moment without needing prior conversation history.

---

## Live Segment Status Matrix

| Task ID | Segment Owner | Lifecycle Phase | Context File | Blockers | Immediate Next Step |
|---|---|---|---|---|---|
{table_body}

---

## 3-Command Takeover Cheat Sheet (Any Person / Any Agent)

### Take over Ahnaf's Segment (Lead, Overseer & Defender SOC UX)
```bash
python3 scripts/harness_sync.py takeover --task ahnaf-lead-ux
```
- **Context File:** `context/AHNAF_CONTEXT.md`
- **Task & Visual Contract:** `context/contracts/ahnaf-lead-ux.contract.md`
- **Evaluation Record:** `context/evaluations/ahnaf-lead-ux.eval.md`

### Take over Tanvir's Segment (Local AI Red-Team Engine)
```bash
python3 scripts/harness_sync.py takeover --task tanvir-red-agent
```
- **Context File:** `context/TANVIR_CONTEXT.md`
- **Task Contract:** `context/contracts/tanvir-red-agent.contract.md`
- **Evaluation Record:** `context/evaluations/tanvir-red-agent.eval.md`

### Take over Saad's Segment (Virtual Company Cyber Range & Control Plane)
```bash
python3 scripts/harness_sync.py takeover --task saad-range-control
```
- **Context File:** `context/SAAD_CONTEXT.md`
- **Task Contract:** `context/contracts/saad-range-control.contract.md`
- **Evaluation Record:** `context/evaluations/saad-range-control.eval.md`

### Take over Master Cross-Team Integration
```bash
python3 scripts/harness_sync.py takeover --task master-integration
```
- **Context File:** `context/MASTER_INTEGRATION_CONTEXT.md`
- **Task Contract:** `context/contracts/master-integration.contract.md`
- **Evaluation Record:** `context/evaluations/master-integration.eval.md`

---

## Real-Time Context Update Command (Run at Every Milestone / Handoff)

```bash
python3 scripts/harness_sync.py update \\
  --task <ahnaf-lead-ux|tanvir-red-agent|saad-range-control|master-integration> \\
  --phase <PLAN|IMPLEMENT|EVALUATE> \\
  --complete "What was just implemented and verified" \\
  --next-step "The next atomic increment to execute"
```
"""


def cmd_bootstrap() -> int:
    run_harness("context", "enroll", str(REPO_ROOT))
    all_packets: dict[str, dict[str, Any]] = {}
    for task_id, meta in TASKS.items():
        pfile = packet_file(task_id)
        if pfile.exists():
            data = json.loads(pfile.read_text())
        else:
            data = dict(meta["default_packet"])
        all_packets[task_id] = write_task_files(task_id, data)

    index_path = REPO_ROOT / "context" / "INDEX.md"
    index_path.write_text(render_index_md(all_packets))

    # Now that all context/*.md and context/packets/*.json are written on disk,
    # checkpoint all tasks in harness so their recorded snapshot matches disk!
    for task_id in TASKS:
        checkpoint_task_in_harness(task_id)

    print(json.dumps({"status": "bootstrapped", "tasks": list(all_packets.keys())}, indent=2))
    return 0


def cmd_update(args: argparse.Namespace) -> int:
    task_id = args.task
    if task_id not in TASKS:
        raise ValueError(f"Unknown task {task_id}. Must be one of {list(TASKS.keys())}")

    pfile = packet_file(task_id)
    if not pfile.exists():
        cmd_bootstrap()
    data = json.loads(pfile.read_text())

    if args.phase:
        data["phase"] = args.phase
    if args.goal:
        data["goal"] = args.goal
    if args.next_step:
        data["next_step"] = args.next_step
    for item in args.complete or []:
        if item not in data["completed"]:
            data["completed"].append(item)
        if item in data["remaining"]:
            data["remaining"].remove(item)
    for item in args.add_remaining or []:
        if item not in data["remaining"]:
            data["remaining"].append(item)
    for item in args.remove_remaining or []:
        if item in data["remaining"]:
            data["remaining"].remove(item)
    if args.clear_blockers:
        data["blockers"] = []
    for item in args.add_blocker or []:
        if item not in data["blockers"]:
            data["blockers"].append(item)
    for item in args.add_decision or []:
        if item not in data["decisions"]:
            data["decisions"].append(item)
    for item in args.add_evidence or []:
        if item not in data["evidence"]:
            data["evidence"].append(item)

    mirror = write_task_files(task_id, data)
    meta = TASKS[task_id]

    # Re-render INDEX.md with all current packets before checkpointing
    all_packets: dict[str, dict[str, Any]] = {}
    for tid, tmeta in TASKS.items():
        pf = packet_file(tid)
        all_packets[tid] = json.loads(pf.read_text()) if pf.exists() else tmeta["default_packet"]
    (REPO_ROOT / "context" / "INDEX.md").write_text(render_index_md(all_packets))

    # Checkpoint all tasks so their recorded snapshot reflects the updated files
    res = {}
    for tid in TASKS:
        chk = checkpoint_task_in_harness(tid)
        if tid == task_id:
            res = chk

    print(
        json.dumps(
            {
                "status": "updated",
                "task": task_id,
                "revision": res.get("revision"),
                "phase": mirror["phase"],
                "next_step": mirror["next_step"],
                "context_markdown": f"context/{meta['person_file']}",
            },
            indent=2,
        )
    )
    return 0


def cmd_takeover(args: argparse.Namespace) -> int:
    task_id = args.task
    if task_id not in TASKS:
        raise ValueError(f"Unknown task {task_id}")
    meta = TASKS[task_id]
    resumed = run_harness("context", "resume", str(REPO_ROOT), "--task", task_id)
    pfile = packet_file(task_id)
    mirror = json.loads(pfile.read_text()) if pfile.exists() else {}

    dirty = get_git_dirty_files()
    owned_dirty = [
        line
        for line in dirty
        if any(d in line for d in meta["owned_dirs"] + [meta["person_file"], meta["contract_path"], meta["eval_path"]])
    ]

    report = {
        "takeover_target": task_id,
        "assigned_owner": meta["owner"],
        "lifecycle_phase": mirror.get("phase", "PLAN"),
        "packet_revision": resumed.get("packet_revision"),
        "stale_since_checkpoint": resumed.get("stale"),
        "verification_status": resumed.get("verification_status"),
        "warnings": resumed.get("warnings", []),
        "goal": resumed.get("goal"),
        "immediate_next_step": resumed.get("next_step"),
        "completed_count": len(resumed.get("completed", [])),
        "remaining": resumed.get("remaining", []),
        "blockers": resumed.get("blockers", []),
        "uncertainties": resumed.get("uncertainties", []),
        "owned_working_tree_changes": owned_dirty,
        "files_to_read_now": [
            f"context/{meta['person_file']}",
            meta["contract_path"],
            meta["eval_path"],
            meta["brief_doc"],
        ],
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


def cmd_status() -> int:
    summary = {}
    for task_id, meta in TASKS.items():
        resumed = run_harness("context", "resume", str(REPO_ROOT), "--task", task_id)
        pfile = packet_file(task_id)
        mirror = json.loads(pfile.read_text()) if pfile.exists() else {}
        summary[task_id] = {
            "owner": meta["owner"],
            "phase": mirror.get("phase", "PLAN"),
            "revision": resumed.get("packet_revision"),
            "stale": resumed.get("stale"),
            "completed": len(resumed.get("completed", [])),
            "remaining": len(resumed.get("remaining", [])),
            "blockers": resumed.get("blockers", []),
            "next_step": resumed.get("next_step"),
        }
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


def cmd_verify() -> int:
    errors: list[str] = []

    # 1. Check harness enrollment
    proj_json = REPO_ROOT / ".harness" / "project.json"
    if not proj_json.is_file():
        errors.append("Missing .harness/project.json (run `harness context enroll`)")

    # 2. Check all 4 tasks exist in harness and in context/packets/ + context/*.md
    resumed_index = run_harness("context", "resume", str(REPO_ROOT))
    enrolled_tasks = set(resumed_index.get("tasks", []))

    required_contract_headings = [
        "Audience and outcome",
        "Current source identity",
        "Acceptance examples (observable)",
        "Constraints and non-goals",
        "Consequential decisions and reasons",
        "Assumptions/unknowns",
        "Next increment",
        "Verification commands, interaction checks and required independent review",
        "Evidence locations",
    ]
    required_eval_fields = [
        "Verdict:",
        "Evaluated source identity and time:",
        "Accepted task contract:",
        "Independent evaluator / independence limitations:",
        "Acceptance evidence",
        "Findings: severity, location, trigger, actual behavior, expected behavior",
        "Checks, browser observations and artifacts",
        "Unverified criteria and environment limits",
        "Next action (fixes return to Implement)",
    ]

    for task_id, meta in TASKS.items():
        if task_id not in enrolled_tasks:
            errors.append(f"Task `{task_id}` is not registered in harness context")
        pfile = packet_file(task_id)
        if not pfile.is_file():
            errors.append(f"Missing packet mirror: {pfile}")
        md_file = REPO_ROOT / "context" / meta["person_file"]
        if not md_file.is_file():
            errors.append(f"Missing live context markdown: {md_file}")
        cfile = REPO_ROOT / meta["contract_path"]
        if not cfile.is_file():
            errors.append(f"Missing task contract: {cfile}")
        else:
            ctext = cfile.read_text()
            for heading in required_contract_headings:
                if heading not in ctext:
                    errors.append(f"Contract {meta['contract_path']} missing section: {heading}")
        efile = REPO_ROOT / meta["eval_path"]
        if not efile.is_file():
            errors.append(f"Missing evaluation file: {efile}")
        else:
            etext = efile.read_text()
            for field in required_eval_fields:
                if field not in etext:
                    errors.append(f"Evaluation {meta['eval_path']} missing field: {field}")

    # 3. Check required root documents & skills
    required_files = [
        "00_READ_ME_FIRST.md",
        "01_PRODUCT_REQUIREMENTS_DOCUMENT.md",
        "02_MASTER_BUILD_PROMPT.md",
        "03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md",
        "04_OWNER_A_CYBER_RANGE.md",
        "05_OWNER_B_LOCAL_AI_RED_TEAM.md",
        "06_OWNER_C_CONTROL_SCORING.md",
        "07_OWNER_D_DEFENDER_UX_QA_DEMO.md",
        "Ahnaf.md",
        "Tanvir.md",
        "Saad.md",
        "Takeover.md",
        "AGENTS.md",
        "context/INDEX.md",
        "Agent_Instructions/SKILL.md",
        "Agent_Instructions/agents/openai.yaml",
        ".agents/skills/agent-instructions/SKILL.md",
        ".agents/skills/agent-instructions/agents/openai.yaml",
    ]
    for rel in required_files:
        if not (REPO_ROOT / rel).is_file():
            errors.append(f"Missing required file: {rel}")

    # 4. Validate .agents/skills via `harness catalog validate`
    skills_dir = REPO_ROOT / ".agents" / "skills"
    if skills_dir.is_dir():
        cat_res = run_harness("catalog", "validate", str(skills_dir))
        if not cat_res.get("valid", False):
            errors.extend(cat_res.get("errors", ["catalog validate failed"]))

    if errors:
        print(json.dumps({"valid": False, "errors": errors}, indent=2), file=sys.stderr)
        return 1

    print(
        json.dumps(
            {
                "valid": True,
                "checked_tasks": list(TASKS.keys()),
                "checked_files": len(required_files),
                "message": "All Sentinel Loop harness packets, contracts, evaluations, and Agent_Instructions skills are valid and synchronized.",
            },
            indent=2,
        )
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("bootstrap", help="Initialize and synchronize all 4 harness task packets and markdown context files")
    sub.add_parser("status", help="Show real-time status across all 3 teammate segments and master integration")
    sub.add_parser("verify", help="Verify all harness context packets, contracts, evaluations, and skills")

    p_update = sub.add_parser("update", help="Update a segment's checkpoint and regenerate its live markdown context")
    p_update.add_argument("--task", required=True, choices=list(TASKS.keys()))
    p_update.add_argument("--phase", choices=["PLAN", "IMPLEMENT", "EVALUATE"])
    p_update.add_argument("--goal")
    p_update.add_argument("--next-step")
    p_update.add_argument("--complete", action="append")
    p_update.add_argument("--add-remaining", action="append")
    p_update.add_argument("--remove-remaining", action="append")
    p_update.add_argument("--add-blocker", action="append")
    p_update.add_argument("--clear-blockers", action="store_true")
    p_update.add_argument("--add-decision", action="append")
    p_update.add_argument("--add-evidence", action="append")

    p_takeover = sub.add_parser("takeover", help="Print an instant takeover report for any segment")
    p_takeover.add_argument("--task", required=True, choices=list(TASKS.keys()))

    args = parser.parse_args(argv)
    cmd = args.command or "verify"
    if cmd == "bootstrap":
        return cmd_bootstrap()
    if cmd == "update":
        return cmd_update(args)
    if cmd == "takeover":
        return cmd_takeover(args)
    if cmd == "status":
        return cmd_status()
    return cmd_verify()


if __name__ == "__main__":
    raise SystemExit(main())
