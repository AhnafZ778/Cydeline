# AI & Learning-Quality Release Qualification Summary

**Author:** Tanvir (Local AI Red-Team Engine Lead)  
**Consumer:** Saad (`saad-range-control` — Range, Control & Demo Video Lead)  
**Date:** 2026-10-27  
**Task ID:** `tanvir-red-agent`  
**Relevant Contracts:** [Tanvir.md](file:///home/backlog/Cydeline/Tanvir.md) · [Saad.md](file:///home/backlog/Cydeline/Saad.md) · [context/contracts/tanvir-red-agent.contract.md](file:///home/backlog/Cydeline/context/contracts/tanvir-red-agent.contract.md)

---

## 1. Executive Summary

This qualification summary provides the current verified state, model boundaries, empirical evidence, and known limitations of the Local AI Red-Team Engine and learning-quality subsystems for competition submission and demo video production.

In compliance with the Sentinel Loop Operating Contract ([AGENTS.md](file:///home/backlog/Cydeline/AGENTS.md)):
- **Zero-fabrication rule:** No simulated numbers, artificial retention metrics, or substitute executions are claimed as live AI.
- **Model boundary:** One local quantized model (`Qwen3:1.7b Q4_K_M`) operated sequentially across three logical roles (`scout`, `access_operator`, `adaptation_planner`) through an independent two-stage validator (Pydantic/JSON schema + run-policy allowlist).

---

## 2. Engineering & Test Baseline

The core test suites for Tanvir's segment and integrated control/observer boundaries pass with **zero failures**:

```text
======================= 264 passed, 18 subtests passed in 41.80s =======================
- tests/agent/ (166 passed):
  * test_validator_and_roles.py: Zero out-of-policy violations across 29 adversarial cases.
  * test_fallback.py: Deterministic fallback handling with honest fallback_used: true tagging.
  * test_observation.py: Sanitized observation builder, role ceiling, handle allowlisting.
  * test_benchmark.py: 30-trial schema corpus (29/30) and 10-pair adaptation benchmark (9/10).
  * test_contracts_adapter.py: Complete vocabulary parity and proposal roundtrip.
  * test_service_and_prompts.py: Multi-role prompt rendering and timeout isolation.
  * test_selector_adaptation.py: Context priority hierarchy and post-denial route pivoting.
- tests/control/test_learning.py (75 passed):
  * Full 60-case coaching semantic suite with literal source citations.
  * Autoprompt, hint-finish race protection, worksheet isolation.
- tests/control/test_observer.py (23 passed):
  * Full observer transcript encryption, audit linkage, and resource release.
```

---

## 3. Measured AI Acceptance & Known Limitations

### A. Attacker Adaptation (`AI-LEARN-01`)
* **Status:** Remediated in code & unit tests; full live 12-journey matrix pending dedicated host run.
* **Finding:** In `northstar-breach` variant `service-dependent`, the selector previously exhibited position bias, repeatedly choosing `"context_1"` (`sess_C`, where `browser_objective_access: false`) despite observed `"denied"` state, and never exploring `"context_2"` (`key_reporting`, where `reporting_objective_access: true`).
* **Fix Applied:** Upgraded `selector_prompt` in `services/range_runtime/agent.py` to enforce explicit 4-tier categorical priority rules (strictly prohibiting selection of denied/revoked contexts). Verified in `tests/agent/test_selector_adaptation.py`.
* **Honest Release Gate:** Retain the historical 10/12 objective measurement in `docs/model-card/learning/` until a full 12-journey matrix is completed on the target host.

### B. Live Coaching Latency (`AI-LEARN-02`)
* **Status:** Observed performance boundary; preserved for honest reporting.
* **Measured Evidence:**
  * Isolated 60-case benchmark: $\text{p95} = 2,403\text{ ms}$ (range 1,266–3,117 ms).
  * Live browser journey under host memory/swap pressure: Recorded a valid Guide response at **$51,989\text{ ms}$**.
* **Video/Demo Guideline for Saad:**
  * When demonstrating Evidence Assistant coaching in the 3-minute video, clearly state that coaching operates via local model retrieval and that latency varies under system load. Do not edit out pauses to misrepresent latency.

---

## 4. User-Deferred Pilot Study Status

* **Status:** Prepared and blank; no participant recruitment or study sessions have been performed.
* **Kit Location:** `docs/product/pilot/` (`README.md`, `expert_reviews.csv`, `session_observations.csv`).
* **Governance:** As decided by the team lead on 24 October 2026, the pilot kit remains ready for future academic or field research. No participant efficacy or learning retention claims are made in marketing or competition submissions.

---

## 5. Demo Video Guidelines (for Saad)

1. Use the updated script in `docs/demo/DEMO_SCRIPT.md`.
2. Clearly highlight the **two-stage safety validator** that guarantees zero out-of-policy actions.
3. Show the **deterministic 100-point scoring rubric** and explain that scoring is strictly server-authoritative and completely separated from LLM generation.
4. Feature genuine local model runs; never use developer tools or mock endpoints during recording.
