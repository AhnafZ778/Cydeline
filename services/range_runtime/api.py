from __future__ import annotations

import asyncio
import contextlib
import io
import ipaddress
import json
import logging
import os
import secrets
import shlex
import threading
import time
import zipfile

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal

from contracts.models import DeclarationRequest
from contracts.runtime import (
    AlertRequest,
    CaseCreate,
    CasePatch,
    AssignmentRequest,
    AssistantRequest,
    AssistantReview,
    BranchRequest,
    CohortRequest,
    HandoffRequest,
    InjectRequest,
    LiveDefense,
    LiveRunCreate,
    LiveSnapshot,
    QueryRequest,
    SessionRequest,
    WorkspacePatch,
    WorksheetPatch,
    ObserverGrantRequest,
    CaptureConsent,
    CaptureChunk,
)

from .catalog import SCENARIOS, manifest
from .common import DomainError, LoginThrottle, digest, now, uid
from .engine import TERMINAL, Engine
from .progress import attempt_view, summarize


class ProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=80)


class DemoSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["learner", "instructor"]


def create_control(path, target, agent=None, auto=True, instructor_pin=None, local_demo=False):
    engine = Engine(path, target, agent)
    logger = logging.getLogger(__name__)
    sessions = {}
    pin = instructor_pin or os.environ.get("INSTRUCTOR_PIN")
    throttle = LoginThrottle()
    stop = threading.Event()

    def demo_allowed(request):
        try:
            peer = ipaddress.ip_address(request.client.host)
            host = request.url.hostname
            return bool(local_demo and peer.is_loopback and
                        (host == "localhost" or ipaddress.ip_address(host).is_loopback))
        except (ValueError, AttributeError):
            return False

    def public_session(request):
        return {**{k: actor(request)[k] for k in ("id", "name", "role")},
                "local_demo": demo_allowed(request)}

    def maintain_observer():
        with engine.lock:
            try:
                engine.observer.purge()
                return True
            except Exception:
                # Fencing and target dispatch share the same authority lock.
                engine.observer_failed = True
                logger.exception("Observer audit maintenance failed; fencing active exercises")
                try:
                    for r in engine.store.runs():
                        if r["state"] not in TERMINAL:
                            engine.finish(r, "technical_failure")
                except Exception:
                    logger.exception("Cannot persist technical failure; dispatch remains fenced")
                return False

    def work():
        last = time.monotonic()
        next_purge = 0
        while not stop.wait(0.5):
            current = time.monotonic()
            if current >= next_purge:
                next_purge = current + 60
                if not maintain_observer():
                    continue
            delta = min(2, current - last)
            last = current
            try:
                runs = engine.store.runs()
            except Exception:
                engine.observer_failed = True
                logger.exception("Cannot read run authority; dispatch remains fenced")
                continue
            for r in runs:
                if r["state"] in TERMINAL or r["state"] == "created":
                    continue
                try:
                    engine.tick(r["run_id"], delta)
                    r = engine.store.run(r["run_id"])
                    if (
                        not r["thinking"]
                        and not r["paused"]
                        and not r.get("ai_unavailable")
                        and r["virtual_clock_sec"] >= r["next_ai_sec"]
                        and r["ai_step"] < r["max_steps"]
                    ):
                        threading.Thread(
                            target=agent_turn, args=(r["run_id"],), daemon=True
                        ).start()
                except Exception:
                    logger.exception(
                        "Range loop failed; marking run as technical_failure",
                        extra={"run_id": r["run_id"]},
                    )
                    with engine.lock:
                        failed = engine.store.run(r["run_id"])
                        engine.finish(failed, "technical_failure")

    def agent_turn(rid):
        try:
            engine.decide(rid)
        except Exception:
            logger.exception(
                "Agent turn failed; marking run as technical_failure",
                extra={"run_id": rid},
            )
            with engine.lock:
                r = engine.store.run(rid)
                engine.finish(r, "technical_failure")

    @contextlib.asynccontextmanager
    async def lifespan(app):
        # A process restart never silently grants extra assessment time.
        for r in engine.store.runs():
            if r["state"] not in TERMINAL and r["state"] != "created":
                try:
                    target.world(r["run_id"])
                except Exception:
                    logger.exception(
                        "Target unavailable while resuming run",
                        extra={"run_id": r["run_id"]},
                    )
                    engine.finish(r, "technical_failure")
                    continue
                r["thinking"] = False
                if r.get("ai_unavailable"):
                    pass  # Preserve a recoverable system outage, including assessment.
                elif r["mode"] == "practice":
                    r["paused"] = True
                else:
                    engine.finish(r, "technical_failure")
                    continue
                engine.store.save(r)
        if auto:
            threading.Thread(target=work, daemon=True).start()
        yield
        stop.set()

    app = FastAPI(title="Cydeline live SOC control", version="1.1.0", lifespan=lifespan)
    app.state.engine = engine
    app.state.observer_maintenance = maintain_observer
    worker_url = os.environ.get("RANGE_WORKER_URL")
    worker = (
        httpx.Client(
            base_url=worker_url,
            headers={"x-range-secret": os.environ.get("RANGE_SECRET", "")},
            timeout=8,
        )
        if worker_url
        else None
    )

    def tool_call(method, rid, **kwargs):
        if not worker:
            raise DomainError(
                "This optional tool profile is not enabled on this range", 503
            )
        try:
            response = worker.request(method, "/tools/" + rid, **kwargs)
            body = response.json()
        except (httpx.HTTPError, ValueError):
            raise DomainError(
                "The optional tool worker is unavailable. Your case remains saved.", 503
            )
        if response.status_code >= 400:
            raise DomainError(
                body.get("message", "Tool operation failed"), response.status_code
            )
        return body

    def stop_tools(rid):
        if worker:
            try:
                tool_call("DELETE", rid)
            except DomainError:
                pass

    engine.on_terminal = lambda rid: threading.Thread(
        target=stop_tools, args=(rid,), daemon=True
    ).start()

    @app.exception_handler(DomainError)
    async def domain(request, e):
        return JSONResponse(
            {
                "code": "invalid_operation",
                "message": e.message,
                "correlation_id": uid("error"),
            },
            status_code=e.status,
            headers=e.headers,
        )

    @app.middleware("http")
    async def session(request, call_next):
        if request.method == "POST" and request.url.path.endswith("/capture"):
            data = bytearray()
            async for part in request.stream():
                data.extend(part)
                if len(data) > 512 * 1024:
                    return JSONResponse({"message": "Capture chunk exceeds its size limit"}, 413)
            request._body = bytes(data)
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            origin = request.headers.get("origin")
            if origin and origin.split("://", 1)[-1] != request.headers.get("host"):
                return JSONResponse(
                    {"message": "Cross-origin mutations are not permitted"}, 403
                )
        token = request.cookies.get("cydeline_session")
        new = False
        persisted = engine.store.get("sessions", digest(token)) if token else None
        if token in sessions and (not persisted or persisted["expires"] <= time.time()):
            sessions.pop(token, None)
        if token not in sessions and persisted and persisted["expires"] > time.time():
            sessions[token] = persisted["actor"]
        if token not in sessions:
            token = secrets.token_urlsafe(32)
            profile = uid("learner")
            sessions[token] = {
                "id": profile,
                "name": "Local learner",
                "role": "learner",
            }
            new = True
            engine.store.put("profiles", profile, "global", sessions[token])
        # Each request owns its identity snapshot. An in-flight response may not
        # inherit a later request's elevation through a shared mutable dict.
        request.state.actor = dict(sessions[token])
        request.state.rotate = False
        # A persisted local-demo credential must not retain privilege elsewhere.
        if request.state.actor.get("_demo") and not demo_allowed(request):
            request.state.actor["role"] = "learner"
            request.state.actor["name"] = request.state.actor.pop("_demo_name", "Local learner")
            request.state.actor.pop("_demo", None)
            request.state.rotate = True
        if (engine.observer_failed and request.method not in {"GET", "HEAD", "OPTIONS"}
            and request.url.path.startswith("/api/runs")):
            return JSONResponse({"message": "Audit storage failed; exercise actions are fenced"}, 507)
        if (request.state.actor.get("role") == "observer"
            and request.url.path.startswith("/api/")
            and not request.url.path.startswith("/api/observer/")
            and request.url.path not in {"/api/session", "/api/session/logout"}):
            return JSONResponse({"message": "Observer access is read-only and limited to assigned runs"}, 403)
        started = time.monotonic()
        response = await call_next(request)
        current = engine.store.get("sessions", digest(token)) if not new else None
        if token not in sessions or (not new and (not current or current["expires"] <= time.time())):
            # Another request rotated this credential while this handler ran.
            # Do not resurrect it or return a successful stale mutation result.
            return JSONResponse({"message": "Session changed. Reconnect before continuing."}, 401)
        if request.state.rotate:
            # A privilege or identity change must never keep the pre-change credential alive (session fixation).
            previous, token = token, secrets.token_urlsafe(32)
            sessions.pop(previous, None)
            sessions[token] = dict(request.state.actor)
            engine.store.put(
                "sessions",
                digest(previous),
                "global",
                {"actor": {}, "expires": 0},
            )
            new = True
        else:
            sessions[token] = dict(request.state.actor)
        route = request.scope.get("route")
        logger.info(
            "request",
            extra={
                "method": request.method,
                "route": getattr(route, "path", "unmatched"),
                "status": response.status_code,
                "duration_ms": round((time.monotonic() - started) * 1000, 1),
                "role": request.state.actor.get("role"),
                "client": request.client.host if request.client else None,
            },
        )
        engine.store.put(
            "sessions",
            digest(token),
            "global",
            {"actor": request.state.actor, "expires": time.time() + 86400},
        )
        if new:
            response.set_cookie(
                "cydeline_session",
                token,
                httponly=True,
                samesite="strict",
                secure=request.url.scheme == "https",
                max_age=86400,
            )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        return response

    def actor(request):
        return request.state.actor

    def instructor(request):
        if actor(request)["role"] != "instructor":
            raise DomainError("Instructor access required", 403)

    def own(request, rid):
        if actor(request).get("role") == "observer":
            raise DomainError("Observers use the read-only observer view", 403)
        r = engine.store.run(rid)
        if (
            r["owner"] != actor(request)["id"]
            and actor(request)["id"] not in r.get("participants", [])
            and actor(request)["role"] != "instructor"
        ):
            raise DomainError("Run not found", 404)
        return r

    def observe(request, rid):
        r = engine.store.run(rid)
        a = actor(request)
        if a["role"] == "instructor":
            return r
        if a["role"] == "observer":
            grants = engine.store.rows("observer_grants", rid)
            if any(g["profile_id"] == a["id"] and not g["revoked"] and g["expires"] > time.time() for g in grants):
                return r
        elif r["state"] in TERMINAL and r["owner"] == a["id"]:
            return r
        raise DomainError("Live AI detail is restricted to instructors and assigned observers", 403)

    def observer_summary(r):
        return {k: r[k] for k in ("run_id", "state", "outcome", "scenario_id", "scenario_version", "virtual_clock_sec", "thinking", "ai_unavailable", "paused")}

    @app.get("/api/observer/runs")
    def observer_runs(request: Request):
        runs = []
        for r in engine.store.runs():
            try:
                observe(request, r["run_id"])
            except DomainError:
                continue
            runs.append(observer_summary(r))
        return {"runs": runs}

    @app.get("/api/observer/runs/{rid}")
    def observer_snapshot(request: Request, rid: str):
        r = observe(request, rid)
        return {**observer_summary(r), "capture": engine.store.get("observer_capture", rid),
                "learner_actions": engine.store.rows("defender_actions", rid),
                "history_notice": "Only calls recorded after observer support was enabled include full transcripts."}

    @app.get("/api/observer/runs/{rid}/events")
    def observer_history(request: Request, rid: str, cursor: int = 0, limit: int = 100):
        observe(request, rid)
        if cursor < 0 or not 1 <= limit <= 200:
            raise DomainError("Invalid observer cursor or page size", 422)
        return engine.observer.page(rid, cursor, limit)

    @app.get("/api/observer/runs/{rid}/capture")
    def observer_capture_history(request: Request, rid: str, cursor: int = 0):
        observe(request, rid)
        if cursor < 0:
            raise DomainError("Invalid capture cursor", 422)
        return engine.observer.page(rid, cursor, 20, visual=True)

    @app.get("/api/observer/runs/{rid}/stream")
    async def observer_stream(request: Request, rid: str, cursor: int = 0):
        observe(request, rid)
        try:
            after = int(request.headers.get("last-event-id", cursor))
            if after < 0:
                raise ValueError()
        except ValueError:
            raise DomainError("Invalid observer cursor", 422)

        async def frames():
            nonlocal after
            while not await request.is_disconnected():
                try:
                    # The initial HTTP authorization is not a connection-long grant.
                    token = request.cookies.get("cydeline_session")
                    session_row = engine.store.get("sessions", digest(token)) if token else None
                    if not session_row or session_row["expires"] <= time.time():
                        raise DomainError("Session expired", 403)
                    r = observe(request, rid)
                except DomainError:
                    yield 'event: revoked\ndata: {}\n\n'
                    return
                page = engine.observer.page(rid, after)
                for entry in page["events"]:
                    after = entry["sequence"]
                    yield "id: " + str(after) + "\nevent: activity\ndata: " + json.dumps(entry) + "\n\n"
                yield "event: status\ndata: " + json.dumps(observer_summary(r)) + "\n\n"
                if r["state"] in TERMINAL and not page["has_more"]:
                    return
                if not page["has_more"]:
                    await asyncio.sleep(1)
        return StreamingResponse(frames(), media_type="text/event-stream", headers={"X-Accel-Buffering": "no"})

    @app.get("/api/instructor/runs/{rid}/observers")
    def observer_grants(request: Request, rid: str):
        instructor(request)
        engine.store.run(rid)
        return {"grants": engine.store.rows("observer_grants", rid)}

    @app.post("/api/instructor/runs/{rid}/observers")
    def grant_observer(request: Request, rid: str, p: ObserverGrantRequest):
        instructor(request)
        engine.store.run(rid)
        with engine.lock:
            grants = engine.store.rows("observer_grants", rid)
            if sum(not g["revoked"] and g["expires"] > time.time() for g in grants) >= 2:
                raise DomainError("Two assigned observers are supported per run", 409)
            code = secrets.token_urlsafe(24)
            profile_id, grant_id = uid("observer"), uid("grant")
            engine.store.put("profiles", profile_id, "global", {"id": profile_id, "name": p.name, "role": "observer", "code_hash": digest(code)})
            grant = {"id": grant_id, "profile_id": profile_id, "name": p.name, "run_id": rid, "expires": time.time()+7*86400, "revoked": False}
            engine.store.put("observer_grants", grant_id, rid, grant)
            return {**grant, "access_code": code}

    @app.delete("/api/instructor/runs/{rid}/observers/{grant_id}")
    def revoke_observer(request: Request, rid: str, grant_id: str):
        instructor(request)
        with engine.lock:
            grant = engine.store.get("observer_grants", grant_id)
            if not grant or grant["run_id"] != rid:
                raise DomainError("Observer grant not found", 404)
            grant["revoked"] = True
            engine.store.put("observer_grants", grant_id, rid, grant)
            return grant

    @app.post("/api/runs/{rid}/capture-consent")
    def capture_consent(request: Request, rid: str, p: CaptureConsent):
        r = own(request, rid)
        if r["owner"] != actor(request)["id"] or r["state"] in TERMINAL:
            raise DomainError("Only the active trainee may change recording consent", 403)
        with engine.lock:
            previous = engine.store.get("observer_capture", rid)
            if not p.accepted and p.capture_id and previous and previous["capture_id"] != p.capture_id:
                return previous  # Late cleanup from an older recording segment.
            state = {"run_id": rid, "capture_id": uid("capture"), "accepted": p.accepted,
                     "actor_id": actor(request)["id"], "next_index": 0, "updated_at": now(), "gap": p.gap or bool(previous and previous.get("gap"))}
            engine.store.put("observer_capture", rid, rid, state)
            return state

    @app.post("/api/runs/{rid}/capture")
    def capture_chunk(request: Request, rid: str, p: CaptureChunk):
        with engine.lock:
            r = own(request, rid)
            state = engine.store.get("observer_capture", rid)
            if (r["owner"] != actor(request)["id"] or r["state"] in TERMINAL
                or not state or not state["accepted"] or state["actor_id"] != actor(request)["id"] or state["capture_id"] != p.capture_id):
                raise DomainError("Exercise recording is not authorized", 403)
            if p.index < state["next_index"]:
                return {"accepted": True, "duplicate": True}
            if p.index != state["next_index"]:
                raise DomainError("Capture chunk is out of order; restart recording", 409)
            try:
                engine.observer.emit(r, "capture.chunk", p.model_dump())
                state.update(next_index=p.index+1, updated_at=now())
                engine.store.put("observer_capture", rid, rid, state)
            except Exception as exc:
                state.update(gap=True, accepted=False)
                try:
                    engine.store.put("observer_capture", rid, rid, state)
                except Exception:
                    # A visual failure alone must not stop the exercise. If the
                    # authority cannot persist even its gap, audit is unsafe.
                    engine.observer_failed = True
                    logger.exception("Cannot persist recording gap; fencing dispatch")
                    try:
                        engine.finish(r, "technical_failure")
                    except Exception:
                        logger.exception("Cannot persist recording failure; dispatch remains fenced")
                    raise DomainError("Recording authority is unavailable; exercise dispatch is fenced", 507) from exc
                if isinstance(exc, DomainError):
                    raise
                raise DomainError("Exercise recording storage is unavailable; recording stopped with a gap", 507) from exc
            return {"accepted": True}

    @app.get("/api/session")
    def get_session(request: Request):
        return public_session(request)

    @app.post("/api/session/demo")
    def demo_session(request: Request, p: DemoSessionRequest):
        if not demo_allowed(request):
            raise DomainError("Password-free switching is available only in the local demo", 403)
        # Observer accounts remain read-only through the middleware fence.
        a = actor(request)
        request.state.rotate = True
        if p.role == "instructor":
            a.setdefault("_demo_name", a["name"])
            a.update(role="instructor", name="Local instructor", _demo=True)
        else:
            a.update(role="learner", name=a.pop("_demo_name", "Local learner"))
            a.pop("_demo", None)
        return public_session(request)

    @app.post("/api/session")
    def login(request: Request, p: SessionRequest):
        caller = request.client.host if request.client else "unknown"
        throttle.check(caller)
        if pin and secrets.compare_digest(p.code, pin):
            throttle.passed(caller)
            request.state.rotate = True
            actor(request)["role"] = "instructor"
            actor(request)["name"] = "Instructor"
            actor(request).pop("_demo", None)
            actor(request).pop("_demo_name", None)
            return public_session(request)
        profile = next(
            (
                x
                for x in engine.store.rows("profiles", "global")
                if x.get("code_hash") == digest(p.code)
            ),
            None,
        )
        if profile:
            throttle.passed(caller)
            request.state.rotate = True
            actor(request).clear()
            actor(request).update({k: profile[k] for k in ["id", "name", "role"]})
            return public_session(request)
        throttle.failed(caller)
        logger.warning("login rejected", extra={"client": caller})
        raise DomainError("Invalid access code", 401)

    @app.post("/api/session/logout")
    def logout(request: Request):
        request.state.rotate = True
        actor(request).clear()
        actor(request).update(
            {"id": uid("learner"), "name": "Local learner", "role": "learner"}
        )
        engine.store.put(
            "profiles", actor(request)["id"], "global", dict(actor(request))
        )
        return actor(request)

    def probe_target():
        check = getattr(engine.target, "health", None)
        if check is None:
            return "ok"
        try:
            return "ok" if check() else "unavailable"
        except Exception:  # noqa: BLE001 -- a failing dependency must degrade health, never break the endpoint
            logger.warning("target health probe failed", exc_info=True)
            return "unavailable"

    def probe_tools():
        """Optional-tool worker: absent when the profile is not enabled, otherwise its own report."""
        if not worker:
            return None
        try:
            response = worker.get("/health", timeout=4)
            body = response.json()
        except (httpx.HTTPError, ValueError):
            return "unavailable"
        if response.status_code != 200:
            return "unavailable"
        return "ok" if body.get("status") == "ok" else "degraded"

    def probe_model():
        if not hasattr(engine.agent, "health"):
            return {
                "reachable": True,
                "model_present": True,
                "configured_model": "test-provider",
            }
        try:
            return engine.agent.health()
        except Exception:  # noqa: BLE001 -- a broken model runtime must be reported, not turned into a 500
            logger.warning("model health probe failed", exc_info=True)
            return {"reachable": False, "model_present": False}

    @app.get("/api/health")
    def health():
        h = probe_model()
        model_ok = bool(h.get("reachable") and h.get("model_present"))
        services = {"control": "ok", "target": probe_target()}
        tools = probe_tools()
        if tools:
            services["tools"] = tools
        # Overall status reflects only what the core live range needs; optional tools are reported but never fail it.
        if services["target"] != "ok":
            overall = "unavailable"
        else:
            overall = "ok" if model_ok else "degraded"
        return {
            "status": overall,
            "version": "1.1.0",
            "model": {
                "available": model_ok,
                "name": h.get("configured_model", "configured model"),
            },
            "services": services,
            "checked_at": now(),
        }

    @app.get("/api/scenarios")
    def catalog():
        from .variants import variants, public_variant
        from .learning import public_briefing
        return {"scenarios": [{**manifest(s), "briefing": public_briefing(s), "variants": [public_variant(v) for v in variants(s["scenario_id"], s["version"])]} for s in SCENARIOS]}

    @app.get("/api/runs")
    def runs(request: Request):
        return {
            "runs": [
                {
                    k: r.get(k)
                    for k in [
                        "run_id",
                        "scenario_id",
                        "scenario_version",
                        "state",
                        "outcome",
                        "mode",
                        "created_at",
                        "owner",
                        "branch_from",
                    ]
                }
                for r in engine.store.runs()
                if r["owner"] == actor(request)["id"]
                or actor(request)["id"] in r.get("participants", [])
                or actor(request)["role"] == "instructor"
            ]
        }

    @app.post(
        "/api/runs", response_model=LiveSnapshot, response_model_exclude_unset=True
    )
    def create(request: Request, p: LiveRunCreate):
        return engine.create(
            p.mode,
            p.scenario_id,
            p.scenario_version,
            p.seed,
            p.assistance,
            actor(request)["id"],
            p.variant_id,
        )

    @app.get(
        "/api/runs/{rid}",
        response_model=LiveSnapshot,
        response_model_exclude_unset=True,
    )
    def snapshot(request: Request, rid: str):
        own(request, rid)
        return engine.snapshot(rid)

    @app.post(
        "/api/runs/{rid}/start",
        response_model=LiveSnapshot,
        response_model_exclude_unset=True,
    )
    def start(request: Request, rid: str):
        own(request, rid)
        return engine.start(rid)

    @app.get("/api/runs/{rid}/events")
    def events(
        request: Request,
        rid: str,
        cursor: int = 0,
        limit: int = 500,
        through: int | None = None,
    ):
        r = own(request, rid)
        rows = [
            e
            for e in engine.visible(r)
            if e["sequence"] > cursor and (through is None or e["sequence"] <= through)
        ]
        page = rows[: max(1, min(500, limit))]
        return {
            "run_id": rid,
            "events": page,
            "next_cursor": page[-1]["sequence"] if page else None,
            "has_more": len(rows) > len(page),
        }

    @app.get("/api/runs/{rid}/stream")
    async def stream(request: Request, rid: str, cursor: int = 0):
        own(request, rid)
        try:
            after = int(request.headers.get("last-event-id", cursor))
        except ValueError:
            raise DomainError("Invalid event cursor", 422)

        async def frames():
            nonlocal after
            while not await request.is_disconnected():
                with engine.lock:
                    try:
                        r = own(request, rid)
                    except DomainError:
                        return
                    rows = [e for e in engine.visible(r) if e["sequence"] > after]
                    snap = engine.snapshot(rid)
                for e in rows:
                    after = e["sequence"]
                    yield (
                        "id: "
                        + str(after)
                        + "\nevent: telemetry\ndata: "
                        + json.dumps(e)
                        + "\n\n"
                    )
                yield "event: snapshot\ndata: " + json.dumps(snap) + "\n\n"
                if r["state"] in TERMINAL:
                    return
                await asyncio.sleep(1)

        return StreamingResponse(
            frames(),
            media_type="text/event-stream",
            headers={"X-Accel-Buffering": "no"},
        )

    @app.patch("/api/runs/{rid}/workspace")
    def patch(request: Request, rid: str, p: WorkspacePatch):
        own(request, rid)
        return engine.workspace(rid, p.model_dump(exclude_none=True))

    @app.get("/api/learning")
    def learning_references():
        from .learning import REFERENCES, MICRO_EXERCISES, REFERENCE_VERSION
        return {"version": REFERENCE_VERSION, "references": REFERENCES, "exercises": MICRO_EXERCISES}

    @app.post("/api/runs/{rid}/begin")
    def begin(request: Request, rid: str):
        own(request, rid)
        return engine.begin(rid)

    @app.get("/api/runs/{rid}/worksheet")
    def get_worksheet(request: Request, rid: str):
        own(request, rid)
        return engine.worksheet(rid)

    @app.patch("/api/runs/{rid}/worksheet")
    def save_worksheet(request: Request, rid: str, p: WorksheetPatch):
        own(request, rid)
        return engine.save_worksheet(rid, p.model_dump(), actor(request))

    @app.post("/api/runs/{rid}/declare")
    def declare(request: Request, rid: str, p: DeclarationRequest):
        own(request, rid)
        return engine.declare(rid, p.model_dump())

    @app.post("/api/runs/{rid}/defender-actions")
    def defense(request: Request, rid: str, p: LiveDefense):
        own(request, rid)
        return engine.defend(rid, p.model_dump())

    @app.post("/api/runs/{rid}/verify")
    def verify(request: Request, rid: str, continue_investigation: bool = False):
        own(request, rid)
        return engine.verify(rid, finalize_on_success=not continue_investigation)

    @app.post("/api/runs/{rid}/finish")
    def finish(request: Request, rid: str):
        own(request, rid)
        engine.verify(rid, True)
        return engine.snapshot(rid)

    @app.post("/api/runs/{rid}/pause")
    def pause(request: Request, rid: str):
        own(request, rid)
        with engine.lock:
            r = engine.active(rid)
            if r["mode"] == "assessment":
                raise DomainError("Assessment cannot pause", 403)
            if r.get("ai_unavailable"):
                raise DomainError("Retry the unavailable AI before resuming", 409)
            r["paused"] = not r["paused"]
            r["awaiting_begin"] = False
            r["state_revision"] += 1
            engine.store.save(r)
            return engine.snapshot(rid)

    @app.post("/api/runs/{rid}/abort")
    def abort(request: Request, rid: str):
        own(request, rid)
        with engine.lock:
            r = engine.active(rid)
            engine.finish(r, "aborted")
            return engine.snapshot(rid)

    @app.post("/api/runs/{rid}/reset")
    def reset(request: Request, rid: str):
        parent = own(request, rid)
        with engine.lock:
            if parent["state"] not in TERMINAL:
                engine.finish(parent, "aborted")
            target.destroy_target(rid)
            r = engine.create(
                parent["mode"],
                parent["scenario_id"],
                parent["scenario_version"],
                parent["seed"],
                parent["assistance"],
                actor(request)["id"],
                (parent.get("variant") or {}).get("id"),
            )
            return engine.start(r["run_id"])

    @app.get("/api/runs/{rid}/debrief")
    def debrief(request: Request, rid: str):
        own(request, rid)
        return engine.replay(rid)["debrief"]

    @app.get("/api/runs/{rid}/replay")
    def replay(request: Request, rid: str):
        own(request, rid)
        return engine.replay(rid)

    @app.post("/api/runs/{rid}/variations")
    def another_variation(request: Request, rid: str, p: LiveRunCreate):
        parent = own(request, rid)
        if parent["state"] not in TERMINAL:
            raise DomainError("End the current exercise before trying another variation")
        from .variants import variants
        choices = variants(parent["scenario_id"], parent["scenario_version"])
        previous = (parent.get("variant") or {}).get("id", "baseline")
        index = next((i for i, v in enumerate(choices) if v["id"] == previous), 0)
        created = engine.create(p.mode, parent["scenario_id"], parent["scenario_version"], p.seed, p.assistance, actor(request)["id"], choices[(index + 1) % len(choices)]["id"])
        return engine.start(created["run_id"])

    @app.post("/api/runs/{rid}/branches")
    def branch(request: Request, rid: str, p: BranchRequest):
        own(request, rid)
        return engine.branch(rid, p.checkpoint_id, actor(request)["id"])

    @app.post("/api/runs/{rid}/queries")
    def query(request: Request, rid: str, p: QueryRequest):
        r = own(request, rid)
        rows = engine.visible(r)
        try:
            terms = shlex.split(p.query)
        except ValueError:
            raise DomainError("Close the quoted search term", 422)
        fields = {
            "user": "actor_id",
            "session": "session_handle",
            "type": "event_type",
            "outcome": "outcome",
            "source": "source",
        }
        for term in terms:
            equals = "=" in term and (
                ":" not in term or term.index("=") < term.index(":")
            )
            if equals:
                term = term.replace("=", ":", 1)
            if ":" not in term:
                rows = [e for e in rows if term.lower() in json.dumps(e).lower()]
                continue
            key, value = term.split(":", 1)
            key = {"source_address": "ip", "raw_log": "raw"}.get(key, key)
            if key in {"source_port", "destination_address", "destination_port"}:
                rows = []  # These values are not released by this target.
                continue
            if key == "raw":
                rows = [e for e in rows if value.lower() in json.dumps(e).lower()]
                continue
            if key in fields:
                rows = [
                    e
                    for e in rows
                    if (
                        value.lower() in str(e.get(fields[key], "")).lower()
                        if equals
                        else str(e.get(fields[key], "")).lower() == value.lower()
                    )
                ]
            elif key in {"ip", "path", "status"}:
                f = {"ip": "src_ip", "path": "path", "status": "status_code"}[key]
                rows = [
                    e
                    for e in rows
                    if value.lower() in str((e.get("network") or {}).get(f, "")).lower()
                ]
            else:
                raise DomainError(
                    "Supported filters: user, session, type, outcome, source, ip, path, status",
                    422,
                )
        return {"events": rows, "count": len(rows), "syntax": "Northstar filters"}

    @app.post("/api/runs/{rid}/alerts/{aid}")
    def alert(request: Request, rid: str, aid: str, p: AlertRequest):
        own(request, rid)
        return engine.update_alert(
            rid, aid, p.model_dump(exclude_none=True), actor(request)
        )

    @app.get("/api/runs/{rid}/cases")
    def get_cases(request: Request, rid: str):
        own(request, rid)
        with engine.lock:
            return {
                "cases": [c for c in engine.case_workspace(rid)["cases"] if c["opened"]]
            }

    @app.post("/api/runs/{rid}/cases")
    def create_case(request: Request, rid: str, p: CaseCreate):
        own(request, rid)
        return engine.create_case(rid, p.model_dump(), actor(request))

    @app.patch("/api/runs/{rid}/cases/{cid}")
    def update_case(request: Request, rid: str, cid: str, p: CasePatch):
        own(request, rid)
        return engine.update_case(
            rid, cid, p.model_dump(exclude_none=True), actor(request)
        )

    @app.post("/api/runs/{rid}/ai/retry")
    def retry_ai(request: Request, rid: str):
        own(request, rid)
        return engine.retry_ai(rid)

    @app.post("/api/runs/{rid}/handoff")
    def handoff(request: Request, rid: str, p: HandoffRequest):
        own(request, rid)
        with engine.lock:
            r = engine.active(rid)
            ws = engine.store.get("workspace", rid)
            c = ws["cases"][0]
            if p.recipient_id:
                recipient = engine.store.get("profiles", p.recipient_id)
                if not recipient or recipient.get("role") != "learner":
                    raise DomainError("Choose a registered receiving analyst", 422)
                r["participants"] = list(
                    set(r.get("participants", []) + [p.recipient_id])
                )
                engine.store.save(r)
                c["recipient_id"] = p.recipient_id
            c.update(owner=p.owner, role=p.role)
            c["notes"].append(
                {
                    "from": actor(request)["name"],
                    "hypothesis": p.hypothesis,
                    "next_step": p.next_step,
                    "evidence_ids": ws["evidence_ids"],
                    "at": now(),
                }
            )
            c["revision"] = c.get("revision", 0) + 1
            engine.save_case_workspace(rid, ws)
            return engine.snapshot(rid)

    @app.post("/api/runs/{rid}/hints")
    def hint(request: Request, rid: str):
        with engine.lock:
            own(request, rid)
            r = engine.active(rid)
            if r["mode"] == "assessment":
                raise DomainError("Hints unavailable in assessment", 403)
            ws = engine.store.get("workspace", rid)
            hints = [
                "Compare access by the same session across source addresses and user agents.",
                "Explain what each piece of evidence supports before choosing a response.",
                "After containment, check every remaining access path and legitimate employee work.",
            ]
            index = min(len(ws["hints_used"]), len(hints) - 1)
            ws["hints_used"].append(index)
            engine.save_case_workspace(rid, ws)
            return {"hint": hints[index]}

    @app.get("/api/runs/{rid}/export")
    def export(request: Request, rid: str):
        own(request, rid)
        data = engine.replay(rid)
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("replay.json", json.dumps(data, indent=2))
            z.writestr("events.jsonl", "\n".join(json.dumps(e) for e in data["events"]))
            z.writestr("case-notes.txt", data["workspace"]["note"])
            z.writestr("learning-debrief.json", json.dumps(data["learning"], indent=2))
            z.writestr("worksheet.json", json.dumps(engine.worksheet(rid), indent=2))
            z.writestr("reports.json", json.dumps([c.get("submitted_report") for c in data["workspace"]["cases"] if c.get("submitted_report")], indent=2))
            z.writestr("report.md", "# Recorded investigation report\n\n" + "\n\n".join(c.get("submitted_report", {}).get("text", c.get("report", "")) for c in data["workspace"]["cases"]) + "\n\nEvidence IDs: " + ", ".join(data["debrief"]["evidence_event_ids"]) + "\n\nTrace: " + data["trace_hash"])
            z.writestr(
                "README.txt",
                "Recorded Northstar training evidence. No packet capture is claimed. Trace hash: "
                + data["trace_hash"],
            )
        return Response(
            buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{rid}-evidence.zip"'
            },
        )

    @app.post("/api/runs/{rid}/tools/{profile}")
    def launch_tool(request: Request, rid: str, profile: str):
        r = own(request, rid)
        if profile not in {"desktop", "siem"}:
            raise DomainError("Unknown tool profile", 422)
        result = tool_call(
            "POST",
            rid,
            json={
                "profile": profile,
                "principal": actor(request)["id"],
                "events": engine.visible(r, r["state"] in TERMINAL),
            },
        )
        with engine.lock:
            r = engine.store.run(rid)
            r["tool_profile"] = profile
            engine.store.save(r)
        return result

    @app.get("/api/runs/{rid}/tools/{profile}")
    def tool_status(request: Request, rid: str, profile: str):
        r = own(request, rid)
        if profile not in {"desktop", "siem"}:
            raise DomainError("Unknown tool profile", 422)
        return tool_call(
            "PUT",
            rid,
            json={
                "profile": profile,
                "principal": actor(request)["id"],
                "events": engine.visible(r, r["state"] in TERMINAL),
            },
        )

    @app.delete("/api/runs/{rid}/tools/{profile}")
    def stop_tool(request: Request, rid: str, profile: str):
        own(request, rid)
        return tool_call("DELETE", rid)

    @app.get("/api/runs/{rid}/assistant")
    def assistant_history(request: Request, rid: str):
        r = own(request, rid)
        if r["mode"] == "assessment":
            raise DomainError("Assistant is unavailable in assessment", 403)
        return {"turns": engine.store.rows("assistant_turns", rid)}

    @app.post("/api/runs/{rid}/assistant")
    def assistant_analyze(request: Request, rid: str, p: AssistantRequest):
        from .assistant import EvidenceAssistant, coach_sources, validate_analysis
        with engine.lock:
            own(request, rid)
            r = engine.active(rid)
            if r["mode"] == "assessment":
                raise DomainError("Assistant is unavailable in assessment", 403)
            released = {e["event_id"]: e for e in engine.visible(r) if e["source"] == "target-access"}
            if any(i not in released for i in p.event_ids):
                raise DomainError("Select released target evidence from this run", 422)
            selected = [released[i] for i in dict.fromkeys(p.event_ids)]
            ws = engine.case_workspace(rid)
            worksheet = engine.worksheet(rid)
            report_fields = {k: v for k, v in worksheet["fields"].items() if v}
            for c in ws["cases"]:
                if c.get("opened"):
                    report_fields[c["id"]] = c.get("report", "")
            context = {"report_fields": report_fields}
            sources = coach_sources(selected, context)
            request_id = p.request_id or digest({"request": p.model_dump(), "sources": sources})
            payload_hash = digest({"events": p.event_ids, "question": p.question, "level": p.level})
            previous = next((t for t in engine.store.rows("assistant_turns", rid) if t.get("request_id") == request_id), None)
            if previous:
                if previous.get("request_hash") != payload_hash:
                    raise DomainError("Request identifier already used for another question")
                return previous
            if not engine.model_lock.acquire(blocking=False):
                raise DomainError("The local model is busy. Your question is retained; retry after this turn.", 409)
            evidence_revision = {"sequence": max((e["sequence"] for e in selected), default=0), "workspace": ws["revision"], "worksheet": worksheet["revision"]}
        try:
            provider = getattr(app.state, "assistant", None) or EvidenceAssistant()
            turn = provider.analyze(selected, p.question, level=p.level, context=context)
            try:
                turn["analysis"] = validate_analysis(turn["analysis"], sources, p.level)
            except (ValueError, TypeError, KeyError) as exc:
                raise DomainError("Unsupported coaching response was rejected.", 503) from exc
            turn.update(level=p.level, evidence_revision=evidence_revision, request_id=request_id,
                        request_hash=payload_hash, context_sources=sources,
                        evidence_ids=[e["event_id"] for e in selected])
            focus = turn["analysis"].get("query_focus")
            if p.level == "guide" and focus and selected:
                field = {"session": "session_handle", "user": "actor_id", "resource": "resource_id", "outcome": "outcome"}[focus]
                value = next((e.get(field) for e in selected if e.get(field)), None)
                if value is not None:
                    key = "path" if focus == "resource" else focus
                    turn["query_pattern"] = key + ":" + shlex.quote(str(value))
                    turn["query_explanation"] = "Run this query yourself. Matching events help compare the same field over time; no matches mean the selected value has no other released records, not that the incident is resolved."
            with engine.lock:
                own(request, rid)
                engine.active(rid)
                engine.store.put("assistant_turns", turn["id"], rid, turn)
                ws = engine.store.get("workspace", rid)
                ws["hints_used"].append("assistant:" + turn["id"])
                engine.save_case_workspace(rid, ws)
            return turn
        finally:
            engine.model_lock.release()

    @app.post("/api/runs/{rid}/assistant/{aid}/review")
    def assistant_review(request: Request, rid: str, aid: str, p: AssistantReview):
        own(request, rid)
        with engine.lock:
            engine.active(rid)
            turn = engine.store.get("assistant_turns", aid)
            if not turn or turn not in engine.store.rows("assistant_turns", rid):
                raise DomainError("Analysis not found", 404)
            turn.setdefault("review_history", []).append({"status": p.status, "note": p.note, "by": actor(request)["id"], "at": now()})
            turn.update(
                review_status=p.status,
                review_note=p.note,
                reviewed_by=actor(request)["id"],
                reviewed_at=now(),
            )
            engine.store.put("assistant_turns", aid, rid, turn)
            return turn

    @app.get("/api/progress")
    def progress(request: Request):
        attempts = [
            attempt_view(r, engine.store.get("scores", r["run_id"]))
            for r in engine.store.runs()
            if r["state"] in TERMINAL
            and (
                r["owner"] == actor(request)["id"]
                or actor(request)["role"] == "instructor"
            )
            and engine.store.get("scores", r["run_id"])
        ]
        return {"attempts": attempts, **summarize(attempts)}

    @app.get("/api/instructor")
    def dashboard(request: Request):
        instructor(request)
        return {
            "profiles": [
                {k: v for k, v in x.items() if k != "code_hash"}
                for x in engine.store.rows("profiles", "global")
            ],
            "cohorts": engine.store.rows("cohorts", "global"),
            "assignments": engine.store.rows("assignments", "global"),
            "runs": [engine.snapshot(r["run_id"]) for r in engine.store.runs()],
        }

    @app.post("/api/instructor/profiles")
    def profile(request: Request, p: ProfileRequest):
        instructor(request)
        code = secrets.token_urlsafe(12)
        pr = {
            "id": uid("learner"),
            "name": p.name,
            "role": "learner",
            "code_hash": digest(code),
        }
        engine.store.put("profiles", pr["id"], "global", pr)
        return {"id": pr["id"], "name": pr["name"], "access_code": code}

    @app.get("/api/people")
    def people(request: Request):
        return {
            "people": [
                {"id": p["id"], "name": p["name"]}
                for p in engine.store.rows("profiles", "global")
                if p.get("code_hash") and p["role"] == "learner"
            ]
        }

    @app.post("/api/instructor/cohorts")
    def cohort(request: Request, p: CohortRequest):
        instructor(request)
        members = list(dict.fromkeys(p.member_ids))
        if any(
            not (engine.store.get("profiles", mid) or {}).get("code_hash")
            for mid in members
        ):
            raise DomainError("Choose registered learners", 422)
        result = {
            "id": uid("cohort"),
            "name": p.name,
            "member_ids": members,
            "created_at": now(),
        }
        engine.store.put("cohorts", result["id"], "global", result)
        return result

    @app.post("/api/instructor/assignments")
    def assignment(request: Request, p: AssignmentRequest):
        instructor(request)
        if not engine.store.get("cohorts", p.cohort_id):
            raise DomainError("Cohort not found", 422)
        from .catalog import lookup

        if not lookup(p.scenario_id, p.scenario_version):
            raise DomainError("Scenario version not published", 422)
        result = {
            "id": uid("assignment"),
            **p.model_dump(),
            "assistance": "blind" if p.mode == "assessment" else p.assistance,
            "created_at": now(),
        }
        engine.store.put("assignments", result["id"], "global", result)
        return result

    def eligible(request, aid):
        a = engine.store.get("assignments", aid)
        cohort = engine.store.get("cohorts", a["cohort_id"]) if a else None
        if not a or not cohort or actor(request)["id"] not in cohort["member_ids"]:
            raise DomainError("Assignment not found", 404)
        return a

    @app.get("/api/assignments")
    def assignments(request: Request):
        results = []
        for a in engine.store.rows("assignments", "global"):
            c = engine.store.get("cohorts", a["cohort_id"])
            if c and actor(request)["id"] in c["member_ids"]:
                attempts = [
                    {
                        "run_id": r["run_id"],
                        "state": r["state"],
                        "outcome": r["outcome"],
                    }
                    for r in engine.store.runs()
                    if r.get("assignment_id") == a["id"]
                    and r["owner"] == actor(request)["id"]
                ]
                results.append({**a, "attempts": attempts})
        return {"assignments": results}

    @app.post("/api/assignments/{aid}/start")
    def start_assignment(request: Request, aid: str):
        a = eligible(request, aid)
        with engine.lock:
            # Assessment assignment attempts cannot be restarted to fish for a score.
            prior = [
                r
                for r in engine.store.runs()
                if r.get("assignment_id") == aid and r["owner"] == actor(request)["id"]
            ]
            if prior and a["mode"] == "assessment":
                raise DomainError("This assessment already has a recorded attempt", 409)
            s = engine.create(
                a["mode"],
                a["scenario_id"],
                a["scenario_version"],
                20261022,
                a["assistance"],
                actor(request)["id"],
            )
            r = engine.store.run(s["run_id"])
            r["assignment_id"] = aid
            engine.store.save(r)
            return engine.start(r["run_id"])

    @app.post("/api/instructor/runs/{rid}/injects")
    def inject(request: Request, rid: str, p: InjectRequest):
        instructor(request)
        with engine.lock:
            r = engine.active(rid)
            ws = engine.store.get("workspace", rid)
            message = {
                "id": uid("msg"),
                "kind": "instructor",
                "from": p.sender,
                "text": p.message,
                "at_sec": r["virtual_clock_sec"],
            }
            ws["messages"].append(message)
            engine.store.put("workspace", rid, rid, ws)
            engine.event(r, "instructor.message", resource_id=message["id"])
            return message

    return app
