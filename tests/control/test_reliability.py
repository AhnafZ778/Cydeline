"""Runtime reliability: credential-guess throttling, session rotation, dependency health, structured logs."""

import io
import json
import logging
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient
from test_live_control import TestAgent

from services.range_runtime.adapter import HttpTargetAdapter
from services.range_runtime.agent import LocalAgent
from services.range_runtime.api import create_control
from services.range_runtime.assistant import (
    ASSISTANT_TIMEOUT_MS,
    EvidenceAssistant,
    assistant_timeout_ms,
)
from services.range_runtime.common import DomainError, LoginThrottle
from services.range_runtime.logs import JsonFormatter, configure_logging
from services.range_runtime.target import create_target
from services.range_runtime.tool_worker import MEMORY_GATE, ToolWorker, create_worker

PIN = "instructor-test"


class Clock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


class ThrottleTests(unittest.TestCase):
    def test_locks_after_the_limit_and_recovers_after_the_lockout(self):
        clock = Clock()
        gate = LoginThrottle(limit=3, window=60, lockout=30, clock=clock)
        for _ in range(3):
            gate.check("a")
            gate.failed("a")
        with self.assertRaises(DomainError) as caught:
            gate.check("a")
        self.assertEqual(caught.exception.status, 429)
        self.assertEqual(int(caught.exception.headers["Retry-After"]), 31)
        clock.t += 31
        gate.check("a")

    def test_failures_age_out_and_success_clears_them(self):
        clock = Clock()
        gate = LoginThrottle(limit=3, window=60, lockout=30, clock=clock)
        gate.failed("a")
        gate.failed("a")
        clock.t += 61
        gate.failed("a")
        gate.check("a")  # the first two aged out, so this is only failure one of three
        gate.failed("a")
        gate.passed("a")
        for _ in range(2):
            gate.failed("a")
        gate.check("a")

    def test_callers_are_isolated_and_memory_is_bounded(self):
        clock = Clock()
        gate = LoginThrottle(limit=1, window=60, lockout=30, clock=clock)
        gate.failed("a")
        gate.check("b")
        clock.t += 120
        for index in range(1100):
            gate.failed(f"caller-{index}")
        self.assertLess(len(gate.failures) + len(gate.locked), 1100 * 2)


class ControlHarness(unittest.TestCase):
    def build(self, agent=None, **kwargs):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        path = Path(self.tmp.name)
        self.target_client = TestClient(
            create_target(path / "target.db", "test"),
            headers={"x-range-secret": "test"},
        )
        self.addCleanup(self.target_client.close)
        self.app = create_control(
            path / "control.db",
            HttpTargetAdapter(self.target_client),
            agent or TestAgent(),
            auto=False,
            instructor_pin=PIN,
            **kwargs,
        )
        client = TestClient(self.app)
        self.addCleanup(client.close)
        return client


