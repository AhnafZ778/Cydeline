import base64
import hashlib
import hmac
import json
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.padding import PKCS7

from services.range_runtime.common import DomainError
from services.range_runtime.tool_worker import (
    ES_SETTINGS,
    ToolWorker,
    encrypted_grant,
    kibana_providers,
)


class ToolContractTests(unittest.TestCase):
    def test_guacamole_protocol_signature_and_expiry(self):
        key = "01" * 16
        payload = {
            "username": "learner",
            "expires": int(time.time() * 1000) + 120000,
            "connections": {},
        }
        blob = base64.b64decode(encrypted_grant(key, payload))
        decryptor = Cipher(
            algorithms.AES(bytes.fromhex(key)), modes.CBC(bytes(16))
        ).decryptor()
        raw = decryptor.update(blob) + decryptor.finalize()
        pad = PKCS7(128).unpadder()
        raw = pad.update(raw) + pad.finalize()
        signature, data = raw[:32], raw[32:]
        self.assertTrue(
            hmac.compare_digest(
                signature, hmac.new(bytes.fromhex(key), data, hashlib.sha256).digest()
            )
        )
        self.assertEqual(json.loads(data), payload)

    def test_worker_rejects_path_traversal_and_writes_only_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            worker = ToolWorker(temp)
            with self.assertRaises(DomainError):
                worker.folder("../secrets")
            worker.evidence("run_test", [{"event_id": "evt_1", "actor_id": "maya"}])
            self.assertEqual(
                json.loads((Path(temp) / "run_test/evidence/events.jsonl").read_text())[
                    "event_id"
                ],
                "evt_1",
            )


