# AI observer view — discussion checkpoint, 24 October 2026

Status: historical discussion checkpoint, superseded by the independently approved design in `AI_OBSERVER_RANGE_PLAN.md` and its decision/review log in `AI_OBSERVER_RANGE_REVIEW.md`. No observer feature or behavior change has been implemented.

## Confirmed human intent

The user wants the AI to record what it does in real time so an AI view can show its instructions, decisions, responses to trainee actions and adaptation. The trainee should continue investigating through the normal SOC tools rather than seeing the attack strategy live.

The user explicitly selected: **Instructors and observers only during a live exercise; trainees can review it afterward.** This supersedes the earlier interpretation that the main request was a learner-facing AI status banner. Visibility of actual behavior is the objective; animated activity or fabricated explanations are not evidence.

## Current source facts

- `services/range_runtime/engine.py` persists decision ID, model, proposed action, validation/rejection, latency, selection metadata and linked target events. Defender actions and verification probes are recorded separately.
- `services/range_runtime/agent.py` constructs prompts and observations but persists hashes rather than a complete prompt/response transcript. Some raw response fields are currently absent/null.
- Both active inference clients use thinking disabled. There is no current raw reasoning stream to display. A future concise declared rationale would be model output, not a verified account of hidden internal reasoning.
- A proposed action is distinct from an accepted proposal, an executed request and the target's audited response. A changed next action after a trainee response can demonstrate a recorded change; it does not prove causal adaptation by itself.
- Current model adaptation has a known defect: AI-LEARN-01, ten of twelve objective journeys pass. Live coaching latency has a separate 51989ms tail. Observer visibility must expose failures/waits/stops honestly.
- Existing roles and authorization must be inspected before introducing an observer grant. Do not expose instructor data through learner snapshot, SSE, exports or another run's identifiers.

## Historical proposal, now superseded by the approved expanded design

Record a chronological, durable observer history containing actual instructions/inputs supplied to each model call, its final structured output and declared rationale, validation, actual target requests and results, trainee changes the model subsequently observes, and the following decision. Distinguish model behavior from control/validator behavior. Show unavailable, rejected, stale, waiting and stopped states. Keep history available for after-run review; label older runs with missing transcript data rather than reconstructing it.

Assumptions to confirm: local-first, one active company initially; observer updates target roughly one second after a server event; observation must not add model calls or materially delay attacker execution; reconnect resumes from recorded events; secrets/authentication values stay redacted; existing instructor authorization gates the live view until an observer role is explicitly designed; existing runtime, storage and browser stack remains in use. No model replacement, token-by-token private-reasoning feature or scoring change is included by default.

## Decision log

1. Live audience: instructors/observers; trainee access only after the run. Confirmed by the user through the audience question.
2. Actual execution and model intent must remain distinguishable. Proposed evidence-preservation requirement based on existing authority contracts.
3. Scope and nonfunctional defaults above await understanding confirmation before design approaches or implementation.

## Publication state

All prior publishable code/context/evidence was pushed to `chore/publish-workstreams` at dffe457a3dacc83d970b515b9451d02ae63a540c after merging upstream1605262. Remote HEAD was verified equal and the working tree was clean at that point. Recordings remain excluded under upstream policy, and private runtime state stays local. This discussion checkpoint is newer local documentation; no push is inferred from the earlier publication request.

Next action: follow milestone A in `AI_OBSERVER_RANGE_PLAN.md`; this historical note alone is not the current implementation contract. The user confirmed the understanding, selected split-screen observation and observer-first delivery, and clarified Windows as trainee workstation plus the 95%/30-second/final-health continuity rule. Independent final design arbitration passed.
