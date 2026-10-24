from __future__ import annotations

import json
import secrets
import sqlite3
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from .common import DomainError, digest, now, uid

ACTIONS = {
    "inspect_session_status",
    "list_accessible_documents",
    "request_document",
    "test_existing_session",
    "wait",
    "stop",
}
DEFENSE = {
    "revoke_session",
    "require_reauthentication",
    "temporarily_disable_account",
    "restore_account",
    "revoke_api_credential",
}


def initial_world(version="v1"):
    world = {
        "users": {
            "maya": {"name": "Maya Chen", "active": True},
            "eli": {"name": "Eli Rao", "active": True},
            "reporting": {"name": "Reporting service", "active": True},
        },
        "access": {
            "sess_A": {
                "owner": "maya",
                "kind": "browser_session",
                "status": "active",
                "documents": ["doc_finance_07", "doc_ops_02"],
            },
            "sess_maya_work": {
                "owner": "maya",
                "kind": "browser_session",
                "status": "active",
                "documents": ["doc_finance_07", "doc_ops_02"],
            },
            "sess_eli": {
                "owner": "eli",
                "kind": "browser_session",
                "status": "active",
                "documents": ["doc_ops_02", "doc_handbook_01"],
            },
        },
        "documents": {
            "doc_finance_07": {
                "title": "Q4 Finance Reconciliation",
                "classification": "confidential",
                "contents": "Synthetic finance report for Northstar training.",
            },
            "doc_ops_02": {
                "title": "Operations Runbook",
                "classification": "internal",
                "contents": "Synthetic operations checklist.",
            },
            "doc_handbook_01": {
                "title": "Employee Handbook",
                "classification": "internal",
                "contents": "Synthetic handbook.",
            },
        },
    }
    if version != "v1":
        world["access"]["key_reporting"] = {
            "owner": "reporting",
            "kind": "api_credential",
            "status": "active",
            "documents": ["doc_finance_07", "doc_ops_02"],
        }
        world["access"]["key_reporting_work"] = {
            "owner": "reporting",
            "kind": "api_credential",
            "status": "active",
            "documents": ["doc_ops_02"],
        }
    return world


