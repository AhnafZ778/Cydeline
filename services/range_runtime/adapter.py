from __future__ import annotations

from contracts.adapter import (
    AttackerActionResult,
    DefenderActionResult,
    ProbeResult,
    TargetAuditEntry,
    TargetProvisionResult,
    TeardownProof,
)

from .common import DomainError


class HttpTargetAdapter:
    """Fixed-path HTTP transport; model-provided URLs are never accepted."""

    def __init__(self, client):
        self.client = client

    def call(self, method, path, **kwargs):
        r = self.client.request(method, path, **kwargs)
        data = r.json()
        if r.status_code >= 400 and "http_status" not in data:
            raise DomainError(
                data.get("message", "Target request failed"), r.status_code
            )
        return data

    def health(self):
        """Liveness of the target service itself (short timeout so a hung target cannot stall the health endpoint)."""
        return self.client.request("GET", "/health", timeout=3).status_code == 200

    def create_fresh_target(self, run_id, seed, scenario_version, variant_id=None):
        return TargetProvisionResult.model_validate(
            self.call(
                "POST",
                "/targets",
                json={
                    "run_id": run_id,
                    "seed": seed,
                    "scenario_version": scenario_version,
                    "variant_id": variant_id,
                },
            )
        )

    def execute_allowlisted_attacker_action(self, run_id, action, handles):
        return AttackerActionResult.model_validate(
            self.request(
                run_id,
                str(getattr(action, "value", action)),
                handles.session_handle,
                handles.target_id,
            )
        )

    def request(self, rid, action, handle=None, target=None, client="adversary"):
        return self.call(
            "POST",
            f"/targets/{rid}/request",
            json={
                "action": action,
                "session_handle": handle,
                "target_id": target,
                "client": client,
            },
        )

    def apply_defender_action(self, run_id, action, target):
        from .common import uid

        return DefenderActionResult.model_validate(
            self.defend(
                run_id, str(getattr(action, "value", action)), target, uid("cmd")
            )
        )

    def defend(self, rid, action, target, key):
        return self.call(
            "POST",
            f"/targets/{rid}/defense",
            json={"action": action, "target_handle": target, "idempotency_key": key},
        )

    def get_target_events(self, run_id, cursor=None):
        return [
            TargetAuditEntry.model_validate(
                {k: v for k, v in r.items() if k != "cursor"}
            )
            for r in self.audit_page(run_id, cursor or 0)
        ]

    def audit_page(self, rid, cursor=0):
        return self.call("GET", f"/targets/{rid}/events", params={"cursor": cursor})

    def check_suspicious_session_denied(self, run_id):
        return ProbeResult.model_validate(self.probe(run_id, "suspicious"))

    def check_benign_workflow(self, run_id):
        return ProbeResult.model_validate(self.probe(run_id, "benign"))

    def probe(self, rid, kind):
        return self.call("POST", f"/targets/{rid}/probe/{kind}")

    def world(self, rid):
        return self.call("GET", f"/targets/{rid}/checkpoint")

    def clone(self, rid, seed, version, world):
        return self.call(
            "POST",
            "/targets",
            json={
                "run_id": rid,
                "seed": seed,
                "scenario_version": version,
                "world": world,
            },
        )

    def destroy_target(self, run_id):
        return TeardownProof.model_validate(self.call("DELETE", f"/targets/{run_id}"))
