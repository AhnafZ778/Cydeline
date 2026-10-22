# Tanvir — Local AI Red-Team Engine (The AI Intruder)

**Role:** Local AI Adversary & Model Evaluation Owner  
**Harness Task ID:** `tanvir-red-agent`  
**Live Harness Context File:** `context/TANVIR_CONTEXT.md` | **Task Contract:** `context/contracts/tanvir-red-agent.contract.md` | **Evaluation Ledger:** `context/evaluations/tanvir-red-agent.eval.md`  
**Companion Reference Docs:** `00_READ_ME_FIRST.md`, `01_PRODUCT_REQUIREMENTS_DOCUMENT.md`, `03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`, `05_OWNER_B_LOCAL_AI_RED_TEAM.md`, `Agent_Instructions/SKILL.md`  
**Folders You Own:** `services/red-agent/`, `tests/agent/`, `docs/model-card/`

---

## 1. High-Level Mission (In Plain English)

You are building **the live AI opponent** inside the simulator.

Instead of a boring, pre-recorded attack script, your AI runs locally on a laptop and acts as an intruder inside the virtual company (*Northstar Analytics*). It starts with employee Maya’s hijacked login session (`sess_A`), looks around for a confidential finance file (`doc_finance_07`), tries to read it, and **adapts in real time** when the human player blocks its session.

Most importantly, you put this AI inside a **strict safety cage**: it can only pick moves from a fixed menu of 6 legal game actions and can never run real hacking tools, shell commands, or touch anything outside the game.

---

## 2. What You Deliver by the End

### A. The Local AI Brain (`services/red-agent/`)
- **Local Model Setup:** Run a lightweight quantized model locally via **Ollama** (starting with **Qwen3-1.7B Q4**, and testing **Qwen3-4B Q4** if hardware allows).
- **One Model Playing Three Sequential Roles:** Rather than running three heavy models at once, you prompt one model to act in three stages depending on the turn:
  1. `scout` — Checks if the stolen session works and lists what documents it can see.
  2. `access_operator` — Attempts to open the confidential target document (`doc_finance_07`).
  3. `adaptation_planner` — Sees what happened after the human defender took action (for example, seeing that `sess_A` was revoked and denied) and decides whether to check status, wait, or cleanly `stop`.

### B. The Safety Cage & Validator
- **The 6 Only Allowed Moves:** Your service must only ever output one of these exact 6 actions:
  - `inspect_session_status`
  - `list_accessible_documents`
  - `request_document`
  - `test_existing_session`
  - `wait`
  - `stop`
- **Strict JSON Output:** Every turn, the AI must reply with this exact JSON shape (from `03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md`):
  ```json
  {
    "role": "access_operator",
    "action": "request_document",
    "target_id": "doc_finance_07",
    "session_handle": "sess_A",
    "reason": "The document is present in the permitted resource listing"
  }
  ```
- **Two-Stage Safety Check:**
  1. Check that the AI returned valid JSON matching the schema.
  2. Check that the chosen `action`, `target_id`, and `session_handle` are on the approved allowlist for the current turn. Reject anything else immediately.
- **No Freezing (Timeouts & Tagged Fallback):** If the local AI takes too long or outputs broken text, your service must not freeze the game. It must cleanly time out and either stop or use a backup move that is **honestly labeled** as `"fallback_used": true`.

### C. AI Proof & Scorecard (`tests/agent/`, `docs/model-card/`)
- **30-Turn Reliability Test:** Feed 30 sample game states to the model and show that at least **28 out of 30** produce valid, legal JSON moves (and **0** illegal moves ever slip through your validator).
- **10 Before-vs-After Adaptation Test:** Show that when the observation changes from *"Session is active"* to *"Session was revoked and denied"*, the AI meaningfully changes its decision (e.g., chooses `stop` or `inspect_session_status` instead of blindly repeating the same move) in at least **8 out of 10** pairs.
- **Speed Measurement:** Record how many seconds the AI takes per turn on the demo machine in `docs/model-card/`.

---

## 3. How You Work in Parallel (Zero Waiting on Ahnaf or Saad)

1. **Step 1 — Lock the Proposal JSON with Saad & Ahnaf (First Hour):**
   Confirm the exact JSON input (`observation`) that Saad’s referee service will send you, and the exact JSON output (`proposal` + `AgentDecisionRecord`) you will return to Saad.
2. **Step 2 — Build & Benchmark the AI Standalone:**
   You do **not** need Saad’s virtual company server or Ahnaf’s web dashboard to build your entire engine. Create sample JSON observations in `tests/agent/` (e.g., Turn 1: `sess_A` active; Turn 2: `doc_finance_07` listed; Turn 3: `sess_A` revoked) and test your Ollama model + safety validator directly against those files.
3. **Step 3 — Plug Into Saad’s Referee Service:**
   Expose two clean Python functions/endpoints for Saad’s Control Plane (`apps/control-api/`) to call:
   - `choose_action(run_id, role, observation) -> ProposalResult`
   - `validate_action(proposal, run_policy) -> AcceptedAction | Rejection`

---

## 4. Your Step-by-Step Checklist

- [ ] **1. Hardware & Model Check:** Install Ollama, pull `Qwen3-1.7B` (Q4), and measure how fast it replies with structured JSON on your machine.
- [ ] **2. Observation Builder:** Write the function that formats sanitized game state for the AI (showing only allowed session handles like `sess_A`, allowed document IDs like `doc_finance_07`, and the result of the last move—never hidden answer keys).
- [ ] **3. Role Prompts:** Implement the system prompt from `03_LOCAL_RED_AGENT_RUNTIME_PROMPT.md` for `scout`, `access_operator`, and `adaptation_planner`.
- [ ] **4. Two-Stage Validator:** Build the schema + allowlist validator that blocks unknown actions, fake document IDs, raw URLs, or prompt-injection tricks inside document names.
- [ ] **5. Timeout & Fallback Handling:** Add a strict per-turn timeout and `fallback_used` flag so a slow model never hangs the game.
- [ ] **6. Connect with Saad:** Plug `choose_action` into Saad’s Control Plane and verify one full loop: AI proposes a move → Saad executes it on the virtual company → Saad sends the result back to your AI for the next turn.
- [ ] **7. Run the Benchmarks:** Run the 30-trial validity test and 10-pair adaptation test, and save the results in `docs/model-card/`.