class TargetStore:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript(
            "CREATE TABLE IF NOT EXISTS worlds (run_id TEXT PRIMARY KEY, world TEXT NOT NULL); CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY AUTOINCREMENT,run_id TEXT NOT NULL,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS commands (run_id TEXT NOT NULL, key TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(run_id,key));"
        )
        self.lock = threading.RLock()

    def world(self, rid):
        row = self.db.execute(
            "SELECT world FROM worlds WHERE run_id=?", (rid,)
        ).fetchone()
        if not row:
            raise DomainError("Target does not exist", 404)
        return json.loads(row["world"])

    def save(self, rid, w):
        self.db.execute(
            "INSERT OR REPLACE INTO worlds VALUES (?,?)", (rid, json.dumps(w))
        )

    def provision(self, rid, version, seed, world=None, variant_id=None):
        with self.lock, self.db:
            if self.db.execute(
                "SELECT 1 FROM worlds WHERE run_id=?", (rid,)
            ).fetchone():
                raise DomainError("Target already provisioned")
            w = world or initial_world(version)
            if world is None and variant_id is not None:
                from .variants import select_variant, apply_variant
                cfg = select_variant("stolen-session" if version == "v1" else "northstar-breach", version, variant_id)
                w = apply_variant(w, cfg, seed)
            self.save(rid, w)
            return {
                "target_instance_id": "target_" + rid,
                "run_id": rid,
                "fixture_hash": digest({"version": version, "seed": seed, "world": w}),
                "created_at": now(),
            }

    def audit(
        self,
        rid,
        actor,
        event_type,
        outcome,
        handle=None,
        resource=None,
        detail=None,
        correlation=None,
    ):
        record = {
            "audit_id": uid("audit"),
            "run_id": rid,
            "correlation_id": correlation or uid("req"),
            "occurred_at": now(),
            "actor_id": actor,
            "event_type": event_type,
            "outcome": outcome,
            "session_handle": handle,
            "resource_id": resource,
            "detail": detail or {},
        }
        self.db.execute(
            "INSERT INTO audit(run_id,data) VALUES (?,?)", (rid, json.dumps(record))
        )
        return record

    def request(self, rid, action, handle=None, target=None, client="adversary"):
        if action not in ACTIONS:
            raise DomainError("Action not permitted", 422)
        with self.lock, self.db:
            w = self.world(rid)
            a = w["access"].get(handle)
            owner = a["owner"] if a else "unknown"
            active = bool(a and a["status"] == "active" and w["users"][owner]["active"])
            status = a["status"] if a else "unknown"
            if a and not w["users"][owner]["active"]:
                status = "disabled"
            code = 200 if active else 401
            event = "session.status"
            outcome = "allowed" if active else "denied"
            result = {"status": status}
            path = "/session/status"
            if action == "list_accessible_documents":
                event = "document.list"
                path = "/documents"
                outcome = "listed" if active else "denied"
                result = {"documents": a["documents"] if active else []}
            elif action == "request_document":
                event = "document.access"
                path = "/documents/" + str(target)
                permitted = (
                    active and target in a["documents"] and target in w["documents"]
                )
                code = 200 if permitted else (403 if active else 401)
                outcome = "allowed" if permitted else "denied"
                result = (
                    w["documents"][target] if permitted else {"error": "Access denied"}
                )
            elif action == "test_existing_session":
                event = "session.status"
            elif action in {"wait", "stop"}:
                row = self.audit(
                    rid,
                    "system",
                    "session.status",
                    "none",
                    detail={"action": action, "client_context": client},
                )
                return {
                    "request_id": row["correlation_id"],
                    "run_id": rid,
                    "action": action,
                    "http_status": 200,
                    "outcome": "none",
                    "result": {"control_action": action},
                    "target_audit_id": row["audit_id"],
                    "session_handle": None,
                    "target_id": None,
                }
            if a and a["kind"] == "api_credential":
                path = "/reporting" + path
            detail = {
                "network": {
                    "src_ip": "203.0.113.57"
                    if client == "adversary"
                    else ("192.0.2.21" if owner == "maya" else "192.0.2.22"),
                    "user_agent": "Northstar-training-client/1"
                    if client == "adversary"
                    else "Northstar-employee-browser/1",
                    "http_method": "GET",
                    "path": path,
                    "status_code": code,
                    "latency_ms": 1,
                },
                "client_context": client,
                "training_network_attribution": True,
            }
            row = self.audit(rid, owner, event, outcome, handle, target, detail)
            return {
                "request_id": row["correlation_id"],
                "run_id": rid,
                "action": action,
                "http_status": code,
                "outcome": outcome,
                "result": result,
                "target_audit_id": row["audit_id"],
                "session_handle": handle,
                "target_id": target,
            }

    def defend(self, rid, action, target, key):
        if action not in DEFENSE:
            raise DomainError("Response not permitted", 422)
        with self.lock, self.db:
            prior = self.db.execute(
                "SELECT result FROM commands WHERE run_id=? AND key=?", (rid, key)
            ).fetchone()
            if prior:
                payload = json.loads(prior["result"])
                if payload["action"] != action or payload["target_handle"] != target:
                    raise DomainError("Idempotency key belongs to a different command")
                return payload
            w = self.world(rid)
            transition = {}
            if action in {"revoke_session", "revoke_api_credential"}:
                if target not in w["access"]:
                    raise DomainError("Unknown access handle", 422)
                a = w["access"][target]
                if (action == "revoke_api_credential") != (
                    a["kind"] == "api_credential"
                ):
                    raise DomainError("Response does not match access kind", 422)
                a["status"] = "revoked"
                transition = {"access_status": "revoked"}
                actor = a["owner"]
                event = "session.revoked"
            else:
                if target not in w["users"]:
                    raise DomainError(
                        "Account operation requires an account handle", 422
                    )
                actor = target
                if action == "temporarily_disable_account":
                    w["users"][target]["active"] = False
                    for a in w["access"].values():
                        if a["owner"] == target:
                            a["status"] = "revoked"
                    transition = {"account_status": "disabled"}
                    event = "account.disabled"
                elif action == "restore_account":
                    w["users"][target]["active"] = True
                    transition = {"account_status": "active"}
                    event = "account.restored"
                else:
                    for a in w["access"].values():
                        if a["owner"] == target and a["kind"] == "browser_session":
                            a["status"] = "revoked"
                    transition = {"access_status": "reauthentication_required"}
                    event = "session.reauth_required"
            self.save(rid, w)
            audit = self.audit(
                rid,
                actor,
                event,
                "none",
                target if action.startswith("revoke") else None,
                action,
                {"state_transition": transition},
            )
            result = {
                "run_id": rid,
                "action": action,
                "target_handle": target,
                "applied": True,
                "verified_result": transition,
                "target_audit_id": audit["audit_id"],
                "state_transition": transition,
                "applied_at": audit["occurred_at"],
            }
            self.db.execute(
                "INSERT INTO commands VALUES (?,?,?)", (rid, key, json.dumps(result))
            )
            return result

    def benign(self, rid):
        with self.lock, self.db:
            w = self.world(rid)
            results = []
            config = w.get("learning_config", {})
            workflows = config.get("workflows") or [
                {"owner": owner, "resource": "doc_ops_02", "kind": "browser_session"}
                for owner in ["maya", "eli"] + (["reporting"] if "key_reporting" in w["access"] else [])
            ]
            for workflow in workflows:
                owner, resource = workflow["owner"], workflow["resource"]
                # Fresh legitimate authentication can recover from reauth, never from disabled account.
                handle = "work_" + owner
                if w["users"][owner]["active"]:
                    w["access"][handle] = {
                        "owner": owner,
                        "kind": workflow["kind"],
                        "status": "active",
                        "documents": [resource],
                    }
                self.save(rid, w)
                r = self.request(rid, "request_document", handle, resource, "employee")
                results.append(
                    {
                        "workflow_id": owner + "_daily_work",
                        "user_id": owner,
                        "passed": r["http_status"] == 200,
                        "target_audit_id": r["target_audit_id"],
                        "http_status": r["http_status"],
                    }
                )
            concurrent = config.get("concurrent_handles", [])
            if concurrent:
                cursor = w.get("background_cursor", 0)
                handle = concurrent[(cursor + config["seed"]) % len(concurrent)]
                self.request(rid, "request_document", handle, "doc_ops_02", "employee")
                if config.get("background_denial") and cursor % 2 == 0:
                    self.request(rid, "request_document", handle, "doc_handbook_01", "employee")
                w["background_cursor"] = cursor + 1
                self.save(rid, w)
            return results

    def probe(self, rid, suspicious=False):
        if not suspicious:
            rows = self.benign(rid)
            return {
                "verification": "verify_benign_workflow",
                "passed": all(r["passed"] for r in rows),
                "measured_result": {
                    "workflows": rows,
                    "http_status": 200 if all(r["passed"] for r in rows) else 403,
                },
                "target_audit_id": rows[-1]["target_audit_id"],
                "checked_at": now(),
            }
        w = self.world(rid)
        handles = w.get("learning_config", {}).get("routes") or (["sess_A"] + (
            ["key_reporting"] if "key_reporting" in w["access"] else []
        ))
        objective = w.get("learning_config", {}).get("objective_resource", "doc_finance_07")
        rs = [
            self.request(rid, "request_document", h, objective, "verification")
            for h in handles
        ]
        return {
            "verification": "verify_suspicious_session_denied",
            "passed": all(r["http_status"] != 200 for r in rs),
            "measured_result": {
                "routes": [
                    {
                        "handle": r["session_handle"],
                        "http_status": r["http_status"],
                        "target_audit_id": r["target_audit_id"],
                    }
                    for r in rs
                ],
                "http_status": 403 if all(r["http_status"] != 200 for r in rs) else 200,
            },
            "target_audit_id": rs[-1]["target_audit_id"],
            "checked_at": now(),
        }

    def events(self, rid, cursor=0):
        self.world(rid)
        return [
            {**json.loads(r["data"]), "cursor": r["seq"]}
            for r in self.db.execute(
                "SELECT seq,data FROM audit WHERE run_id=? AND seq>? ORDER BY seq",
                (rid, cursor),
            )
        ]

    def destroy(self, rid):
        with self.lock, self.db:
            self.db.execute("DELETE FROM worlds WHERE run_id=?", (rid,))
            return {
                "run_id": rid,
                "destroyed": True,
                "proof": digest({"destroyed": rid}),
                "destroyed_at": now(),
            }


