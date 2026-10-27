# AI observer and timed range: decisions and independent review

Date: 24 October 2026. Plan: `AI_OBSERVER_RANGE_PLAN.md`.
Disposition: **APPROVED — design only**. The final arbiter's first attempt failed because of an account usage limit; the retry completed and explicitly approved the revised design. No implementation or runtime qualification is claimed.

## Confirmed decision log

| Decision | Alternatives considered | Resolution and reason |
| --- | --- | --- |
| Live audience | Learner toggle versus privileged observation | User selected instructors/assigned observers live; trainee own-run review afterward. Server enforcement in both practice and assessment. |
| Observation layout | Single timeline versus split view | User selected split trainee tab/VM and actual AI activity, with terminal synchronized review. |
| Delivery order | Expanded range at once versus observer first | User selected observer first; isolation/Windows and timed expansion follow separate gates. |
| Compute | Existing laptop versus dedicated host | User selected dedicated lab host, laptop browser. Actual capacity must be measured. |
| Execution power | Unrestricted shell/GUI versus bounded tools/scripts | User selected bounded execution. Finite AST interpreter and broker enforce tool/resource limits independently of model instructions. |
| Recording scope | Personal screen versus exercise tab and lab VM | User selected tab and VM only, with notice and masked browser inputs. VM pixel-recording scope is disclosed separately. |
| AI evidence | Defender/cursor omniscience versus target evidence | User selected target replies only; observer capture is excluded from AI and grading. |
| Windows role | Endpoint compromise versus trainee workstation | User selected workstation first; endpoint attack family is deferred. |
| Goal | Recover after breach versus prevent objective | User selected protection of objective and operations. Actual protected read is immediate loss. |
| Continuity | Any interruption loses versus bounded recovery | User selected ≥95% bundles, no outage >30 active seconds, final workflows healthy. |
| Click effect | Decorative event versus reviewed synthetic effect | User selected a reviewed in-lab effect; one policy-respecting scoped synthetic grant, no real credential collection or arbitrary payload. |
| Stream access | Transferable bearer URL versus authenticated proxy | Proxy chosen to bind actors, enforce read-only input and actively revoke connected viewers. |
| AI explanations | Raw/private thought stream versus declared intent | Record actual inputs/final output and short explicitly AI-stated intent, plus real tool/audit evidence. No fabricated internal reasoning. |
| Compatibility | Extend canonical legacy enums versus separate version | Separate v2 timed/tool contracts prevent false legacy containment outcomes and accidental legacy timing changes. |
| Fault recovery | Reconstruct interrupted monotonic clock versus invalidate | Browser reconnect remains supported; interrupted authority invalidates after reconciliation while preserving committed terminal results. |
| Model qualification | Hide small-model failure versus measured candidate | Preserve 1.7b 10/12 failure; qualify pinned local 8b candidate under whole-host load, leave launch disabled on failure. No automatic purchases/cloud fallback. |

## Sequential reviewer findings and resolutions

### Skeptic / Challenger — `/root/range_plan_skeptic`

All ten findings were accepted; none rejected.

