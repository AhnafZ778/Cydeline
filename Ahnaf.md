# Ahnaf — Project Lead, Product Overseer & Defender Command Center (UX & Demo)

**Role:** Team Lead, Integration Overseer & Defender Experience Owner  
**Harness Task ID:** `ahnaf-lead-ux` (plus `master-integration`)  
**Live Harness Context File:** `context/AHNAF_CONTEXT.md` | **Task & Visual Contract:** `context/contracts/ahnaf-lead-ux.contract.md` | **Evaluation Ledger:** `context/evaluations/ahnaf-lead-ux.eval.md`  
**Companion Reference Docs:** `00_READ_ME_FIRST.md`, `01_PRODUCT_REQUIREMENTS_DOCUMENT.md`, `02_MASTER_BUILD_PROMPT.md`, `07_OWNER_D_DEFENDER_UX_QA_DEMO.md`, `Agent_Instructions/SKILL.md`  
**Folders You Own:** `apps/web/`, `tests/e2e/`, `docs/demo/` (plus overseeing `contracts/` and final release gates across the whole repo)

---

## 1. High-Level Mission (In Plain English)

You have two jobs on this team:
1. **Team Lead & Overseer:** Keep **Saad** (Virtual Company & Game Referee) and **Tanvir** (Local AI Intruder) aligned on the same rules so their pieces plug together smoothly without last-minute surprises.
2. **The Player’s Command Center & Competition Pitch:** Build everything the student, instructor, and competition judges actually see and click in the browser—the **Security Operations Dashboard**—and lead the **3-minute competition demo**.

---

## 2. What You Deliver by the End

### A. Leadership & Integration Overseeing
- **Kickoff & Shared Rules Sign-Off:** Make sure you, Saad, and Tanvir agree on Day 1 on the exact list of 6 AI moves, 4 Defender moves, and what an activity alert looks like so everyone can build in parallel.
- **Daily Sync Checkpoints:** Verify that Tanvir’s AI can talk to Saad’s Referee, and that your Web Dashboard reflects real changes from Saad’s backend.
- **Scope Guard:** Keep the team focused on the single core scenario (*"The Stolen Session" at Northstar Analytics*) so nobody wastes time on extra features before the main loop works.

### B. The Defender Command Center (The Web App in `apps/web/`)
A clean, single-application browser interface covering the 7 stages of the training drill:
1. **Scenario Briefing (Lobby):** Explains the mission at *Northstar Analytics*, shows whether the drill is in Practice mode, and lets the user start or reset the exercise.
2. **Live Security Activity Feed:** Shows live company activity as it happens (normal employee work mixed with suspicious activity) with simple filters by employee (`maya`, `eli`), session (`sess_A`), time, and outcome (`allowed`, `denied`).
3. **Investigation Drawer & Clue Basket:** Lets the player click any activity log to inspect its details and save suspicious logs into an "Evidence Basket."
4. **Incident Declaration:** A simple form where the player names the compromised session (`sess_A`) and attaches the evidence IDs they found.
5. **Containment Console (Action Buttons):** Buttons to stop the intruder:
   - *Revoke Session* (surgical fix—stops the intruder while keeping business running)
   - *Temporarily Disable Account* (broad fix—stops the intruder but disrupts normal work; shows a warning before confirming)
   - *Require Reauthentication* / *Restore Account*
6. **Recovery Verification View:** Two clear status checks the player triggers to finish the drill:
   - Check 1: **Suspicious Session Denied** (Proves the intruder is locked out)
   - Check 2: **Normal Business Workflow Working** (Proves unaffected employee Eli can still work)
7. **100-Point Report Card & Instant Replay:** Displays the final grade (0–100 broken down by category), highlights which clues and actions mattered, clearly labels whether the AI acted live or used a fallback, and lets the user replay the recorded match step-by-step.

### C. End-to-End Verification & The 3-Minute Demo (`tests/e2e/`, `docs/demo/`)
- **Automated Browser Walkthrough:** A Playwright test proving a user can go from Start → Investigate → Declare → Revoke → Verify → Scorecard → Reset without errors.
- **The 3-Minute Competition Video:** A clean, uncut 3-minute screen recording showing the live drill from start to finish and explaining why Sentinel Loop is a real adaptive simulator rather than a scripted quiz.

---

## 3. How You Work in Parallel (Zero Waiting on Saad or Tanvir)

1. **Step 1 — Lock the Shared Rules with Saad & Tanvir (First Hour):**
   Review Section 8 of `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` with Saad and Tanvir so the JSON shapes for events, actions, and scores are frozen.
2. **Step 2 — Build the Entire Dashboard Using Sample Data First:**
   Do **not** wait for Saad’s backend or Tanvir’s AI to be finished. Build all 7 views in `apps/web/` using static sample events (`evt_0001`, `evt_0002`, etc.) and sample scorecard data first.
3. **Step 3 — Plug Into Saad’s Live Backend:**
   Once Saad finishes the live API and event stream (`apps/control-api/`), swap your dashboard from sample data to Saad's live endpoints:
   - `POST /api/runs` & `POST /api/runs/{run_id}/start`
   - `GET /api/runs/{run_id}/events` & `GET /api/runs/{run_id}/stream` (Live SSE feed)
   - `POST /api/runs/{run_id}/declare`
   - `POST /api/runs/{run_id}/defender-actions`
   - `POST /api/runs/{run_id}/verify`
   - `GET /api/runs/{run_id}/debrief` & `GET /api/runs/{run_id}/replay`
   - `POST /api/runs/{run_id}/reset`
4. **Step 4 — Oversee Final Integration & Record the Demo:**
   Run the full game loop with Tanvir’s AI and Saad’s backend running together, verify that resetting works cleanly every time, and record the 3-minute pitch demo.

---

## 4. Your Step-by-Step Checklist

- [ ] **1. Kickoff Alignment:** Confirm shared event/action names with Saad and Tanvir.
- [ ] **2. Frontend Setup:** Initialize `apps/web/` (React + TypeScript + Vite) and set up mock data fixtures.
- [ ] **3. Build Live Feed & Investigation UI:** Build the Lobby, filterable Activity Table, Event Detail Drawer, and Evidence Basket.
- [ ] **4. Build Action & Verification UI:** Build the Incident Declaration form, Containment Console (with disruption warnings), and the 2-part Recovery Verification view.
- [ ] **5. Build Scorecard & Replay UI:** Build the 0–100 Debrief screen and read-only Instant Replay timeline.
- [ ] **6. Connect to Saad’s Backend:** Replace mock fixtures with live API calls and live SSE streaming.
- [ ] **7. Oversee Team Integration Gates:**
  - Verify Tanvir’s AI action triggers a real log in Saad’s target server.
  - Verify clicking "Revoke Session" on your screen blocks Tanvir’s AI on its very next turn while Eli’s normal work still succeeds.
- [ ] **8. Final QA & 3-Minute Demo:** Run browser tests (`tests/e2e/`) and record the uncut 3-minute competition demo (`docs/demo/`).
