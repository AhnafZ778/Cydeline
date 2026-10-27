# Diagnostic Evaluation: AI-LEARN-01 Attacker Adaptation Failure

**Task:** `tanvir-red-agent`  
**Date:** 2026-10-27  
**Evaluator:** Tanvir (Local AI Red-Team Engine Lead)  
**Status:** Root Cause Diagnosed; Actionable Prompt/Selector Correction Identified  
**Referenced Evidence:**
- `docs/model-card/learning/2026-10-23T18-40-21.322575Z-objectives/summary.json`
- `docs/model-card/learning/2026-10-23T18-40-21.322575Z-objectives/northstar-breach-service-dependent-1.json`
- `docs/model-card/learning/2026-10-23T18-40-21.322575Z-objectives/northstar-breach-service-dependent-2.json`
- `docs/product/KNOWN_ISSUES.md` (§AI-LEARN-01)

---

## 1. Problem Statement & Observed Traces

The 12-journey model objective matrix (`2 scenarios × 3 variants × 2 repeats`) failed with **10/12 passed (FAIL)**. The two failing runs were:
- `northstar-breach-service-dependent-1` (seed `20261023`, outcome `technical_failure`)
- `northstar-breach-service-dependent-2` (seed `20261024`, outcome `technical_failure`)

In both runs, all 12 decisions were accepted by the policy validator with zero schema or out-of-policy violations. However, the agent never performed an objective read on `doc_payroll_03` within the 12-step budget.

### Trace Timeline Breakdown
- **Scenario Configuration:**
  - Route 1: `sess_C` (Maya's browser session, mapped to alias `context_1`), where `browser_objective_access: false`.
  - Route 2: `key_reporting` (Reporting API credential, mapped to alias `context_2`), where `reporting_objective_access: true`.
- **Step 0:**
  - Selector input: `{"contexts": {"context_1": "unknown", "context_2": "unknown"}}`
  - Model selects: `"context_1"` (`sess_C`).
  - Scout executes: `list_accessible_documents` on `sess_C`. Target returns only `["doc_ops_02"]`.
  - Result: `sess_C` does NOT have access to `doc_payroll_03`. The runtime updates `objective_contexts["sess_C"] = "denied"`.
- **Steps 1 through 11 (11 consecutive turns):**
  - Selector input: `{"contexts": {"context_1": "denied", "context_2": "unknown"}}`
  - Model prompt:
    > *"Select one context for the next bounded investigation. The states describe observed permission for the objective document. active means permission was observed; unknown means permission has not been tested and should be explored. Prefer an active context; otherwise choose an unknown context. denied, revoked, disabled and expired are blocked. Select null only when every context is blocked: unknown is not blocked. Return selected_access JSON."*
  - Schema: `{"type": "object", "required": ["selected_access"], "properties": {"selected_access": {"type": ["string", "null"], "enum": ["context_1", "context_2", null]}}}`
  - **Model Output on EVERY turn (1 to 11):**
    ```json
    {"selected_access": "context_1"}
    ```
  - **Result:** The agent repeatedly chose the denied session `sess_C` across 11 decisions, making 9 status checks and 2 denied `request_document` attempts on target. It never once attempted `context_2` (`key_reporting`).

---

## 2. Root Cause Analysis

1. **Position & Enumeration Bias:**
   In `Qwen3:1.7b` running at `temperature: 0.1`, when presented with:
   - JSON user content where `"context_1"` appears first, and
   - JSON schema enum `["context_1", "context_2", null]` where `"context_1"` appears first,
   the model exhibits strong greedy prefix bias towards token `"context_1"`.
2. **Instruction Structure Weakness:**
   In the legacy selector prompt:
   - "Prefer an active context; otherwise choose an unknown context." precedes "denied, revoked, disabled and expired are blocked."
   - The negative constraint ("blocked") is stated passively rather than as a strict categorical filtering rule.
   - Small quantized models (1.7B) frequently fail to apply diffuse negative constraints across key-value pairs without explicit, structured rule definitions.

---

## 3. Atomic Remediation

Update `selector_prompt` in `services/range_runtime/agent.py` to enforce explicit, hierarchically ordered priority rules with unambiguous categorical exclusion:

```python
selector_prompt = (
    "Select one access context for the next investigation step. "
    "Context states indicate permission for the objective document: "
    "'active' (permission observed), 'unknown' (untested, must be explored), "
    "or blocked ('denied', 'revoked', 'disabled', 'expired'). "
    "Rules: "
    "1. Never select a blocked context ('denied', 'revoked', 'disabled', 'expired'). "
    "2. If an 'active' context is present, select it. "
    "3. Otherwise, select an 'unknown' context to explore it. "
    "4. If all contexts are blocked, select null. "
    "Return JSON with key selected_access."
)
```

This guarantees:
1. Blocked contexts are categorically eliminated prior to selection.
2. An `"unknown"` context is strictly preferred over any `"denied"` context.
3. Strict schema backward-compatibility (`selected_access` key, exact alias enum) is preserved without altering frozen contracts or canonical enums.