class Provision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    run_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    seed: int = 0
    scenario_version: str = "v1"
    world: dict | None = None
    variant_id: str | None = None


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str
    session_handle: str | None = None
    target_id: str | None = None
    client: str = "adversary"


class Defense(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str
    target_handle: str
    idempotency_key: str


def create_target(path, secret):
    if not secret:
        raise ValueError("Target secret required")
    app = FastAPI(title="Northstar isolated target")
    store = TargetStore(path)
    app.state.store = store

    @app.middleware("http")
    async def auth(request, call_next):
        if not secrets.compare_digest(
            request.headers.get("x-range-secret", ""), secret
        ):
            return JSONResponse({"message": "Unauthorized"}, status_code=401)
        try:
            return await call_next(request)
        except DomainError as e:
            return JSONResponse({"message": e.message}, status_code=e.status)

    @app.exception_handler(DomainError)
    async def domain(request, e):
        return JSONResponse({"message": e.message}, status_code=e.status)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/targets")
    def provision(p: Provision):
        return store.provision(p.run_id, p.scenario_version, p.seed, p.world, p.variant_id)

    @app.post("/targets/{rid}/request")
    def request(rid: str, p: Command):
        r = store.request(rid, p.action, p.session_handle, p.target_id, p.client)
        return JSONResponse(
            r, status_code=r["http_status"] if r["http_status"] != 204 else 200
        )

    @app.post("/targets/{rid}/defense")
    def defend(rid: str, p: Defense):
        return store.defend(rid, p.action, p.target_handle, p.idempotency_key)

    @app.post("/targets/{rid}/probe/{kind}")
    def probe(rid: str, kind: str):
        if kind not in {"suspicious", "benign"}:
            raise DomainError("Unknown probe", 422)
        return store.probe(rid, kind == "suspicious")

    @app.get("/targets/{rid}/events")
    def events(rid: str, cursor: int = 0):
        return store.events(rid, cursor)

    @app.get("/targets/{rid}/checkpoint")
    def checkpoint(rid: str):
        return store.world(rid)

    @app.delete("/targets/{rid}")
    def destroy(rid: str):
        return store.destroy(rid)

    return app
