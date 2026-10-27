from __future__ import annotations

import copy
import json
import logging
import statistics
import threading
from contextlib import nullcontext

from .agent import LocalAgent
from .catalog import lookup, manifest, spec
from .common import DomainError, digest, now, uid
from .db import Store
from .casework import Casework
from .learning import Learning, public_briefing
from .observer import ObserverLog

LOGGER = logging.getLogger(__name__)
TERMINAL = {"completed", "timed_out", "aborted", "technical_failure"}


class Engine(Casework, Learning):
    def __init__(self, path, target, agent=None):
        self.store = Store(path)
        self.observer = ObserverLog(self.store, path)
        self.observer_failed = False
        self.target = target
        self.agent = agent or LocalAgent()
        self.lock = self.store.lock
        self.model_lock = threading.Lock()

    def create(
        self,
        mode="practice",
        sid="stolen-session",
        version=None,
        seed=20261022,
        assistance="coached",
        owner="local",
        variant_id=None,
    ):
        if self.observer_failed:
            raise DomainError("Observer audit storage failed; restart after repairing storage", 507)
        self.require_model()
        s = lookup(sid, version)
        if not s:
            raise DomainError("Scenario version is not published", 422)
        from .variants import select_variant, public_variant
        variant = select_variant(sid, s["version"], variant_id)
        s["routes"] = [variant["browser_handle"]] + (["key_reporting"] if s["version"] != "v1" else [])
        s["objective_resource"] = variant["objective_resource"]
        with self.lock:
            if any(r["state"] not in TERMINAL for r in self.store.runs()):
                raise DomainError(
                    "One local company can run at a time. End the current shift first."
                )
            rid = uid("run")
            self.observer.admit()
            provision = self.target.create_fresh_target(rid, seed, s["version"], variant["id"])
            stamp = now()
            r = {
                "run_id": rid,
                "scenario_id": sid,
                "scenario_version": s["version"],
                "scenario": s,
                "variant": public_variant(variant),
                "mode": mode,
                "assistance": "blind" if mode == "assessment" else assistance,
                "seed": seed,
                "owner": owner,
                "state": "created",
                "outcome": None,
                "fixture_hash": provision.fixture_hash,
                "created_at": stamp,
                "started_at": None,
                "ended_at": None,
                "virtual_clock_sec": 0.0,
                "paused": False,
                "thinking": False,
                "ai_unavailable": False,
                "state_revision": 0,
                "ai_step": 0,
                "max_steps": s["max_steps"],
                "next_role": "scout",
                "next_ai_sec": s["first_ai_sec"],
                "next_background_sec": 0,
                "target_cursor": 0,
                "observed": {},
                "observed_documents": {},
                "last_result": "none",
                "objective_reached": False,
                "broad_actions": 0,
                "disrupted_seconds": 0,
                "business": [],
                "first_signal_sec": None,
                "first_signal_id": None,
                "route_first_signal": {},
                "effective_sec": None,
                "last_decision": None,
                "declaration": None,
                "verification": None,
                "applied_actions": [],
                "terminal_reason": None,
            }
            self.store.save(r)
            self.store.put(
                "scenario_versions",
                rid,
                rid,
                {
                    "manifest": s,
                    "manifest_hash": s["manifest_hash"],
                    "fixture_hash": provision.fixture_hash,
                    "rubric_version": s["rubric"]["version"],
                    "rubric_hash": s["rubric"]["hash"],
                },
            )
            self.store.put(
                "workspace",
                rid,
                rid,
                {
                    "revision": 0,
                    "note": "",
                    "hypothesis": "",
                    "hypothesis_status": "open",
                    "evidence_ids": [],
                    "timeline": [],
                    "saved_queries": [],
                    "cases": [
                        {
                            "id": "case_main",
                            "opened": False,
                            "title": "Northstar access review",
                            "owner": None,
                            "status": "open",
                            "role": "triage",
                            "notes": [],
                        }
                    ],
                    "alerts": [],
                    "hints_used": [],
                    "messages": [],
                },
            )
            self.event(r, "run.created", "control-plane", "system")
            self.checkpoint(r, "Company provisioned")
            return self.snapshot(rid)

    def event(self, r, event_type, source="control-plane", actor="system", **kwargs):
        return self.store.append(
            r["run_id"],
            {
                "event_id": uid("evt"),
                "run_id": r["run_id"],
                "timestamp_utc": now(),
                "visible_at_utc": now(),
                "virtual_clock_sec": r["virtual_clock_sec"],
                "source": source,
                "event_type": event_type,
                "actor_id": actor,
                "session_handle": None,
                "resource_id": None,
                "outcome": None,
                "correlation_id": uid("corr"),
                "learner_visible": True,
                **kwargs,
            },
        )

    def require_model(self):
        try:
            health = self.agent.health()
            ready = health.get("reachable") and health.get("model_present")
        except Exception:
            ready = False
        if not ready:
            raise DomainError(
                "AI unavailable — Retry when the configured model is ready", 503
            )

    def retry_ai(self, rid):
        with self.lock:
            r = self.active(rid)
            if not r.get("ai_unavailable") or r["thinking"]:
                return self.snapshot(rid)
        self.require_model()
        self.decide(rid, retry=True)
        return self.snapshot(rid)

    def start(self, rid):
        self.require_model()
        with self.lock:
            r = self.store.run(rid)
            if r["state"] != "created":
                raise DomainError("Shift already started")
            r.update(state="running", started_at=now())
            r["awaiting_begin"] = r["mode"] == "practice" and r["assistance"] == "coached"
            r["paused"] = r["awaiting_begin"]
            r["observed"] = {spec(r)["routes"][0]: "active"}
            self.target.request(
                rid, "request_document", spec(r)["routes"][0], "doc_ops_02", "employee"
            )
            self.target.probe(rid, "benign")
            self.ingest(r)
            self.event(r, "run.started")
            self.store.save(r)
            return self.snapshot(rid)

    def begin(self, rid):
        with self.lock:
            r = self.active(rid)
            if r.get("awaiting_begin"):
                r.update(awaiting_begin=False, paused=False, state_revision=r["state_revision"] + 1)
                self.event(r, "investigation.begun")
                self.store.save(r)
            return self.snapshot(rid)

    def active(self, rid):
        r = self.store.run(rid)
        if r["state"] in TERMINAL:
            raise DomainError("Shift has ended")
        return r

    def ingest(self, r, decision=None):
        for audit in self.target.audit_page(r["run_id"], r["target_cursor"]):
            r["target_cursor"] = audit["cursor"]
            detail = audit.get("detail", {})
            origin = detail.get("client_context", "control")
            event = self.event(
                r,
                audit["event_type"],
                "target-access",
                audit["actor_id"],
                session_handle=audit.get("session_handle"),
                resource_id=audit.get("resource_id"),
                outcome=audit["outcome"],
                correlation_id=audit["correlation_id"],
                target_audit_id=audit["audit_id"],
                network=detail.get("network"),
                decision_id=decision if origin == "adversary" else None,
                _origin=origin,
            )
            if origin == "adversary":
                handle = event["session_handle"]
                counts = r.setdefault("route_signal_count", {})
                counts[handle] = counts.get(handle, 0) + 1
                if r["first_signal_sec"] is None:
                    r["first_signal_sec"] = r["virtual_clock_sec"]
                    r["first_signal_id"] = event["event_id"]
                if handle and handle not in r["route_first_signal"]:
                    r["route_first_signal"][handle] = r["virtual_clock_sec"]
                if (
                    event["event_type"] == "document.access"
                    and event["resource_id"] == spec(r).get("objective_resource", "doc_finance_07")
                    and event["outcome"] == "allowed"
                ):
                    r["objective_reached"] = True
            self.detect(r, event)
        self.store.save(r)

    def detect(self, r, event):
        ws = self.store.get("workspace", r["run_id"])
        network = event.get("network") or {}
        handle = event.get("session_handle")
        if not handle or not network:
            return
        prior = [
            x
            for x in self.store.events(r["run_id"])
            if x.get("session_handle") == handle
            and x.get("network")
            and x["sequence"] < event["sequence"]
        ]
        changed = any(x["network"]["src_ip"] != network["src_ip"] for x in prior)
        denied = (
            sum(x.get("outcome") == "denied" for x in prior[-5:]) >= 2
            and event.get("outcome") == "denied"
        )
        if not changed and not denied:
            return
        key = ("source_change_" if changed else "denials_") + handle
        old = next((a for a in ws["alerts"] if a["rule_id"] == key), None)
        if old:
            if event["event_id"] not in old["event_ids"]:
                old["event_ids"].append(event["event_id"])
        else:
            ws["alerts"].append(
                {
                    "id": uid("alert"),
                    "rule_id": key,
                    "title": "Session observed from a new source"
                    if changed
                    else "Repeated access denials",
                    "severity": "medium",
                    "status": "new",
                    "created_at": event["timestamp_utc"],
                    "created_sec": r["virtual_clock_sec"],
                    "sla_sec": 180,
                    "event_ids": [event["event_id"]],
                    "session_handle": handle,
                    "verdict": None,
                }
            )
        self.store.put("workspace", r["run_id"], r["run_id"], ws)

    def visible(self, r, complete=False):
        out = []
        decisions = {
            d["decision_id"]: d for d in self.store.rows("agent_decisions", r["run_id"])
        }
        reveal = complete
        for row in self.store.events(r["run_id"]):
            if not row.get("learner_visible", True) and not complete:
                continue
            e = {k: v for k, v in row.items() if not k.startswith("_")}
            if not reveal:
                e.pop("decision_id", None)
            elif e.get("decision_id") in decisions:
                d = decisions[e["decision_id"]]
                e["agent_meta"] = self.meta(d)
            out.append(e)
        return out

    def meta(self, d):
        return {
            "step": d["step"],
            "role": d["role"],
            "model_id": d["model_id"],
            "quantization": "configured",
            "latency_ms": d["latency_ms"],
            "fallback_used": d["fallback_used"],
            "proposal": d["proposed_json"],
            "accepted": d.get("accepted", False),
            "rejection_reason": d.get("rejection_reason"),
        }

    def snapshot(self, rid):
        with self.lock:
            r = self.store.run(rid)
            events = self.visible(r)
            ws = self.case_workspace(rid)
            out = {
                k: r[k]
                for k in [
                    "run_id",
                    "scenario_id",
                    "scenario_version",
                    "mode",
                    "assistance",
                    "state",
                    "outcome",
                    "created_at",
                    "started_at",
                    "ended_at",
                    "virtual_clock_sec",
                    "paused",
                    "state_revision",
                    "fixture_hash",
                    "seed",
                    "declaration",
                    "verification",
                    "applied_actions",
                    "business",
                    "disrupted_seconds",
                    "terminal_reason",
                ]
            }
            out.update(
                scenario={**manifest(spec(r)), "briefing": public_briefing(spec(r))},
                awaiting_begin=bool(r.get("awaiting_begin")),
                variant=r.get("variant"),
                last_sequence=max([e["sequence"] for e in events], default=0),
                workspace=ws,
                model_status="unavailable"
                if r.get("ai_unavailable")
                else ("thinking" if r["thinking"] else "ready"),
                ai_unavailable=bool(r.get("ai_unavailable")),
                remaining_sec=max(0, spec(r)["duration_sec"] - r["virtual_clock_sec"]),
                branch_from=r.get("branch_from"),
            )
            if r["state"] in TERMINAL:
                out.update(
                    ai_step=r["ai_step"],
                    ai_steps_remaining=max(0, r["max_steps"] - r["ai_step"]),
                    current_ai_role=r["next_role"],
                    last_ai_decision=self.meta(r["last_decision"])
                    if r["last_decision"]
                    else None,
                )
            return out

    def workspace(self, rid, patch):
        with self.lock:
            r = self.active(rid)
            ws = self.store.get("workspace", rid)
            if patch.get("revision") != ws["revision"]:
                raise DomainError(
                    "Case changed in another session. Reload before saving."
                )
            allowed = {e["event_id"] for e in self.visible(r)}
            if any(
                i not in allowed for i in patch.get("evidence_ids", ws["evidence_ids"])
            ):
                raise DomainError("Evidence must be released in this run", 422)
            if any(
                i.get("event_id") not in allowed
                for i in patch.get("timeline", ws["timeline"])
            ):
                raise DomainError("Timeline evidence is unavailable", 422)
            for k in [
                "note",
                "hypothesis",
                "hypothesis_status",
                "evidence_ids",
                "timeline",
                "saved_queries",
            ]:
                if k in patch:
                    ws[k] = patch[k]
            ws["revision"] += 1
            self.store.put("workspace", rid, rid, ws)
            return self.snapshot(rid)

    def declare(self, rid, p):
        with self.lock:
            r = self.active(rid)
            events = {e["event_id"]: e for e in self.visible(r)}
            if not p["event_ids"] or any(x not in events for x in p["event_ids"]):
                raise DomainError(
                    "Evidence must be visible and belong to this run", 422
                )
            observed = {e.get("session_handle") for e in events.values()}
            actors = {e["actor_id"] for e in events.values()}
            if (
                p["suspected_session"] not in observed
                or p["suspected_actor"] not in actors
            ):
                raise DomainError("Choose an observed account and access handle", 422)
            d = {
                "declaration_id": uid("decl"),
                "run_id": rid,
                "accepted": True,
                **p,
                "rejected_event_ids": [],
                "created_at": now(),
                "virtual_clock_sec": r["virtual_clock_sec"],
            }
            r["declaration"] = d
            r["state_revision"] += 1
            self.store.put("declarations", d["declaration_id"], rid, d)
            self.event(
                r,
                "declaration.submitted",
                "control-defender",
                "analyst",
                outcome="applied",
                resource_id=d["declaration_id"],
            )
            self.store.save(r)
            self.checkpoint(r, "Incident declared")
            return d

    def defend(self, rid, p):
        with self.lock:
            r = self.active(rid)
            prior = next(
                (
                    a
                    for a in r["applied_actions"]
                    if a["idempotency_key"] == p["idempotency_key"]
                ),
                None,
            )
            if prior:
                if (
                    prior["action"] != p["action"]
                    or prior["target_handle"] != p["target_handle"]
                ):
                    raise DomainError(
                        "Idempotency key already used for another response"
                    )
                return prior
            if not r["declaration"]:
                raise DomainError("Declare the incident with evidence first", 422)
            action = p["action"]
            target = p["target_handle"]
            visible = self.visible(r)
            observed = {e.get("session_handle") for e in visible}
            actors = {e["actor_id"] for e in visible}
            if action.startswith("revoke") and target not in observed:
                raise DomainError("Choose an observed access handle", 422)
            if not action.startswith("revoke") and target not in actors:
                raise DomainError("Choose an observed account", 422)
            if (
                action == "revoke_api_credential"
                and "key_reporting" not in spec(r)["routes"]
            ):
                raise DomainError("Credential action unavailable in this scenario", 422)
            result = self.target.defend(rid, action, target, p["idempotency_key"])
            r["state_revision"] += 1
            r["verification"] = None
            a = {
                "action_id": uid("act"),
                "run_id": rid,
                "action": action,
                "target_handle": target,
                "idempotency_key": p["idempotency_key"],
                "applied": result["applied"],
                "target_audit_id": result["target_audit_id"],
                "applied_at": result["applied_at"],
                "virtual_clock_sec": r["virtual_clock_sec"],
                "measured_result": result["verified_result"],
                "result": "applied",
                "message": "Target confirmed the access-control change.",
                "declaration_id": r["declaration"]["declaration_id"],
                "evidence_ids": list(r["declaration"]["event_ids"]),
            }
            r["applied_actions"].append(a)
            if action == "temporarily_disable_account":
                r["broad_actions"] += 1
            self.store.put("defender_actions", a["action_id"], rid, a)
            self.ingest(r)
            # Verify actual access after every command, without trusting model reasons.
            suspicious = self.target.probe(rid, "suspicious")
            r["business"] = self.target.probe(rid, "benign")["measured_result"][
                "workflows"
            ]
            self.ingest(r)
            if suspicious["passed"] and r["effective_sec"] is None:
                r["effective_sec"] = r["virtual_clock_sec"]
            if not suspicious["passed"]:
                r["effective_sec"] = None
            r["next_role"] = "adaptation_planner"
            for route in suspicious["measured_result"]["routes"]:
                r["observed"][route["handle"]] = (
                    "revoked" if route["http_status"] != 200 else "active"
                )
            if any(
                route["http_status"] != 200
                for route in suspicious["measured_result"]["routes"]
            ):
                r["last_result"] = "denied"
            self.invalidate_case_steps(
                rid,
                {"recovery", "reporting"} if suspicious["passed"]
                else {"containment", "recovery", "reporting"},
            )
            r["state"] = "contained" if suspicious["passed"] else "running"
            self.store.save(r)
            self.checkpoint(r, "Response: " + action)
            return a

    def verify(self, rid, finish=False, finalize_on_success=True):
        with self.lock:
            r = self.active(rid)
            checks = []
            for kind in ["suspicious", "benign"]:
                p = self.target.probe(rid, kind)
                c = {"check_id": uid("check"), "run_id": rid, **p}
                checks.append(c)
                self.store.put("health_checks", c["check_id"], rid, c)
            r["business"] = checks[1]["measured_result"]["workflows"]
            self.ingest(r)
            r["verification"] = {
                "run_id": rid,
                "checks": checks,
                "all_passed": all(c["passed"] for c in checks),
                "verified_at": now(),
            }
            if not r["verification"]["all_passed"]:
                self.invalidate_case_steps(rid, {"recovery", "reporting"})
            if checks[0]["passed"] and r["effective_sec"] is None:
                r["effective_sec"] = r["virtual_clock_sec"]
            if (r["verification"]["all_passed"] and finalize_on_success) or finish:
                self.finish(r)
            else:
                r["state"] = (
                    "contained"
                    if r["verification"]["all_passed"]
                    else "verification_pending"
                )
                self.store.save(r)
            return r["verification"]

    def finish(self, r, reason=None):
        if r["state"] in TERMINAL:
            return
        checks = (
            r.get("verification", {}).get("checks", []) if r.get("verification") else []
        )
        denied = next(
            (
                x["passed"]
                for x in checks
                if x["verification"] == "verify_suspicious_session_denied"
            ),
            False,
        )
        healthy = next(
            (
                x["passed"]
                for x in checks
                if x["verification"] == "verify_benign_workflow"
            ),
            False,
        )
        outcome = (
            "attacker_objective_reached"
            if r["objective_reached"]
            else (
                "contained_but_disrupted"
                if denied and not healthy
                else (
                    "defended_and_recovered"
                    if denied and healthy
                    else "timed_out_unresolved"
                )
            )
        )
        if reason in {"aborted", "technical_failure"}:
            outcome = reason
        r.update(
            state=reason
            if reason in {"aborted", "technical_failure", "timed_out"}
            else "completed",
            outcome=outcome,
            ended_at=now(),
            thinking=False,
            terminal_reason=reason,
            state_revision=r["state_revision"] + 1,
        )
        self.event(
            r,
            "run.completed",
            outcome="verified" if outcome == "defended_and_recovered" else "failed",
        )
        self.store.save(r)
        self.store.put("scores", r["run_id"], r["run_id"], self.score(r))
        self.observer.release()
        if getattr(self, "on_terminal", None):
            self.on_terminal(r["run_id"])

    def score(self, r):
        events = self.store.events(r["run_id"])
        declaration = r["declaration"]
        ids = declaration["event_ids"] if declaration else []
        byid = {e["event_id"]: e for e in events}
        truth = [e for e in events if e.get("_origin") == "adversary"]
        badhandles = {e.get("session_handle") for e in truth}
        badactors = {e["actor_id"] for e in truth}
        recognition = 0
        if declaration:
            recognition = (
                (8 if declaration["suspected_session"] in badhandles else 0)
                + (6 if declaration["suspected_actor"] in badactors else 0)
                + min(
                    6,
                    2
                    * sum(
                        byid[x].get("actor_id") in badactors
                        or byid[x].get("session_handle") in badhandles
                        for x in ids
                        if x in byid
                    ),
                )
            )
        checks = r["verification"]["checks"] if r["verification"] else []
        denied = next(
            (
                x["passed"]
                for x in checks
                if x["verification"] == "verify_suspicious_session_denied"
            ),
            False,
        )
        healthy = next(
            (
                x["passed"]
                for x in checks
                if x["verification"] == "verify_benign_workflow"
            ),
            False,
        )
        delta = (
            None
            if r["effective_sec"] is None or r["first_signal_sec"] is None
            else max(0, r["effective_sec"] - r["first_signal_sec"])
        )
        limit = spec(r)["containment_target_sec"]
        timing = (
            0
            if delta is None
            else (
                10
                if delta <= limit
                else 7
                if delta <= limit * 2
                else 4
                if delta <= limit * 4
                else 2
                if delta <= limit * 6
                else 0
            )
        )
        restored = (
            any(a["action"] == "restore_account" for a in r["applied_actions"])
            and healthy
        )
        awards = [
            recognition,
            (15 if r["broad_actions"] else 25) if denied else 0,
            10 * sum(c["passed"] for c in checks),
            15 if healthy else 0,
            10 if not r["broad_actions"] else 5 if restored else 0,
            timing,
        ]
        citations = [
            ids,
            [a["action_id"] for a in r["applied_actions"]],
            [c["check_id"] for c in checks],
            [
                c["check_id"]
                for c in checks
                if c["verification"] == "verify_benign_workflow"
            ],
            [a["action_id"] for a in r["applied_actions"]],
            [r["first_signal_id"]] if r["first_signal_id"] else [],
        ]
        explanations = [
            f"Evidence supports {recognition}/20 recognition points.",
            "Measured denial across all objective-capable access routes."
            if denied
            else "At least one objective-capable route was not verified blocked.",
            "Fresh access and employee workflow probes.",
            "Employee work succeeds after the response."
            if healthy
            else "Legitimate work remains unavailable or unverified.",
            "Scope and restoration are evaluated from confirmed target changes.",
            "Scenario time from first released signal to effective containment; model latency excluded.",
        ]
        decisions = self.store.rows("agent_decisions", r["run_id"])
        return {
            "run_id": r["run_id"],
            "rubric_version": spec(r)["rubric"]["version"],
            "outcome": r["outcome"],
            "score_total": sum(awards),
            "breakdown": [
                {
                    "dimension": dim,
                    "awarded": awards[i],
                    "max_points": mx,
                    "rule_id": dim + ".measured",
                    "explanation": explanations[i],
                    "evidence_ids": citations[i],
                }
                for i, (dim, mx) in enumerate(
                    (d["dimension"], d["max_points"])
                    for d in spec(r)["rubric"]["dimensions"]
                )
            ],
            "outcome_gate": r["outcome"],
            "first_suspicious_event_id": r["first_signal_id"],
            "first_visible_at_utc": byid.get(r["first_signal_id"], {}).get(
                "visible_at_utc"
            ),
            "effective_containment": denied,
            "benign_workflow_passed": healthy,
            "fallback_used": any(d["fallback_used"] for d in decisions),
            "evidence_event_ids": ids,
            "computed_at": now(),
            "notes": [
                "Timeliness excludes model inference. Network addresses represent reviewed training client contexts."
            ],
            "model_provenance": {
                "model_id": decisions[-1]["model_id"]
                if decisions
                else "no model decision",
                "total_decisions": len(decisions),
                "fallback_count": sum(d["fallback_used"] for d in decisions),
                "median_latency_ms": statistics.median(
                    [d["latency_ms"] for d in decisions]
                )
                if decisions
                else 0,
            },
            "containment_time_delta_sec": delta,
            "containment_target_sec": spec(r)["containment_target_sec"],
            "disrupted_seconds": r["disrupted_seconds"],
        }

    def replay(self, rid):
        with self.lock:
            r = self.store.run(rid)
            if r["state"] not in TERMINAL:
                raise DomainError("Replay becomes available after the shift")
            result = {
                "run_id": rid,
                "scenario_id": r["scenario_id"],
                "outcome": r["outcome"],
                "read_only": True,
                "events": self.visible(r, True),
                "agent_decisions": self.store.rows("agent_decisions", rid),
                "defender_actions": r["applied_actions"],
                "declarations": self.store.rows("declarations", rid),
                "verification_checks": self.store.rows("health_checks", rid),
                "debrief": self.store.get("scores", rid),
                "workspace": self.store.get("workspace", rid),
                "variant": r.get("variant"),
                "seed": r["seed"],
                "objective_resource": spec(r).get("objective_resource", "doc_finance_07"),
                "learning": self.learning_debrief(r),
                "assistance_history": self.store.rows("assistant_turns", rid),
                "checkpoints": [
                    {"id": x["id"], "label": x["label"], "sequence": x["sequence"]}
                    for x in self.store.rows("checkpoints", rid)
                ],
            }
            result["trace_hash"] = digest(result)
            return result

    def checkpoint(self, r, label):
        events = self.store.events(r["run_id"])
        checkpoint = {
            "id": uid("cp"),
            "label": label,
            "sequence": events[-1]["sequence"] if events else 0,
            "world": self.target.world(r["run_id"]),
            "run": copy.deepcopy(r),
            "workspace": self.store.get("workspace", r["run_id"]),
        }
        self.store.put("checkpoints", checkpoint["id"], r["run_id"], checkpoint)

    def branch(self, rid, cid, owner):
        with self.lock:
            parent = self.store.run(rid)
            if parent["state"] not in TERMINAL:
                raise DomainError("End the original shift before branching")
            cp = self.store.get("checkpoints", cid)
            if not cp or cp["run"]["run_id"] != rid:
                raise DomainError("Checkpoint not found", 404)
            created = self.create(
                "practice",
                parent["scenario_id"],
                parent["scenario_version"],
                parent["seed"],
                "coached",
                owner,
                (parent.get("variant") or {}).get("id"),
            )
            newid = created["run_id"]
            self.target.destroy_target(newid)
            self.target.clone(
                newid, parent["seed"], parent["scenario_version"], cp["world"]
            )
            r = self.store.run(newid)
            for k in [
                "virtual_clock_sec",
                "observed",
                "observed_documents",
                "last_result",
                "last_action",
                "last_handle",
                "objective_reached",
                "broad_actions",
                "disrupted_seconds",
                "business",
                "first_signal_sec",
                "effective_sec",
                "next_role",
                "route_signal_count",
            ]:
                if k in cp["run"]:
                    r[k] = cp["run"][k]
            r.update(
                state="running",
                started_at=now(),
                branch_from={"run_id": rid, "checkpoint_id": cid},
                next_ai_sec=r["virtual_clock_sec"] + spec(r)["first_ai_sec"],
                next_background_sec=r["virtual_clock_sec"],
            )
            remap = {}
            history = [
                e for e in self.store.events(rid) if e["sequence"] <= cp["sequence"]
            ]
            for e in history:
                new = {
                    **e,
                    "event_id": uid("evt"),
                    "run_id": newid,
                    "parent_event_id": e["event_id"],
                }
                remap[e["event_id"]] = new["event_id"]
                new.pop("sequence", None)
                self.store.append(newid, new)
            ws = copy.deepcopy(cp["workspace"])
            ws["evidence_ids"] = [remap[x] for x in ws["evidence_ids"] if x in remap]
            ws["timeline"] = [
                {**x, "event_id": remap[x["event_id"]]}
                for x in ws["timeline"]
                if x["event_id"] in remap
            ]
            ws["alerts"] = []
            self.store.put("workspace", newid, newid, ws)
            r["first_signal_id"] = remap.get(cp["run"]["first_signal_id"])
            r["route_first_signal"] = cp["run"]["route_first_signal"]
            self.store.save(r)
            return self.snapshot(newid)

    def allowed(self, r):
        actions = ["inspect_session_status", "test_existing_session", "wait", "stop"]
        if r["next_role"] != "adaptation_planner":
            actions += ["list_accessible_documents"]
        if (
            r["next_role"] == "access_operator"
            and r["first_signal_sec"] is not None
            and sum(r.get("route_signal_count", {}).values())
            >= spec(r)["minimum_signals_before_first_protected_read"]
            and r["virtual_clock_sec"]
            >= r["first_signal_sec"] + spec(r)["first_read_sec"]
        ):
            actions += ["request_document"]
        return actions

    def tick(self, rid, seconds=1):
        if self.observer_failed:
            return
        with self.lock:
            r = self.store.run(rid)
            if (
                r["state"] in TERMINAL
                or r["state"] == "created"
                or r["paused"]
                or r["thinking"]
                or r.get("ai_unavailable")
            ):
                return
            r["virtual_clock_sec"] += seconds
            if any(not x["passed"] for x in r["business"]):
                r["disrupted_seconds"] += seconds
            if r["virtual_clock_sec"] >= r["next_background_sec"]:
                p = self.target.probe(rid, "benign")
                r["business"] = p["measured_result"]["workflows"]
                r["next_background_sec"] = r["virtual_clock_sec"] + 6
                if int(r["virtual_clock_sec"]) % 24 < 6:
                    self.target.request(
                        rid, "test_existing_session", "sess_unknown", None, "employee"
                    )
                self.ingest(r)
            self.pressure(r)
            self.store.save(r)
            if r["virtual_clock_sec"] >= spec(r)["duration_sec"]:
                self.verify(rid, True)
                r = self.store.run(rid)
                if r["outcome"] == "timed_out_unresolved":
                    r["state"] = "timed_out"
                    self.store.save(r)

    def pressure(self, r):
        ws = self.store.get("workspace", r["run_id"])
        messages = ws["messages"]
        if any(not w["passed"] for w in r["business"]) and not any(
            m["kind"] == "disruption" for m in messages
        ):
            messages.append(
                {
                    "id": uid("msg"),
                    "kind": "disruption",
                    "from": "Operations desk",
                    "text": "An employee workflow is failing. Please assess the impact of recent access changes.",
                    "at_sec": r["virtual_clock_sec"],
                }
            )
        lead_update = spec(r).get("lead_update_sec")
        if (
            lead_update is not None
            and r["virtual_clock_sec"] >= lead_update
            and not any(m["kind"] == "update" for m in messages)
        ):
            messages.append(
                {
                    "id": uid("msg"),
                    "kind": "update",
                    "from": "Shift lead",
                    "text": "Please provide your current hypothesis, affected scope, and next response step.",
                    "at_sec": r["virtual_clock_sec"],
                }
            )
        self.store.put("workspace", r["run_id"], r["run_id"], ws)

    def decide(self, rid, retry=False):
        if self.observer_failed:
            return
        with self.lock:
            r = self.store.run(rid)
            if (
                r["state"] in TERMINAL
                or r["state"] == "created"
                or r["paused"]
                or r["thinking"]
                or (r.get("ai_unavailable") and not retry)
                or r["virtual_clock_sec"] < r["next_ai_sec"]
                or r["ai_step"] >= r["max_steps"]
            ):
                return
            world = self.target.world(rid)
            version = r["state_revision"]
            if not self.model_lock.acquire(blocking=False):
                return
            r["thinking"] = True
            self.store.save(r)
            snapshot = copy.deepcopy(r)
            allowed = self.allowed(r)
            decision_id = uid("decision")
        def record(kind, payload):
            with self.lock:
                if self.observer_failed:
                    raise DomainError("Observer audit failed; pending model work is fenced", 507)
                try:
                    self.observer.emit(snapshot, kind, payload, decision_id)
                except Exception:
                    self.observer_failed = True
                    LOGGER.exception("Observer evidence write failed; dispatch is fenced")
                    try:
                        self.finish(self.store.run(rid), "technical_failure")
                    except Exception:
                        LOGGER.exception("Cannot persist audit failure; dispatch remains fenced")
                    raise
        try:
            record("decision.started", {"role": snapshot["next_role"], "step": snapshot["ai_step"]})
            recording = getattr(self.agent, "recording", None)
            with recording(record) if recording else nullcontext():
                trace = self.agent.decide(snapshot, world, allowed)
            if not isinstance(trace, dict) or not isinstance(
                trace.get("proposal"), dict
            ):
                raise ValueError("Invalid model trace")
            trace = {
                "accepted": False,
                "fallback_used": False,
                "latency_ms": 0,
                "model_id": "unavailable",
                **trace,
            }
        except Exception as e:
            LOGGER.exception(
                "Agent failed; system-pausing pending turn",
                extra={"run_id": rid},
            )
            trace = {
                "proposal": {
                    "role": snapshot["next_role"],
                    "action": "wait",
                    "session_handle": None,
                    "target_id": None,
                    "reason": "Model unavailable.",
                },
                "accepted": False,
                "fallback_used": True,
                "latency_ms": 0,
                "rejection_reason": type(e).__name__,
                "model_id": "unavailable",
                "prompt_hash": digest("unavailable"),
                "observation_hash": digest(allowed),
            }
        finally:
            self.model_lock.release()
        with self.lock:
            if self.observer_failed:
                return
            r = self.store.run(rid)
            if r["state"] in TERMINAL:
                record("decision.stale", {"reason": "Run ended during inference; no action executed."})
                return
            r["thinking"] = False
            proposal = trace["proposal"]
            from .agent import observation, validator

            h = proposal.get("session_handle")
            access = world["access"].get(h, {})
            policy_obs = observation.build_sanitized_observation(
                run_handle=rid,
                assigned_role=snapshot["next_role"],
                step=snapshot["ai_step"],
                steps_remaining=snapshot["max_steps"] - snapshot["ai_step"],
                session_handles=list(spec(snapshot)["routes"]),
                allowed_target_ids=[spec(snapshot).get("objective_resource", "doc_finance_07")],
                current_session_status=access.get("status", "unknown"),
                permitted_actions=allowed,
            )
            boundary = validator.validate_action(json.dumps(proposal), policy_obs)
            if not boundary.accepted:
                trace.update(accepted=False, rejection_reason=boundary.rejection_reason)
            stale = r["state_revision"] != version or r["paused"]
            accepted = trace["accepted"] and not stale
            d = {
                "decision_id": decision_id,
                "run_id": rid,
                "step": r["ai_step"],
                "role": snapshot["next_role"],
                "model_id": trace["model_id"],
                "prompt_hash": trace.get("prompt_hash") or digest("unknown"),
                "observation_hash": trace.get("observation_hash") or digest(allowed),
                "proposed_json": proposal,
                "raw_proposal": trace.get("raw_proposal"),
                "selection": trace.get("selection"),
                "accepted_action": proposal["action"] if accepted else None,
                "accepted": accepted,
                "rejection_reason": "State changed during inference; no action executed."
                if stale
                else trace.get("rejection_reason"),
                "latency_ms": int(trace["latency_ms"]),
                "fallback_used": trace["fallback_used"],
                "created_at": now(),
            }
            record("decision.validation", self.meta(d))
            # Detailed model text has a seven-day encrypted home. Legacy decision
            # metadata retains action provenance without duplicating that text.
            d["proposed_json"] = {**proposal, "reason": "Intent withheld from legacy metadata; see restricted observer history."}
            if not boundary.accepted:
                d["proposed_json"] = {"role": snapshot["next_role"], "action": None, "session_handle": None, "target_id": None,
                                      "reason": "Rejected proposal withheld; see restricted observer history."}
            d["raw_proposal"] = None
            if d["rejection_reason"] and not stale:
                d["rejection_reason"] = "Model proposal unavailable or rejected; see restricted observer history."
            self.store.put("agent_decisions", d["decision_id"], rid, d)
            r["last_decision"] = d
            self.event(
                r,
                "agent.decision",
                "red-agent",
                "model",
                learner_visible=False,
                decision_id=d["decision_id"],
            )
            if stale:
                # A defender mutation invalidates the observation, not the model.
                r["next_ai_sec"] = r["virtual_clock_sec"]
                self.store.save(r)
                return
            if not accepted or trace.get("fallback_used"):
                r["ai_unavailable"] = True
                self.event(r, "ai.unavailable", "system", "system")
                self.store.save(r)
                return
            if r.get("ai_unavailable"):
                self.event(r, "ai.resumed", "system", "system")
            r["ai_unavailable"] = False
            r["ai_step"] += 1
            # Validate again at the execution boundary, including pacing and chosen-handle route age.
            if accepted and proposal["action"] not in self.allowed(r):
                accepted = False
                d["accepted"] = False
                d["accepted_action"] = None
                d["rejection_reason"] = "Execution policy changed"
                self.store.put("agent_decisions", d["decision_id"], rid, d)
            if accepted and proposal["action"] not in {"wait", "stop"}:
                handle = proposal["session_handle"]
                routes = spec(r)["routes"]
                if handle not in routes:
                    raise DomainError("Agent handle not allowed", 422)
                if (
                    proposal["action"] == "request_document"
                    and len(routes) > 1
                    and (
                        r.get("route_signal_count", {}).get(handle, 0)
                        < spec(r)["minimum_signals_before_first_protected_read"]
                        or handle not in r["route_first_signal"]
                        or r["virtual_clock_sec"]
                        < r["route_first_signal"][handle] + spec(r)["pivot_window_sec"]
                    )
                ):
                    d.update(
                        accepted=False,
                        accepted_action=None,
                        rejection_reason="Route response window not elapsed",
                    )
                    self.store.put("agent_decisions", d["decision_id"], rid, d)
                    record("decision.rejected", {"reason": d["rejection_reason"]})
                else:
                    record("target.dispatched", {"action": proposal["action"], "session_handle": handle, "target_id": proposal.get("target_id")})
                    result = self.target.request(
                        rid, proposal["action"], handle, proposal.get("target_id")
                    )
                    record("target.confirmed", result)
                    r["last_action"] = proposal["action"]
                    r["last_result"] = result["outcome"]
                    r["last_handle"] = handle
                    r["observed"][handle] = result["result"].get(
                        "status",
                        "active" if result["http_status"] in {200, 403} else "revoked",
                    )
                    if proposal["action"] == "list_accessible_documents" and result["http_status"] == 200:
                        r.setdefault("observed_documents", {})[handle] = list(result["result"]["documents"])
                    self.ingest(r, d["decision_id"])
            if accepted and proposal["action"] == "stop":
                r["ai_step"] = r["max_steps"]
            if r["last_result"] == "denied":
                r["next_role"] = "adaptation_planner"
            elif snapshot["next_role"] == "adaptation_planner" or r["ai_step"] >= 1:
                r["next_role"] = "access_operator"
            r["next_ai_sec"] = r["virtual_clock_sec"] + spec(r)["ai_interval_sec"]
            self.store.save(r)
            if r["objective_reached"]:
                self.verify(rid, True)
