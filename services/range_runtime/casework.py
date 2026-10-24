"""Authenticated, run-scoped incident workflow. No browser answer keys or scores."""

from .common import DomainError, now

STEPS = ("evidence", "scope", "declaration", "containment", "recovery", "reporting")


class Casework:
    def case_workspace(self, rid):
        ws = self.store.get("workspace", rid)
        # Old handoff cases and investigation notes remain intact.
        for c in ws.get("cases", []):
            c.setdefault("opened", True)
            c.setdefault("revision", 0)
            c.setdefault("alert_ids", [])
            c.setdefault("artifacts", [])
            c.setdefault("note", "")
            c.setdefault("scope", "")
            c.setdefault("report", "")
            c.setdefault("playbook_started", False)
            c.setdefault("completed_steps", [])
            c.setdefault("creation_keys", {})
        return ws

    def invalidate_case_steps(self, rid, steps):
        ws = self.case_workspace(rid)
        changed = False
        for c in ws["cases"]:
            kept = [s for s in c["completed_steps"] if s not in steps]
            if kept != c["completed_steps"]:
                c["completed_steps"] = kept
                c["status"] = "open"
                c["revision"] += 1
                c["submission_valid"] = False
                changed = True
        if changed:
            self.save_case_workspace(rid, ws)

    def save_case_workspace(self, rid, ws):
        ws["revision"] += 1
        self.store.put("workspace", rid, rid, ws)

    def update_alert(self, rid, aid, p, analyst):
        with self.lock:
            r = self.active(rid)
            ws = self.case_workspace(rid)
            a = next((a for a in ws["alerts"] if a["id"] == aid), None)
            if not a:
                raise DomainError("Alert not found", 404)
            if p.get("revision") is not None and p["revision"] != a.get("revision", 0):
                raise DomainError(
                    "Alert changed in another session. Reload before saving."
                )
            if a["status"] == "closed":
                raise DomainError("Closed alerts are read-only")
            status = p["status"]
            if status == "new":
                raise DomainError("Use ownership to begin investigation", 422)
            if status == "investigating":
                if a.get("owner_id") and a["owner_id"] != analyst["id"]:
                    raise DomainError("This alert is already owned by another analyst")
                a.update(owner_id=analyst["id"], owner=analyst["name"], owned_at=now())
            else:
                if a["status"] != "investigating" or not a.get("owner_id"):
                    raise DomainError("Take ownership before closing an alert", 422)
                if not p.get("verdict") or not (p.get("comment") or "").strip():
                    raise DomainError(
                        "Classification and analyst comment required", 422
                    )
                a.update(
                    verdict=p["verdict"],
                    closure_comment=p["comment"],
                    closed_by=analyst["id"],
                    closed_at=now(),
                )
            a["status"] = status
            a["revision"] = a.get("revision", 0) + 1
            self.save_case_workspace(rid, ws)
            self.event(
                r,
                "alert." + status,
                "control-defender",
                analyst["id"],
                resource_id=aid,
                outcome="applied",
            )
            return self.snapshot(rid)

    def create_case(self, rid, p, analyst):
        with self.lock:
            r = self.active(rid)
            ws = self.case_workspace(rid)
            a = next((a for a in ws["alerts"] if a["id"] == p["alert_id"]), None)
            if not a:
                raise DomainError("Alert not found", 404)
            c = ws["cases"][0]
            keys = c["creation_keys"]
            key = p["idempotency_key"]
            if key in keys and keys[key] != p["alert_id"]:
                raise DomainError("Idempotency key already used for a different alert")
            if key in keys or a.get("case_id") == c["id"]:
                return self.snapshot(rid)
            if a["status"] != "investigating" or not a.get("owner_id"):
                raise DomainError("Take ownership before creating a case", 422)
            keys[key] = p["alert_id"]
            if not c["opened"]:
                c.update(
                    opened=True,
                    title=r["scenario"]["title"],
                    owner=analyst["name"],
                    owner_id=analyst["id"],
                    created_at=now(),
                )
            c["alert_ids"] = list(dict.fromkeys(c["alert_ids"] + [a["id"]]))
            c["revision"] += 1
            a["case_id"] = c["id"]
            a["revision"] = a.get("revision", 0) + 1
            self.save_case_workspace(rid, ws)
            self.event(
                r,
                "case.alert_linked",
                "control-defender",
                analyst["id"],
                resource_id=c["id"],
                outcome="applied",
            )
            return self.snapshot(rid)

    def update_case(self, rid, cid, p, analyst):
        with self.lock:
            r = self.active(rid)
            ws = self.case_workspace(rid)
            c = next((c for c in ws["cases"] if c["id"] == cid and c["opened"]), None)
            if not c:
                raise DomainError("Case not found", 404)
            if p["revision"] != c["revision"]:
                raise DomainError(
                    "Case changed in another session. Reload before saving."
                )
            visible = {e["event_id"] for e in self.visible(r)}
            for artifact in p.get("artifacts", c["artifacts"]):
                if not artifact["event_ids"] or any(
                    e not in visible for e in artifact["event_ids"]
                ):
                    raise DomainError(
                        "Artifacts must cite released evidence in this exercise", 422
                    )
            updated = {
                **c,
                **{k: p[k] for k in ("note", "scope", "report", "artifacts") if k in p},
            }
            if p.get("start_playbook"):
                updated["playbook_started"] = True
            step = p.get("complete_step")
            if step:
                if not updated["playbook_started"]:
                    raise DomainError("Start the playbook first", 422)
                idx = STEPS.index(step)
                if any(x not in c["completed_steps"] for x in STEPS[:idx]):
                    raise DomainError("Complete preceding playbook steps first", 422)
                checks = {
                    "evidence": bool(ws["evidence_ids"]),
                    "scope": bool(updated["scope"].strip()),
                    "declaration": bool(r["declaration"]),
                    "containment": r["effective_sec"] is not None,
                    "recovery": bool(
                        r["verification"] and r["verification"]["all_passed"]
                    ),
                    "reporting": bool(
                        updated["report"].strip()
                        and r["verification"]
                        and r["verification"]["all_passed"]
                    ),
                }
                if not checks[step]:
                    raise DomainError(
                        "This step requires recorded evidence or a confirmed result",
                        422,
                    )
                updated["completed_steps"] = list(
                    dict.fromkeys(c["completed_steps"] + [step])
                )
                if step == "reporting":
                    updated["status"] = "closed"
                    updated["submission_valid"] = True
                    updated["submitted_report"] = {
                        "text": updated["report"],
                        "submitted_at": now(),
                        "submitted_by": analyst["id"],
                        "case_revision": c["revision"] + 1,
                        "event_ids": list(ws["evidence_ids"]),
                        "verification_ids": [x["check_id"] for x in r["verification"]["checks"]],
                    }
                    updated.setdefault("report_history", []).append(updated["submitted_report"])
            updated["revision"] += 1
            ws["cases"][ws["cases"].index(c)] = updated
            self.save_case_workspace(rid, ws)
            self.event(
                r,
                "case.updated",
                "control-defender",
                analyst["id"],
                resource_id=cid,
                outcome="applied",
            )
            return self.snapshot(rid)
