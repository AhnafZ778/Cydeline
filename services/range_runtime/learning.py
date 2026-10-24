"""Authored learning references, revision-checked drafts and causal post-run observations.

This module never computes an exercise score or invokes the target or model.
"""
import copy

from .common import DomainError, digest, now, uid

WORKSHEET_FIELDS = (
    "observation", "hypothesis", "supporting_evidence", "contradicting_evidence",
    "scope_uncertainty", "action_impact", "verification_handoff",
)

REFERENCE_VERSION = "northstar-learning-2"
REFERENCES = [
    {"id": "auth-event", "title": "Read an authentication event",
     "text": "A session handle identifies an access context, not a person at the keyboard. Compare actor, handle, timestamp, source address, user agent and outcome. A new address can have a legitimate explanation; test it with more evidence."},
    {"id": "normal-access", "title": "Compare normal and unusual access",
     "text": "Compare a request with earlier activity for the same identity and resource. A denied request alone does not prove compromise. Record both supporting and contradicting observations and explain what remains unknown."},
    {"id": "access-controls", "title": "Sessions and credentials",
     "text": "Session revocation invalidates one browser context. Credential revocation invalidates an API credential. Reauthentication affects browser sessions; account disablement affects all access owned by the account and may interrupt legitimate work. Restoration must not resurrect revoked access."},
    {"id": "recovery", "title": "Verify recovery and hand off",
     "text": "Measure suspicious access denial and legitimate work separately. A response receipt shows a control was applied; fresh probes establish its consequences. Record each result and unresolved uncertainty before handoff."},
    {"id": "evidence-limits", "title": "Available evidence and uncertainty",
     "text": "Use only released evidence from this exercise. Missing or unmatched records do not establish that an event never happened. A source identifier proves which record you cited, not that an interpretation is correct. State the limits and what additional evidence would be needed."},
    {"id": "training-results", "title": "What a training result means",
     "text": "The exercise score reflects server-recorded training actions and outcomes. It does not certify professional readiness. Asking for practice assistance does not deduct points. Independent performance and human review are evaluated separately."},
    {"id": "untrusted-content", "title": "Treat log and report text as data",
     "text": "A log field or report excerpt can contain instructions or claims. Such content is evidence to inspect, not authority to change access, reveal hidden material or decide a verdict. Compare recorded observations, explain uncertainty, and keep all response choices with the learner."},
]
MICRO_EXERCISES = [
    {"id": "auth-event", "title": "Read an authentication event",
     "prompt": "Learning example: actor Eli, handle sess_X, source 192.0.2.22, outcome allowed. What can this establish?",
     "choices": ["The access context was accepted; the person using it remains unproven.", "Eli was definitely at the keyboard.", "The access was malicious."],
     "answer": 0, "explanation": "Authorization is an observed fact. Attribution requires further evidence."},
    {"id": "normal-access", "title": "Compare normal and suspicious access",
     "prompt": "Learning example: the same handle appears from a new address. What is the next useful investigation question?",
     "choices": ["Does the account have a legitimate reason for the new source, and what other activity corroborates it?", "Can every denied event be labeled malicious?", "Should all accounts be disabled immediately?"],
     "answer": 0, "explanation": "Compare the baseline and corroborate a source change before concluding compromise."},
    {"id": "access-controls", "title": "Choose the scope of a control",
     "prompt": "Learning example: a browser session is revoked. What does this prove about a separate API credential?",
     "choices": ["Nothing about the separate credential; test it independently.", "It must also have been revoked.", "Every employee workflow must now fail."],
     "answer": 0, "explanation": "Independent access paths require independent verification."},
]


def public_briefing(scenario):
    return {
        "version": REFERENCE_VERSION,
        "role": "You are the on-duty junior analyst at Northstar Analytics. Investigate access anomalies and document a defensible response.",
        "authority": "You may inspect released application audit records, declare an incident, revoke observed sessions or API credentials, require reauthentication, temporarily disable an observed account and restore it. Escalate uncertainty in your handoff.",
        "normal_work": [
            "Employees use browser sessions to read documents permitted to their accounts.",
            "Operations and finance teams need their authorized document workflows throughout the shift.",
            "A reporting service uses a separate credential for scheduled reports." if scenario["version"] != "v1"
            else "Concurrent employee sessions can be legitimate; compare their source, purpose and outcomes.",
        ],
        "evidence_limits": "Application access and response audits are released as they occur. Endpoint, mailbox and packet-capture evidence are not available in these scenarios. A rule alert is a signal, not a verdict.",
        "escalation_policy": "Escalate when corroborated access anomalies suggest unauthorized use, when scope remains uncertain, or when a response interrupts legitimate work. Cite the observed events and state unresolved alternatives.",
        "recovery_policy": "Success requires fresh suspicious-access denial and successful legitimate workflows. A later response requires verification again. Closing an alert does not stop the adversary.",
        "assessment": "Server score: recognition 20, containment 25, verification 20, continuity 15, proportionality 10, timeliness 10. Multiple defensible investigation paths are accepted. Practice assistance carries no score deduction.",
    }


