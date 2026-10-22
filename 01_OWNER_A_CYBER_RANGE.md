# Workstream 01 — Cyber Range & Target Infrastructure
**Owner:** Engineer A | **Mission:** deliver a real, isolated fictional target whose access controls, telemetry and recovery can be independently verified.

## You own
`apps/target-api/`, `infra/range/`, target fixture generation, target-local audit schema, and range-specific tests. You are the **sole owner of target behavior and isolation**. You do not decide the AI's next action, write learner UI, or assign scores.

## Target product behavior
Build a small FastAPI application representing Northstar Analytics. It has Maya (employee), Eli (unaffected employee), a seeded compromised Maya session, and protected `doc_finance_07`. A request using a currently valid session produces an actual HTTP response and target-local audit entry. Revoking that session changes the authorization result of the *next real request*. A legitimate Eli request continues to succeed. Account disabling disrupts the account's legitimate workflow until restoration.

### Required P0 modules
1. **Target domain model:** `User`, `Session`, `Document`, `AccessPolicy`, `AuditEntry`, `TargetInstance` with deterministic fixtures. Every target belongs to one `run_id`; for a one-machine demo, only one active target is required, but IDs must still be scoped.
2. **Auth and resource routes:** session status, document list and document read with a server-enforced authorization check. Seed opaque training tokens/handles; never expose raw secrets to browser or LLM.
3. **Defense actuation:** revoke compromised session, disable/restore employee account, require reauthentication. Each action returns its actual state transition and audit ID.
4. **Telemetry:** audit allowed/denied document reads, session checks, revocation, account disable/restore and benign workflows; include `run_id`, `correlation_id`, target-local ID, actor, session, resource, outcome, occurrence time.
5. **Lifecycle:** create target from a versioned fixture, verify fixture hash, clean reset, destroy target. Reset invalidates all old handles and clears target state, without altering C's immutable historical trace.
6. **Isolation:** disposable VM preferred; if restricted containers are used, label reduced isolation. Block Internet egress, disallow privileged mode, host mounts and Docker socket; limit CPU/memory/time; make the target unreachable from public network and the learner browser.
7. **Verification probes:** a measured request using the compromised handle must be denied after revocation; Eli's authorized task must still pass. Return measured HTTP outcome and audit correlation, not a hardcoded Boolean.

### Target-side API / adapter handoff
- Implement the **Target Adapter** specified in `00_START_HERE_SHARED_CONTRACT.md`.
- Provide Python typed stubs to B and C on 22 Oct and a mock target by 23 Oct.
- Publish the exact allowlisted operations and opaque identifiers. No arbitrary URL execution.
- C controls when defensive actions execute; A owns how target auth enforces them.
- Target telemetry is *observed evidence*, not a learner-visible alert by itself; C ingests and normalizes it.

### Required test cases
| Test | Expected observation |
|---|---|
| Seeded compromised session reads permitted training document | Real target response and matching audit entry |
| Revoke that session; retry identical request | Denied by actual target authorization |
| Eli accesses allowed resource after Maya's session revocation | Succeeds, matching audit |
| Disable Maya's account | Maya's legitimate task fails; not scored as full recovery until restored |
| Reset x10 | Clean fixture hash and no stale active compromised session from prior run |
| Target attempts forbidden outbound connection | Denied and logged in isolation test |
| Browser attempts direct target reachability | Not accessible outside approved control-plane proxy |
| Two run IDs | No cross-run token reuse or target data exposure |

### Red-team your own segment
- A stale token surviving reset invalidates the entire learning exercise.
- If 'revoke' merely flips a dashboard flag, you have built theater, not a cyber range.
- If the target can reach the control plane or host secrets, the lab is not safe for autonomous tooling.
- If every document request is automatically malicious, there is no meaningful signal-versus-noise investigation.
- If target time and control-plane event order disagree, C cannot score response latency reliably.

### Daily tickets
- **22 Oct:** data model, fixture IDs, adapter signature, isolation design, auth matrix; publish mocks.
- **23 Oct:** running target, seeded sessions/documents, actual audit trail; basic containment route.
- **24 Oct:** revocation + legitimate continuity proof; target event ingestion to C.
- **25 Oct:** clean reset, end-to-end vertical slice with B/C/D.
- **26–28 Oct:** second consequence branch, fault injection, isolation review, ten resets.
- **29–31 Oct:** freeze images/hashes; assist cold-start demo and provenance.

## Definition of done
A reviewer can start a fresh range, observe an AI-selected allowlisted target interaction, revoke the relevant session, observe the subsequent denial, verify Eli's task still succeeds, and reset the environment without manual database changes. Isolation tests pass under the declared deployment configuration. If any of these fail, the live demo is blocked.

## Useful references
FastAPI, pytest/httpx, restricted Docker or disposable VM; study OWASP VAmPI only for small API training patterns, not as a required dependency. Review https://docs.docker.com/engine/security/ and https://docs.docker.com/engine/security/rootless/.