class LoginTests(ControlHarness):
    def test_repeated_wrong_codes_are_throttled_even_before_the_right_pin(self):
        client = self.build()
        statuses = [
            client.post("/api/session", json={"code": f"wrong-code-{n}"}).status_code
            for n in range(5)
        ]
        self.assertEqual(statuses, [401] * 5)
        blocked = client.post("/api/session", json={"code": PIN})
        self.assertEqual(blocked.status_code, 429)
        self.assertGreaterEqual(int(blocked.headers["Retry-After"]), 1)
        self.assertEqual(client.get("/api/session").json()["role"], "learner")

    def test_successful_login_does_not_count_against_the_caller(self):
        client = self.build()
        for _ in range(3):
            self.assertEqual(
                client.post("/api/session", json={"code": "bad-code-0"}).status_code,
                401,
            )
        self.assertEqual(
            client.post("/api/session", json={"code": PIN}).status_code, 200
        )
        for _ in range(4):
            self.assertEqual(
                client.post("/api/session", json={"code": "bad-code-0"}).status_code,
                401,
            )

    def test_login_rotates_the_session_credential(self):
        client = self.build()
        client.get("/api/session")
        before = client.cookies.get("cydeline_session")
        self.assertTrue(before)
        result = client.post("/api/session", json={"code": PIN})
        self.assertEqual(result.json()["role"], "instructor")
        after = client.cookies.get("cydeline_session")
        self.assertNotEqual(before, after)
        self.assertEqual(client.get("/api/session").json()["role"], "instructor")

        # The pre-login credential must not retain or regain the elevated role.
        stale = TestClient(self.app, cookies={"cydeline_session": before})
        self.addCleanup(stale.close)
        self.assertEqual(stale.get("/api/session").json()["role"], "learner")
        self.assertEqual(stale.get("/api/instructor").status_code, 403)

    def test_logout_invalidates_the_previous_credential(self):
        client = self.build()
        client.post("/api/session", json={"code": PIN})
        instructor_cookie = client.cookies.get("cydeline_session")
        client.post("/api/session/logout")
        self.assertNotEqual(client.cookies.get("cydeline_session"), instructor_cookie)
        replay = TestClient(self.app, cookies={"cydeline_session": instructor_cookie})
        self.addCleanup(replay.close)
        self.assertEqual(replay.get("/api/session").json()["role"], "learner")

    def test_instructor_session_survives_a_control_restart_until_rotated_away(self):
        client = self.build()
        client.post("/api/session", json={"code": PIN})
        cookie = client.cookies.get("cydeline_session")
        again = create_control(
            Path(self.tmp.name) / "control.db",
            HttpTargetAdapter(self.target_client),
            TestAgent(),
            auto=False,
            instructor_pin=PIN,
        )
        restarted = TestClient(again, cookies={"cydeline_session": cookie})
        self.addCleanup(restarted.close)
        self.assertEqual(restarted.get("/api/session").json()["role"], "instructor")


class HealthTests(ControlHarness):
    def test_core_services_are_probed_not_assumed(self):
        client = self.build()
        body = client.get("/api/health").json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["services"], {"control": "ok", "target": "ok"})

        with mock.patch.object(
            HttpTargetAdapter, "health", side_effect=RuntimeError("down")
        ):
            down = client.get("/api/health").json()
        self.assertEqual(down["status"], "unavailable")
        self.assertEqual(down["services"]["target"], "unavailable")

    def test_unreachable_model_runtime_degrades_health_instead_of_failing_it(self):
        class Broken(TestAgent):
            def health(self):
                raise RuntimeError("model runtime exploded")

        client = self.build(agent=Broken())
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "degraded")
        self.assertFalse(body["model"]["available"])
        self.assertEqual(body["services"]["target"], "ok")

    def test_local_agent_reports_an_unreachable_runtime_as_data(self):
        with mock.patch.dict(
            "os.environ", {"OLLAMA_HOST": "http://model-host.invalid:11434"}
        ):
            agent = LocalAgent()
        report = agent.health()
        self.assertFalse(report["reachable"])
        self.assertFalse(report["model_present"])
        self.assertTrue(report["configured_model"])
        self.assertEqual(report["error"], "OllamaUnavailable")

    def test_optional_tool_worker_is_reported_but_never_fails_the_core(self):
        with tempfile.TemporaryDirectory() as temp:
            worker_app = create_worker(temp, "worker-secret")
            worker_client = TestClient(
                worker_app, headers={"x-range-secret": "worker-secret"}
            )
            self.addCleanup(worker_client.close)
            with (
                mock.patch.dict(
                    "os.environ", {"RANGE_WORKER_URL": "http://worker.test"}
                ),
                mock.patch(
                    "services.range_runtime.api.httpx.Client",
                    lambda **_: worker_client,
                ),
            ):
                client = self.build()

            ok = subprocess.CompletedProcess([], 0, b"", b"")
            enough = MEMORY_GATE["siem"] + 2**30
            with (
                mock.patch(
                    "services.range_runtime.tool_worker.subprocess.run", return_value=ok
                ),
                mock.patch.object(ToolWorker, "available_memory", return_value=enough),
            ):
                self.assertEqual(
                    client.get("/api/health").json()["services"]["tools"], "ok"
                )

            with mock.patch(
                "services.range_runtime.tool_worker.subprocess.run",
                side_effect=FileNotFoundError("docker"),
            ):
                body = client.get("/api/health").json()
            self.assertEqual(body["services"]["tools"], "degraded")
            self.assertEqual(body["status"], "ok")

            worker_client.headers["x-range-secret"] = "wrong"
            self.assertEqual(
                client.get("/api/health").json()["services"]["tools"], "unavailable"
            )

    def test_worker_reports_which_profiles_could_launch_now(self):
        with tempfile.TemporaryDirectory() as temp:
            worker = ToolWorker(temp)
            ok = subprocess.CompletedProcess([], 0, b"", b"")
            with (
                mock.patch(
                    "services.range_runtime.tool_worker.subprocess.run", return_value=ok
                ),
                mock.patch.object(
                    ToolWorker, "available_memory", return_value=MEMORY_GATE["desktop"]
                ),
                mock.patch.object(
                    ToolWorker,
                    "windows_base",
                    return_value=Path("/prepared/windows.qcow2"),
                ),
            ):
                report = worker.health()
            self.assertEqual(report["launchable"], {"desktop": True, "siem": True})
            with (
                mock.patch(
                    "services.range_runtime.tool_worker.subprocess.run", return_value=ok
                ),
                mock.patch.object(ToolWorker, "available_memory", return_value=None),
            ):
                self.assertEqual(
                    worker.health()["launchable"], {"desktop": False, "siem": False}
                )