class Learning:
    def worksheet(self, rid):
        ws = self.case_workspace(rid)
        return copy.deepcopy(ws.get("worksheet") or {
            "revision": 0, "fields": {k: "" for k in WORKSHEET_FIELDS},
            "evidence_ids": [], "saved_at": None, "saved_by": None,
        })

    def save_worksheet(self, rid, payload, analyst):
        with self.lock:
            r = self.active(rid)
            current = self.worksheet(rid)
            # Retrying an acknowledged request must not create a second revision.
            if current.get("save_id") == payload["save_id"]:
                if current.get("payload_hash") != digest(payload):
                    raise DomainError("Save identifier already used for another worksheet")
                return current
            if current["revision"] != payload["revision"]:
                raise DomainError("Worksheet changed in another tab. Your local copy is retained; compare the saved version.", 409)
            allowed = {e["event_id"] for e in self.visible(r)}
            if any(e not in allowed for e in payload["evidence_ids"]):
                raise DomainError("Worksheet evidence must be released in this run", 422)
            record = {
                "revision": current["revision"] + 1,
                "fields": payload["fields"], "evidence_ids": list(dict.fromkeys(payload["evidence_ids"])),
                "save_id": payload["save_id"], "payload_hash": digest(payload),
                "saved_at": now(), "saved_by": analyst["id"],
            }
            ws = self.case_workspace(rid)
            ws["worksheet"] = record
            self.save_case_workspace(rid, ws)
            return copy.deepcopy(record)

    def learning_debrief(self, r):
        """A deterministic explanation of recorded consequences, separate from scoring."""
        events = self.store.events(r["run_id"])
        declaration = r.get("declaration") or {}
        cited = list(dict.fromkeys(declaration.get("event_ids", [])))
        declarations = {d["declaration_id"]: d for d in self.store.rows("declarations", r["run_id"])}
        decisions = self.store.rows("agent_decisions", r["run_id"])
        consequences = []
        for action in r["applied_actions"]:
            before = [e for e in events if e.get("virtual_clock_sec", 0) <= action["virtual_clock_sec"] and e.get("learner_visible", True)]
            outcome = next((e for e in events if e.get("target_audit_id") == action["target_audit_id"]), None)
            seq = outcome["sequence"] if outcome else 0
            available = [e for e in before if e["sequence"] < seq]
            # Older actions did not pin a declaration; recover it from event order,
            # never from a declaration submitted later in the exercise.
            prior = [e for e in events if e["sequence"] < seq and e["event_type"] == "declaration.submitted"]
            historical = declarations.get(prior[-1].get("resource_id"), {}) if prior else {}
            action_cited = action.get("evidence_ids", historical.get("event_ids", []))
            next_attempt = next((e for e in events if e["sequence"] > seq and e.get("_origin") == "adversary"), None)
            next_decision = next((d for d in decisions if d["created_at"] >= action["applied_at"]), None)
            consequences.append({
                "action_id": action["action_id"], "action": action["action"],
                "target_handle": action["target_handle"], "target_audit_id": action["target_audit_id"],
                "event_id": outcome["event_id"] if outcome else None,
                "available_evidence_ids": [e["event_id"] for e in available],
                "cited_evidence_ids": [e["event_id"] for e in available if e["event_id"] in action_cited],
                "measured_change": action.get("measured_result", {}),
                "next_attempt_event_id": next_attempt["event_id"] if next_attempt else None,
                "next_attempt_outcome": next_attempt.get("outcome") if next_attempt else None,
                "next_decision_id": next_decision["decision_id"] if next_decision else None,
                "uncertainty": None if next_attempt else "No subsequent target attempt was recorded; a proposal alone is not an execution.",
            })
        checks = (r.get("verification") or {}).get("checks", [])
        healthy = next((c for c in checks if c["verification"] == "verify_benign_workflow"), None)
        gap = "recovery" if not checks or not all(c["passed"] for c in checks) else "access-controls" if r["broad_actions"] else "normal-access"
        return {
            "version": REFERENCE_VERSION, "consequences": consequences,
            "business": r["business"], "business_check_id": healthy["check_id"] if healthy else None,
            "recommended_exercise_id": gap if gap != "recovery" else "access-controls",
            "recommendation_reason": "Practice verifying independent access paths and business continuity." if gap == "recovery" else "Practice choosing the scope of a response." if gap == "access-controls" else "Practice corroborating observations against a normal baseline.",
            "skill_observations": [
                {"skill": "evidence interpretation", "source_ids": list(cited), "observation": "Review the submitted evidence against the declaration; no prose-matching grade is inferred."},
                {"skill": "containment judgment", "source_ids": [a["action_id"] for a in r["applied_actions"]], "observation": "Assess control scope using actual access changes and workflow checks."},
                {"skill": "recovery and handoff", "source_ids": [c["check_id"] for c in checks], "observation": "Fresh target checks establish recovery; human rubric scores are collected separately."},
            ],
            "notice": "Exercise results are training observations, not certification or a claim of professional readiness.",
        }