class WorkerNetworkingTests(unittest.TestCase):
    """Command construction against a recording fake of Docker; the real daemon is exercised by scripts/prove_optional_tools.py."""

    RID = "run_nettest"

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.worker = ToolWorker(self.tmp.name)
        self.job = {
            "generation": "g1",
            "run_id": self.RID,
            "profile": "siem",
            "status": "preparing",
            "message": "",
            "expires": time.time() + 600,
            "containers": [],
            "network": "net-internal",
            "edge": "net-edge",
            "es": "es-container",
            "password": "SUPER-SECRET-PASSWORD",
            "principal": "learner_1",
            "port": None,
        }
        self.worker.save(self.RID, self.job)
        self.calls = []

    def fake_docker(self, responses=None):
        responses = responses or {}

        def run(*args, timeout=120):
            self.calls.append(args)
            return responses.get(args[0], "")

        return mock.patch.object(self.worker, "docker", side_effect=run)

    def test_gateway_is_created_on_the_edge_joined_to_the_private_network_then_started(
        self,
    ):
        with self.fake_docker():
            self.worker.start_container(
                self.RID, self.job, "gateway", "img:1", edge=True
            )
        verbs = [c[0] if c[0] != "network" else "network " + c[1] for c in self.calls]
        self.assertEqual(verbs, ["create", "network connect", "start"])
        create = self.calls[0]
        self.assertEqual(create[create.index("--network") + 1], "net-edge")
        self.assertEqual(
            self.calls[1][2:], ("net-internal", "cydeline-run_nettest-gateway-g1")
        )

    def test_internal_only_container_never_touches_the_edge(self):
        with self.fake_docker():
            self.worker.start_container(self.RID, self.job, "desktop", "img:1")
        create = self.calls[0]
        self.assertEqual(create[create.index("--network") + 1], "net-internal")
        self.assertNotIn("net-edge", [a for call in self.calls for a in call])
        self.assertFalse(any(c[:2] == ("network", "connect") for c in self.calls))
        for flag in ("--cap-drop", "--memory", "--pids-limit", "--security-opt"):
            self.assertIn(flag, create)

    def test_created_container_is_tracked_even_if_start_fails(self):
        def run(*args, timeout=120):
            if args[0] == "start":
                raise DomainError("boom", 503)
            return ""

        with (
            mock.patch.object(self.worker, "docker", side_effect=run),
            self.assertRaises(DomainError),
        ):
            self.worker.start_container(
                self.RID, self.job, "gateway", "img:1", edge=True
            )
        self.assertEqual(self.job["containers"], ["cydeline-run_nettest-gateway-g1"])

    def test_cleanup_removes_both_networks_only_when_generation_matches(self):
        labels = json.dumps([{"Labels": {"cydeline.generation": "g1"}}])
        other = json.dumps([{"Labels": {"cydeline.generation": "someone-else"}}])

        def run(*args, timeout=120):
            self.calls.append(args)
            if args[:2] == ("network", "inspect"):
                return other if args[2] == "net-edge" else labels
            return ""

        with mock.patch.object(self.worker, "docker", side_effect=run):
            self.worker.cleanup(self.RID, self.job)
        removed = [c[2] for c in self.calls if c[:2] == ("network", "rm")]
        self.assertEqual(removed, ["net-internal"])

    def test_unpublished_port_is_an_explicit_error(self):
        unpublished = json.dumps([{"NetworkSettings": {"Ports": {"9200/tcp": None}}}])
        with (
            self.fake_docker({"inspect": unpublished}),
            self.assertRaises(DomainError) as caught,
        ):
            self.worker.published_port("anything", 9200)
        self.assertEqual(caught.exception.status, 503)
        published = json.dumps(
            [
                {
                    "NetworkSettings": {
                        "Ports": {
                            "5601/tcp": [{"HostIp": "127.0.0.1", "HostPort": "49153"}]
                        }
                    }
                }
            ]
        )
        with self.fake_docker({"inspect": published}):
            self.assertEqual(self.worker.published_port("kibana", 5601), 49153)

    def test_cluster_admin_goes_through_exec_without_the_password_on_the_command_line(
        self,
    ):
        seen = {}

        def run(argv, **kwargs):
            seen["argv"], seen["input"] = argv, kwargs.get("input")
            return subprocess.CompletedProcess(argv, 0, '{"acknowledged": true}', "")

        with mock.patch(
            "services.range_runtime.tool_worker.subprocess.run", side_effect=run
        ):
            result = self.worker.es(
                self.job, "PUT", "/_security/user/x", {"password": "body-only"}
            )
        self.assertEqual(result, {"acknowledged": True})
        self.assertEqual(seen["argv"][:4], ["docker", "exec", "-i", "es-container"])
        self.assertNotIn("SUPER-SECRET-PASSWORD", " ".join(seen["argv"]))
        self.assertIn("$ELASTIC_PASSWORD", " ".join(seen["argv"]))
        self.assertNotIn("body-only", " ".join(seen["argv"]))
        self.assertEqual(json.loads(seen["input"]), {"password": "body-only"})

    def test_failed_cluster_call_is_a_domain_error(self):
        failed = subprocess.CompletedProcess([], 22, "", "curl: (22) 401")
        with (
            mock.patch(
                "services.range_runtime.tool_worker.subprocess.run", return_value=failed
            ),
            self.assertRaises(DomainError),
        ):
            self.worker.es(self.job, "GET", "/_cluster/health")

    def test_evidence_is_bulk_indexed_through_the_cluster_and_rejections_surface(self):
        self.worker.evidence(
            self.RID,
            [
                {
                    "event_id": "evt_1",
                    "event_type": "http.request",
                    "timestamp_utc": "2026-10-22T00:00:00Z",
                    "actor_id": "maya",
                    "sequence": 1,
                    "session_handle": "sess_A",
                    "outcome": "allowed",
                    "network": {
                        "src_ip": "203.0.113.57",
                        "http_method": "GET",
                        "path": "/x",
                        "status_code": 200,
                    },
                }
            ],
        )
        with mock.patch.object(self.worker, "es", return_value={"errors": False}) as es:
            self.worker.index_events(self.RID, self.job)
        _, kwargs = es.call_args
        self.assertEqual(es.call_args.args[1:3], ("POST", "/_bulk?refresh=wait_for"))
        lines = kwargs["ndjson"].strip().splitlines()
        self.assertEqual(json.loads(lines[0])["index"]["_id"], "evt_1")
        self.assertEqual(json.loads(lines[1])["source"]["ip"], "203.0.113.57")
        with (
            mock.patch.object(self.worker, "es", return_value={"errors": True}),
            self.assertRaises(DomainError),
        ):
            self.worker.index_events(self.RID, self.job)

    def test_launching_before_any_event_is_released_indexes_nothing_without_error(self):
        # A learner can open the SIEM before the first event is released; the
        # evidence file is then a lone newline, which must not break launch.
        self.worker.evidence(self.RID, [])
        with mock.patch.object(self.worker, "es") as es:
            self.worker.index_events(self.RID, self.job)
        es.assert_not_called()

    def test_desktop_profile_has_nothing_to_index(self):
        self.job.update(profile="desktop", es=None)
        with mock.patch.object(self.worker, "es") as es:
            self.worker.index_events(self.RID, self.job)
        es.assert_not_called()

    def test_cluster_starts_on_a_nearly_full_disk_and_stays_private(self):
        self.assertEqual(
            ES_SETTINGS["cluster.routing.allocation.disk.threshold_enabled"], "false"
        )
        self.assertEqual(ES_SETTINGS["xpack.security.enabled"], "true")
        self.assertEqual(ES_SETTINGS["discovery.type"], "single-node")
        recorded = []

        def run(*args, timeout=120):
            recorded.append(args)
            if args[0] == "inspect":
                return json.dumps(
                    [
                        {
                            "NetworkSettings": {
                                "Ports": {"5601/tcp": [{"HostPort": "49200"}]}
                            }
                        }
                    ]
                )
            return ""

        with (
            mock.patch.object(self.worker, "docker", side_effect=run),
            mock.patch.object(self.worker, "wait_es"),
            mock.patch.object(self.worker, "es", return_value={}),
            mock.patch.object(self.worker, "wait_http"),
            mock.patch.object(self.worker, "index_events"),
            mock.patch("services.range_runtime.tool_worker.httpx.post"),
        ):
            self.worker.siem(self.RID, self.job)
        creates = {c[c.index("--name") + 1]: c for c in recorded if c[0] == "create"}
        es_args = next(a for n, a in creates.items() if "elasticsearch" in n)
        kibana_args = next(a for n, a in creates.items() if "kibana" in n)
        self.assertIn(
            "cluster.routing.allocation.disk.threshold_enabled=false", es_args
        )
        self.assertNotIn("-p", es_args)  # Elasticsearch publishes nothing
        self.assertEqual(es_args[es_args.index("--network") + 1], "net-internal")
        self.assertEqual(kibana_args[kibana_args.index("--network") + 1], "net-edge")
        self.assertIn("127.0.0.1::5601", kibana_args)

        # kibana-docker word-splits its option string, so every Kibana option value
        # must be a single shell word, and the provider JSON must stay valid.
        env = [kibana_args[i + 1] for i, a in enumerate(kibana_args) if a == "-e"]
        providers = next(
            e.split("=", 1)[1]
            for e in env
            if e.startswith("XPACK_SECURITY_AUTHC_PROVIDERS=")
        )
        self.assertEqual(len(providers.split()), 1)
        self.assertIn("XPACK_SECURITY_AUTHC_SELECTOR_ENABLED=false", env)


