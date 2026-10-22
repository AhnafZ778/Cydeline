# Evaluation: Tanvir — Local AI Red-Team Engine (`tanvir-red-agent`)

- **Verdict:** `blocked` (Task Contract established; awaiting `services/red-agent/` implementation in Increment B1–B3)
- **Evaluated source identity and time:** `2026-10-22` · Branch `chore/publish-workstreams` · Baseline Planning Snapshot
- **Accepted task contract:** `context/contracts/tanvir-red-agent.contract.md`
- **Independent evaluator / independence limitations:** Requires fresh-context `harness-evaluate` review of validator fuzz tests (`tests/agent/`) and empirical model benchmark results (`docs/model-card/`).

## Acceptance evidence
- [x] Starter runtime policy (`03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`) and task contract (`context/contracts/tanvir-red-agent.contract.md`) frozen.
- [ ] **Increment B1 (Schemas, Observation Builder, 2-Stage Validator & Fallback):** `services/red-agent/` enforces strict JSON schema + role/action/handle allowlist (`0` out-of-policy actions accepted) and tagged timeout fallback (`fallback_used: true`).
- [ ] **Increment B2 (Ollama Runtime & 3 Sequential Roles):** `Qwen3-1.7B Q4` connected via Ollama for `scout`, `access_operator`, and `adaptation_planner` with latency, `prompt_hash`, and `observation_hash` tracking.
- [ ] **Increment B3 (Empirical Benchmark & Control-Plane Integration):** $\ge 28/30$ schema-valid trials, $\ge 8/10$ pre/post-containment adaptation trials, and live integration with Saad's `apps/control-api/`.

## Findings: severity, location, trigger, actual behavior, expected behavior
- None at planning baseline.

## Checks, browser observations and artifacts
- `harness check run /home/ahnaf-zakaria/Downloads/Cydeline`
- Planned unit/benchmark checks: `python3 -m unittest discover -s tests/agent -v`

## Unverified criteria and environment limits
- Ollama runtime and `Qwen3-1.7B Q4` latency on the host machine have not yet been measured.

## Next action (fixes return to Implement)
- Execute **Increment B1** in `harness-implement`: build `services/red-agent/` validator, observation builder, and fallback handler with unit tests in `tests/agent/`.