| ID | Objection | Resolution in final draft |
| --- | --- | --- |
| S1 | Broker fencing does not decide target-side effect races or lost acknowledgments | Target-owned serialized transaction, fresh lease/deadline linearization, durable command result and objective audit; query uncertain command IDs; prior committed effects count. |
| S2 | “Bounded Python” lacks a defined execution surface | Exact finite AST subset, guest boundary, source/call/CPU/memory/time/output/channel bounds, no credentials, validation per leaf. |
| S3 | Monotonic restart/suspend and slow-inference semantics unspecified | Normal inference counts; acknowledged fault barrier only; bounded fault pauses; interrupted authority invalidates, no clock reconstruction. |
| S4 | Continuity and temporary recovery semantics conflict | Human chose 95%/30 seconds/final health; 180 scheduled bundles, transaction-measured exact health transitions, explicit fault/absence handling. |
| S5 | Windows compromise objective undefined | Human chose trainee workstation only. Backend finance canary is protected objective; no implied endpoint compromise. |
| S6 | Current transferable Guacamole URL and clipboard settings do not enforce observer role | Actor-bound proxy leases, active revocation, observer opcode denial, clipboard/file-transfer restrictions, no exposed transferable grant. |
| S7 | Expanded actions/results lack version and legacy outcome mapping | New v2 action/result contract; truthful timed verdict; old enums and old runs unchanged; do not coerce survival into containment. |
| S8 | Cadence/budget/model matrix cannot establish effective fifteen-minute opponent | Adversary-only leaf token bucket, one in-flight job, explicit upper-rate meaning, whole-round real-model qualification and no fallback credit. |
| S9 | Windows replay, retention and quota gaps ambiguous | Real VM protocol recording plus web capture, explicit TTL buckets, quota/gap/incomplete-history labels. |
| S10 | Resource ledger is not observed capacity | Dedicated-host preflight and concurrent full-load launch gate; actual Windows/model/latency/reset evidence required. |

### Constraint Guardian — `/root/range_constraint_review`

Disposition before revision: **REVISE**, five bounded issues. All accepted and incorporated.

| ID | Objection | Resolution |
| --- | --- | --- |
| C1 | Current nested database helpers may commit early; Python lock is process-local | `BEGIN IMMEDIATE` before authority reads; one outer commit, transaction-accepting helpers, no network/model wait under transaction; concurrency regression tests. |
| C2 | Restart technical failure could overwrite a committed breach | Reconcile first and retain existing terminal verdict; technical failure only when no earlier terminal verdict exists. |
| C3 | Business probes could exhaust the AI token bucket | Bucket covers adversary target operations, including nested calls; trusted health/business/defense identities are independently bound and exempt. |
| C4 | Scheduled slots and consecutive failure duration ambiguous; delayed checks might invent history | Exactly 180 at 5…900, final counted once; measure longest disruption from transaction-recorded health transitions; missed/late slots fault rather than fabricate historical observations. |
| C5 | Parser/output/channel resource scope and actor attribution incomplete | Bounds start at parsing, include responses/channel; timeout fences job generation; trusted broker assigns actor and command IDs, no caller-selectable exemptions. |

The reviewer found target-owned authority appropriate and the revised inference/fault/restart distinction coherent, subject to these fixes. This was a design review, not evidence that code implements them.

### User Advocate — `/root/range_user_advocate_review`

Disposition before wording changes: **REVISE**, presentation clarifications only; no architecture blocker or conflict with locked choices. All accepted.

| ID | Objection | Resolution |
| --- | --- | --- |
| UA1 | Begin/reconnect could look as though a disconnected browser paused the round | Briefing states normal generation/disconnection consume active time; authoritative remaining time and continued-exercise notice on reconnect. |
| UA2 | High learning score could appear to overturn a failed timed round | Lead with timed verdict and exact failed rule/count/duration/final health; label 100-point rubric separate formative feedback. |
| UA3 | “Executed/confirmed” could imply successful access, or policy rejection could look like target denial | Separate proposal/validation/dispatch/confirmation stage from allowed/denied/error target result; explicitly label AI-stated intent. |

## Final Integrator / Arbiter — `/root/range_plan_arbiter`

- First attempt: unavailable because of account usage limit; no disposition produced.
- Retry: **APPROVED — design approval only**. The independent arbiter accepted S1–S10, C1–C5, and UA1–UA3 as resolved. No objection was rejected or remained unresolved, and no locked user decision needed reopening.
- Arbiter rationale: confirmed Understanding Lock, sequential reviews, explicit resolutions for every objection, and a complete alternatives/decision log satisfy the design exit criteria.
- Exit gate passed by the independent arbiter, not by primary self-approval. The failed first invocation remains an unavailable attempt, not a pass.
- Implementation/runtime gates remain separate even after design approval.