class AssistantTimeoutTests(unittest.TestCase):
    def test_analysis_gets_a_longer_budget_than_an_adversary_step(self):
        adversary = LocalAgent().action_client.config.timeout_ms
        configured = EvidenceAssistant().client.config
        self.assertGreater(configured.timeout_ms, adversary)
        self.assertEqual(configured.num_predict, 350)

    def test_timeout_is_overridable_and_garbage_falls_back_safely(self):
        self.assertEqual(assistant_timeout_ms({"ASSISTANT_TIMEOUT_MS": "90000"}), 90000)
        for bad in ("abc", "0", "-5", ""):
            self.assertEqual(
                assistant_timeout_ms({"ASSISTANT_TIMEOUT_MS": bad}),
                ASSISTANT_TIMEOUT_MS,
            )


class LoggingTests(ControlHarness):
    def test_records_are_json_and_never_carry_secrets(self):
        stream = io.StringIO()
        handler = logging.StreamHandler(stream)
        handler.setFormatter(JsonFormatter())
        logger = logging.getLogger("services.range_runtime.api")
        logger.addHandler(handler)
        previous = logger.level
        logger.setLevel(logging.INFO)
        self.addCleanup(logger.removeHandler, handler)
        self.addCleanup(logger.setLevel, previous)

        client = self.build()
        client.post("/api/session", json={"code": "guess-that-must-not-leak"})
        client.get("/api/scenarios")

        lines = [json.loads(line) for line in stream.getvalue().splitlines()]
        requests = [line for line in lines if line["message"] == "request"]
        login = next(
            r
            for r in requests
            if r["route"] == "/api/session" and r["method"] == "POST"
        )
        self.assertEqual(login["status"], 401)
        self.assertGreaterEqual(login["duration_ms"], 0)
        self.assertTrue(any(r["route"] == "/api/scenarios" for r in requests))
        self.assertNotIn("guess-that-must-not-leak", stream.getvalue())
        self.assertNotIn("cydeline_session", stream.getvalue())
        self.assertTrue(any(line["message"] == "login rejected" for line in lines))

    def test_redaction_is_by_field_name_and_configure_is_idempotent(self):
        stream = io.StringIO()
        formatter = JsonFormatter()
        record = logging.LogRecord("x", logging.INFO, __file__, 1, "evt", (), None)
        record.range_secret = "abc"
        record.mapping = "kept"
        record.idempotency_key = "idem_1"
        body = json.loads(formatter.format(record))
        self.assertEqual(body["range_secret"], "[redacted]")
        self.assertEqual(body["mapping"], "kept")
        self.assertEqual(body["idempotency_key"], "idem_1")

        root = logging.getLogger()
        before = len(root.handlers)
        configure_logging(stream=stream)
        configure_logging(stream=stream)
        installed = len(root.handlers) - before
        self.assertLessEqual(installed, 1)
        for handler in [h for h in root.handlers if getattr(h, "_cydeline", False)]:
            root.removeHandler(handler)


if __name__ == "__main__":
    unittest.main()