class KibanaProviderTests(unittest.TestCase):
    def test_provider_value_is_compact_valid_json_with_nested_records(self):
        value = kibana_providers("pw-with_chars-123")
        self.assertNotRegex(value, r"\s")
        parsed = json.loads(value)
        training = parsed["anonymous"]["training"]
        self.assertEqual(training["order"], 0)
        self.assertEqual(training["credentials"]["username"], "training_analyst")
        self.assertEqual(training["credentials"]["password"], "pw-with_chars-123")
        # Authenticated API access for the worker stays available behind it.
        self.assertEqual(parsed["basic"]["basic"]["order"], 1)
        # Dotted keys are not expanded inside env-var JSON.
        self.assertFalse(any("." in key for key in parsed))


class WindowsDesktopTests(unittest.TestCase):
    def test_missing_image_refuses_launch_before_creating_any_container(self):
        from services.range_runtime.tool_worker import Launch

        with (
            tempfile.TemporaryDirectory() as temp,
            mock.patch.dict("os.environ", {}, clear=True),
        ):
            worker = ToolWorker(temp)
            with (
                mock.patch.object(worker, "available_memory", return_value=8 * 1024**3),
                mock.patch.object(worker, "docker") as docker,
            ):
                with self.assertRaisesRegex(
                    DomainError, "Windows image is not configured"
                ):
                    worker.launch(
                        "run_windows",
                        Launch(profile="desktop", principal="learner", events=[]),
                    )
                docker.assert_not_called()
                self.assertIsNone(worker.load("run_windows"))

    def test_health_gates_only_windows_when_image_is_missing(self):
        with (
            tempfile.TemporaryDirectory() as temp,
            mock.patch.dict("os.environ", {}, clear=True),
        ):
            worker = ToolWorker(temp)
            with (
                mock.patch.object(worker, "available_memory", return_value=8 * 1024**3),
                mock.patch("services.range_runtime.tool_worker.subprocess.run"),
            ):
                health = worker.health()
            self.assertEqual(health["launchable"], {"desktop": False, "siem": True})
            self.assertEqual(health["desktop_os"], "Windows")
            self.assertIn("WINDOWS_BASE_IMAGE", health["desktop_blocker"])

    def test_windows_uses_readonly_base_private_display_and_kvm_without_host_secrets(
        self,
    ):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp) / "windows.qcow2"
            base.write_bytes(b"test base")
            worker = ToolWorker(temp)
            job = {
                "generation": "g1",
                "run_id": "run_windows",
                "profile": "desktop",
                "os": "Windows",
                "status": "preparing",
                "message": "",
                "expires": time.time() + 60,
                "containers": [],
                "network": "internal",
                "edge": "edge",
                "key": "01" * 16,
            }
            worker.save("run_windows", job)
            created = []

            def start(rid, j, suffix, image, **kwargs):
                created.append((suffix, image, kwargs))
                return suffix

            with (
                mock.patch.object(
                    worker, "windows_base", return_value=base
                ),
                mock.patch.object(worker, "start_container", side_effect=start),
                mock.patch.object(worker, "docker"),
                mock.patch.object(worker, "published_port", return_value=49155),
                mock.patch.object(worker, "wait_http"),
            ):
                worker.desktop("run_windows", job)
            name, image, settings = created[0]
            self.assertEqual((name, image), ("windows", "cydeline-windows:1"))
            self.assertFalse(settings.get("edge", False))
            self.assertIn("/dev/kvm", settings["extra"])
            self.assertIn(
                "type=bind,src=" + str(base) + ",dst=/image/windows.qcow2,readonly",
                settings["extra"],
            )
            group_at = settings["extra"].index("--group-add")
            self.assertEqual(settings["extra"][group_at + 1], str(base.stat().st_gid))
            self.assertFalse(
                any(
                    x in str(settings)
                    for x in ["docker.sock", "--privileged", "/home/"]
                )
            )
            self.assertEqual(created[-1][0], "gateway")
            self.assertTrue(created[-1][2]["edge"])
            self.assertIn("127.0.0.1::8080", created[-1][2]["extra"])

    def test_legacy_linux_job_is_never_exposed_as_windows(self):
        with tempfile.TemporaryDirectory() as temp:
            worker = ToolWorker(temp)
            worker.save(
                "run_legacy",
                {
                    "status": "ready",
                    "profile": "desktop",
                    "message": "",
                    "expires": time.time() + 60,
                },
            )
            result = worker.status("run_legacy")
            self.assertEqual(result["status"], "failed")
            self.assertNotIn("url", result)
            self.assertIn("relaunched as Windows", result["message"])
