# Instant Takeover & Recovery Protocol (`context-resume` -> `context-checkpoint`)

Use this protocol whenever **Ahnaf** (or any teammate/AI agent) needs to step in and take over a segment (`ahnaf-lead-ux`, `tanvir-red-agent`, `saad-range-control`, or `master-integration`) without having the previous developer's chat history.

---

## 1. The 5-Second Takeover Sequence

Run this single command for the segment you are taking over:

```bash
python3 scripts/harness_sync.py takeover --task <ahnaf-lead-ux|tanvir-red-agent|saad-range-control|master-integration>
```

This command outputs a structured JSON takeover brief containing:
1. `lifecycle_phase`: Whether the previous person left off in `PLAN`, `IMPLEMENT`, or `EVALUATE`.
2. `packet_revision` & `stale_since_checkpoint`: Whether any files were edited on disk after the last saved checkpoint.
3. `owned_working_tree_changes`: Exact modified or untracked files belonging to this segment.
4. `immediate_next_step`: The exact next atomic task recorded by the previous session.
5. `remaining` & `blockers`: Ordered checklist of what is left and any active blockers.
6. `files_to_read_now`: The 4 files to read (`context/<PERSON>_CONTEXT.md`, `context/contracts/<task>.contract.md`, `context/evaluations/<task>.eval.md`, and `<Person>.md`).

---

## 2. How to Handle Unfinished / Dirty Edits When Taking Over

If `stale_since_checkpoint: true` or `owned_working_tree_changes` is non-empty:
1. **Do not revert or delete** existing working tree changes (`<no_reverts>` rule).
2. Inspect the modified files in the segment's owned directories (`git diff` and `Read`).
3. Run `harness check run /home/ahnaf-zakaria/Downloads/Cydeline` and segment unit tests to see what currently passes or fails.
4. Reconcile the state by running `python3 scripts/harness_sync.py update --task <task> ...` so the checkpoint reflects reality before you continue implementing.

---

## 3. Cross-Segment Emergency Substitution Playbook

- **If Tanvir is blocked on Ollama hardware/model issues (`tanvir-red-agent`):**
  - Anyone taking over `tanvir-red-agent` should complete **Increment B1** first (`observation.py`, `validator.py`, `fallback.py`), because Increment B1 requires zero GPU/Ollama runtime and immediately gives Saad's `apps/control-api/` a working `choose_action()` interface using tagged deterministic fallback (`"fallback_used": true`). Once Increment B1 is merged, Increment B2 connects live Ollama (`Qwen3-1.7B Q4`).
- **If Saad is overloaded across Target API + Control API (`saad-range-control`):**
  - Complete **Increment S1 (`contracts/` + `scenarios/stolen-session/v1/`)** first (takes <1 hour). Once `contracts/` is committed, one person can build `apps/target-api/` (**Increment S2**) while another builds `apps/control-api/` (**Increment S3**) in parallel against `contracts/adapter.py`!
- **If Ahnaf needs someone to wire a frontend view (`ahnaf-lead-ux`):**
  - Because `apps/web/` uses a clean `src/api/client.ts` adapter with `VITE_USE_MOCKS=true|false`, any developer can build or fix any of the 7 React components in `apps/web/src/components/` against `src/api/mocks.ts` without needing the backend running.
