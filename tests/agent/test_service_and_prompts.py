"""B2 tests: role prompts, Ollama client contract and ``choose_action`` provenance.

Everything runs offline against a fake transport, so the decision loop, timeout
classification and provenance capture are verified before ``qwen3:1.7b`` is even
pulled. The live latency benchmark belongs to Increment B3 and is *not* asserted
here — no number in this file is a performance claim.
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
import sys
import time
import unittest
import urllib.error

_SRC = Path(__file__).resolve().parents[2] / "services" / "red-agent"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from observation import active_observation, contained_observation  # noqa: E402
import prompts  # noqa: E402
import schemas  # noqa: E402
from ollama_client import (  # noqa: E402
    OllamaClient,
    OllamaConfig,
    OllamaProtocolError,
    OllamaUnavailable,
)
from service import ProposalResult, RedAgentService  # noqa: E402


def chat_body(content: str, *, model: str = "qwen3:1.7b") -> dict:
    return {
        "model": model,
        "message": {"role": "assistant", "content": content},
        "done": True,
        "eval_count": 41,
        "prompt_eval_count": 233,
        "total_duration": 1_500_000_000,
    }


class FakeTransport:
    """Records calls and replays a canned Ollama response."""

    def __init__(self, body=None, *, delay: float = 0.0, error: Exception | None = None):
        self.body = body if body is not None else chat_body("{}")
        self.delay = delay
        self.error = error
        self.calls: list[dict] = []

    def __call__(self, method, url, payload, timeout_s):
        self.calls.append(
            {"method": method, "url": url, "payload": payload, "timeout_s": timeout_s}
        )
        if self.delay:
            time.sleep(self.delay)
        if self.error is not None:
            raise self.error
        if callable(self.body):
            return self.body(method, url, payload)
        return self.body


def _service(content: str, **config_overrides) -> tuple[RedAgentService, FakeTransport]:
    transport = FakeTransport(chat_body(content))
    config = OllamaConfig(**{"timeout_ms": 500, **config_overrides})
    return RedAgentService(OllamaClient(config, transport=transport), config=config), transport


def _proposal_json(
    action: str = "inspect_session_status",
    role: str = "adaptation_planner",
    target_id: str | None = None,
    session_handle: str | None = "sess_A",
    reason: str = "The permitted session is revoked.",
) -> str:
    return json.dumps(
        {
            "role": role,
            "action": action,
            "target_id": target_id,
            "session_handle": session_handle,
            "reason": reason,
        }
    )


class PromptTests(unittest.TestCase):
    def test_every_role_has_a_distinct_system_prompt(self):
        rendered = {role: prompts.system_prompt(role) for role in schemas.ROLES}
        self.assertEqual(len(set(rendered.values())), len(schemas.ROLES))
        for role, text in rendered.items():
            self.assertIn(prompts.BASE_POLICY, text)
            self.assertIn(prompts.ROLE_INSTRUCTIONS[role], text)
            self.assertIn("Return exactly one JSON object", text)

    def test_unknown_role_is_rejected(self):
        with self.assertRaises(schemas.RedAgentError):
            prompts.system_prompt("root_operator")

    def test_prompt_enumerates_exactly_the_six_actions(self):
        text = prompts.system_prompt("access_operator")
        for action in schemas.ATTACKER_ACTIONS:
            self.assertIn(action, text)

    def test_prompt_hash_is_stable_and_role_scoped(self):
        first = prompts.prompt_hash("scout")
        self.assertEqual(first, prompts.prompt_hash("scout"))
        self.assertNotEqual(first, prompts.prompt_hash("access_operator"))
        self.assertEqual(len(first), 64)

    def test_schema_denies_additional_properties(self):
        self.assertIs(prompts.PROPOSAL_JSON_SCHEMA["additionalProperties"], False)
        self.assertEqual(
            sorted(prompts.PROPOSAL_JSON_SCHEMA["required"]),
            sorted(schemas.PROPOSAL_FIELDS),
        )
        self.assertEqual(
            prompts.PROPOSAL_JSON_SCHEMA["properties"]["action"]["enum"],
            list(schemas.ATTACKER_ACTIONS),
        )
        self.assertEqual(
            prompts.PROPOSAL_JSON_SCHEMA["properties"]["role"]["enum"],
            list(schemas.ROLES),
        )
        self.assertEqual(
            prompts.PROPOSAL_JSON_SCHEMA["properties"]["target_id"]["type"],
            ["string", "null"],
        )

    def test_schema_json_is_parseable(self):
        self.assertEqual(json.loads(prompts.schema_json()), prompts.PROPOSAL_JSON_SCHEMA)

    def test_messages_embed_the_sanitized_observation(self):
        observation = contained_observation()
        messages = prompts.build_messages("adaptation_planner", observation.to_prompt_json())
        self.assertEqual([m["role"] for m in messages], ["system", "user"])
        self.assertIn(observation.to_model_dict()["current_session_status"], messages[1]["content"])
        self.assertIn("untrusted scenario data", messages[1]["content"])

    def test_messages_carry_no_hidden_truth(self):
        messages = prompts.build_messages(
            "adaptation_planner", contained_observation().to_prompt_json()
        )
        blob = " ".join(m["content"] for m in messages).lower()
        for forbidden in ("hidden_answer", "answer_key", "bearer", "learner_score", "rubric"):
            self.assertNotIn(forbidden, blob)


class OllamaClientTests(unittest.TestCase):
    def test_chat_posts_structured_request(self):
        transport = FakeTransport(chat_body("ok"))
        client = OllamaClient(OllamaConfig(timeout_ms=7000), transport=transport)
        reply = client.chat(
            [{"role": "user", "content": "hi"}],
            format_schema=prompts.PROPOSAL_JSON_SCHEMA,
        )

        self.assertEqual(reply.text, "ok")
        self.assertEqual(reply.model, "qwen3:1.7b")
        self.assertGreaterEqual(reply.latency_ms, 0.0)
        self.assertEqual(reply.eval_count, 41)
        self.assertEqual(reply.prompt_eval_count, 233)
        self.assertAlmostEqual(reply.total_duration_ms or 0, 1500.0)

        call = transport.calls[0]
        self.assertEqual(call["method"], "POST")
        self.assertTrue(call["url"].endswith("/api/chat"))
        self.assertIs(call["payload"]["stream"], False)
        self.assertEqual(call["payload"]["format"], prompts.PROPOSAL_JSON_SCHEMA)
        self.assertEqual(call["payload"]["options"]["temperature"], 0.0)
        self.assertEqual(call["payload"]["options"]["seed"], 42)
        self.assertEqual(call["payload"]["keep_alive"], "5m")
        # Qwen3 thinking burns the whole num_predict budget before emitting
        # content (measured live), so it must be off in the request.
        self.assertIs(call["payload"]["think"], False)

    def test_thinking_can_be_opted_into_explicitly(self):
        transport = FakeTransport(chat_body("ok"))
        client = OllamaClient(OllamaConfig(think=True), transport=transport)
        client.chat([{"role": "user", "content": "hi"}])
        self.assertIs(transport.calls[0]["payload"]["think"], True)

    def test_socket_timeout_exceeds_service_budget(self):
        config = OllamaConfig(timeout_ms=5000)
        self.assertGreater(config.socket_timeout_s, 5.0)

    def test_health_reports_model_presence(self):
        body = {
            "models": [
                {
                    "name": "qwen3:1.7b",
                    "digest": "abc123",
                    "details": {"parameter_size": "1.7B", "quantization_level": "Q4_K_M"},
                }
            ]
        }
        client = OllamaClient(OllamaConfig(), transport=FakeTransport(body))
        health = client.health()
        self.assertTrue(health["reachable"])
        self.assertTrue(health["model_present"])
        self.assertEqual(health["models"][0]["quantization_level"], "Q4_K_M")
        self.assertEqual(client.resolve_digest(), "abc123")

    def test_health_reports_missing_model_without_raising(self):
        body = {"models": [{"name": "other:latest", "digest": "d"}]}
        client = OllamaClient(OllamaConfig(), transport=FakeTransport(body))
        self.assertFalse(client.health()["model_present"])
        self.assertIsNone(client.resolve_digest())

    def test_unreachable_runtime_is_a_model_error(self):
        client = OllamaClient(
            OllamaConfig(),
            transport=FakeTransport(error=urllib.error.URLError("connection refused")),
        )
        with self.assertRaises(OllamaUnavailable):
            client.chat([{"role": "user", "content": "hi"}])

    def test_runtime_error_payload_is_surfaced(self):
        client = OllamaClient(
            OllamaConfig(), transport=FakeTransport({"error": "model not found"})
        )
        with self.assertRaises(OllamaUnavailable):
            client.chat([{"role": "user", "content": "hi"}])

    def test_missing_message_object_is_a_protocol_error(self):
        client = OllamaClient(OllamaConfig(), transport=FakeTransport({"done": True}))
        with self.assertRaises(OllamaProtocolError):
            client.chat([{"role": "user", "content": "hi"}])

    def test_non_string_content_is_a_protocol_error(self):
        client = OllamaClient(
            OllamaConfig(), transport=FakeTransport({"message": {"content": 42}})
        )
        with self.assertRaises(OllamaProtocolError):
            client.chat([{"role": "user", "content": "hi"}])

    def test_config_from_env_defaults_and_normalisation(self):
        config = OllamaConfig.from_env({})
        self.assertEqual(config.model, "qwen3:1.7b")
        self.assertEqual(config.normalised_base_url, "http://127.0.0.1:11434")

        custom = OllamaConfig.from_env(
            {"OLLAMA_HOST": "127.0.0.1:11434/", "OLLAMA_MODEL": "qwen3:4b"}
        )
        # from_env normalises immediately, so a scheme-less OLLAMA_HOST works.
        self.assertEqual(custom.base_url, "http://127.0.0.1:11434")
        self.assertEqual(custom.normalised_base_url, "http://127.0.0.1:11434")
        self.assertEqual(custom.chat_url, "http://127.0.0.1:11434/api/chat")
        self.assertEqual(custom.model, "qwen3:4b")

    def test_invalid_env_value_is_rejected(self):
        with self.assertRaises(schemas.RedAgentError):
            OllamaConfig.from_env({"RED_AGENT_TIMEOUT_MS": "soon"})

    def test_thinking_env_flag_defaults_off_and_parses_booleans(self):
        self.assertFalse(OllamaConfig.from_env({}).think)
        self.assertFalse(OllamaConfig.from_env({"OLLAMA_THINK": "off"}).think)
        self.assertTrue(OllamaConfig.from_env({"OLLAMA_THINK": "1"}).think)
        self.assertTrue(OllamaConfig.from_env({"OLLAMA_THINK": "True"}).think)
        with self.assertRaises(schemas.RedAgentError):
            OllamaConfig.from_env({"OLLAMA_THINK": "maybe"})

    def test_reply_surfaces_done_reason_and_thinking_volume(self):
        body = chat_body("")
        body["done_reason"] = "length"
        body["message"]["thinking"] = "reasoning..." * 10
        client = OllamaClient(OllamaConfig(), transport=FakeTransport(body))
        reply = client.chat([{"role": "user", "content": "hi"}])
        self.assertEqual(reply.done_reason, "length")
        self.assertEqual(reply.thinking_chars, len("reasoning..." * 10))

    def test_truncated_empty_content_falls_back_under_think_default(self):
        """The live failure mode: content empty because thinking ate the budget."""

        body = chat_body("")
        body["done_reason"] = "length"
        body["message"]["thinking"] = "long private reasoning"
        config = OllamaConfig(timeout_ms=500)
        service = RedAgentService(
            OllamaClient(config, transport=FakeTransport(body)), config=config
        )
        outcome = service.choose_action(
            "run_0001", "adaptation_planner", contained_observation()
        )
        self.assertTrue(outcome.fallback_used)
        self.assertIn(schemas.FALLBACK_INVALID_JSON, outcome.fallback_reason)
        self.assertEqual(outcome.metadata["done_reason"], "length")
        self.assertGreater(outcome.metadata["thinking_chars"], 0)

    def test_empty_model_is_rejected(self):
        with self.assertRaises(schemas.RedAgentError):
            OllamaConfig(model="  ")


class ChooseActionTests(unittest.TestCase):
    def test_result_type_matches_the_contract_name(self):
        self.assertIs(ProposalResult, __import__("fallback").DecisionOutcome)

    def test_valid_model_decision_is_accepted_with_provenance(self):
        service, transport = _service(_proposal_json())
        observation = contained_observation()
        outcome = service.choose_action("run_0001", "adaptation_planner", observation)

        self.assertTrue(outcome.accepted)
        self.assertFalse(outcome.fallback_used)
        self.assertEqual(outcome.proposal.action, "inspect_session_status")
        self.assertEqual(outcome.metadata["observation_hash"], observation.observation_hash)
        self.assertEqual(outcome.metadata["prompt_hash"], prompts.prompt_hash("adaptation_planner"))
        self.assertEqual(outcome.metadata["model_id"], "qwen3:1.7b")
        self.assertEqual(outcome.metadata["role"], "adaptation_planner")
        self.assertGreaterEqual(outcome.metadata["model_latency_ms"], 0.0)
        self.assertEqual(len(transport.calls), 1)

        # The prompt actually sent matches the documented builder.
        sent = transport.calls[0]["payload"]["messages"]
        self.assertEqual(sent, prompts.build_messages("adaptation_planner", observation.to_prompt_json()))

    def test_request_contains_no_unallowlisted_observation_keys(self):
        service, transport = _service(_proposal_json())
        service.choose_action("run_0001", "adaptation_planner", contained_observation())
        user_content = transport.calls[0]["payload"]["messages"][1]["content"]
        payload = json.loads(user_content.split("\n", 1)[1])
        self.assertEqual(set(payload), set(schemas.OBSERVATION_FIELDS))

    def test_observation_mapping_is_accepted(self):
        service, _ = _service(_proposal_json())
        outcome = service.choose_action(
            "run_0001", "adaptation_planner", contained_observation().to_model_dict()
        )
        self.assertTrue(outcome.accepted)

    def test_run_mismatch_is_a_caller_defect(self):
        service, _ = _service(_proposal_json())
        with self.assertRaises(schemas.RedAgentError):
            service.choose_action("run_9999", "adaptation_planner", contained_observation())

    def test_role_mismatch_is_a_caller_defect(self):
        service, _ = _service(_proposal_json())
        with self.assertRaises(schemas.RedAgentError):
            service.choose_action("run_0001", "scout", contained_observation())

    def test_unknown_role_is_a_caller_defect(self):
        service, _ = _service(_proposal_json())
        with self.assertRaises(schemas.RedAgentError):
            service.choose_action("run_0001", "root_operator", contained_observation())

    def test_garbage_output_falls_back_and_is_tagged(self):
        service, _ = _service("Sure, I'll poke around the network.")
        outcome = service.choose_action("run_0001", "adaptation_planner", contained_observation())
        self.assertTrue(outcome.fallback_used)
        self.assertFalse(outcome.accepted)
        self.assertIn(schemas.FALLBACK_INVALID_JSON, outcome.fallback_reason)
        self.assertEqual(outcome.proposal.action, "inspect_session_status")
        self.assertTrue(outcome.metadata["attempted_model_call"])

    def test_out_of_policy_output_falls_back(self):
        service, _ = _service(
            _proposal_json(action="request_document", target_id="doc_finance_07")
        )
        outcome = service.choose_action("run_0001", "adaptation_planner", contained_observation())
        self.assertTrue(outcome.fallback_used)
        self.assertIn(schemas.FALLBACK_POLICY_REJECTION, outcome.fallback_reason)

    def test_slow_model_is_bounded_and_tagged_as_timeout(self):
        transport = FakeTransport(chat_body(_proposal_json()), delay=3.0)
        config = OllamaConfig(timeout_ms=200)
        service = RedAgentService(OllamaClient(config, transport=transport), config=config)

        started = time.monotonic()
        outcome = service.choose_action("run_0001", "adaptation_planner", contained_observation())
        elapsed = time.monotonic() - started

        self.assertLess(elapsed, 0.9, f"turn was not bounded: {elapsed:.3f}s")
        self.assertTrue(outcome.fallback_used)
        self.assertIn(schemas.FALLBACK_TIMEOUT, outcome.fallback_reason)
        self.assertFalse(outcome.metadata["attempted_model_call"])
        self.assertIsNone(outcome.metadata["model_latency_ms"])

    def test_unreachable_runtime_falls_back_with_model_error(self):
        transport = FakeTransport(error=urllib.error.URLError("connection refused"))
        config = OllamaConfig(timeout_ms=500)
        service = RedAgentService(OllamaClient(config, transport=transport), config=config)

        outcome = service.choose_action("run_0001", "adaptation_planner", contained_observation())
        self.assertTrue(outcome.fallback_used)
        self.assertIn(schemas.FALLBACK_MODEL_ERROR, outcome.fallback_reason)

    def test_fallback_envelope_stays_at_five_fields(self):
        service, _ = _service("no json here")
        outcome = service.choose_action("run_0001", "adaptation_planner", contained_observation())
        self.assertEqual(
            sorted(outcome.proposal.to_dict()), sorted(schemas.PROPOSAL_FIELDS)
        )
        self.assertNotIn("fallback_used", outcome.proposal.to_dict())

    def test_active_session_can_request_the_document(self):
        service, _ = _service(
            _proposal_json(
                action="request_document",
                role="access_operator",
                target_id="doc_finance_07",
                reason="The resource was listed as available to this session.",
            )
        )
        outcome = service.choose_action("run_0001", "access_operator", active_observation())
        self.assertTrue(outcome.accepted, outcome.validation.rejection_reason)
        self.assertEqual(
            outcome.action_payload,
            {
                "action": "request_document",
                "target_id": "doc_finance_07",
                "session_handle": "sess_A",
            },
        )

    def test_async_wrapper_returns_the_same_shape(self):
        service, _ = _service(_proposal_json())
        outcome = asyncio.run(
            service.achoose_action("run_0001", "adaptation_planner", contained_observation())
        )
        self.assertTrue(outcome.accepted)
        self.assertIn("observation_hash", outcome.metadata)

    def test_info_exposes_no_secrets(self):
        service, _ = _service(_proposal_json())
        info = service.info().to_dict()
        self.assertEqual(info["model"], "qwen3:1.7b")
        self.assertEqual(info["schema_version"], schemas.RED_AGENT_SCHEMA_VERSION)
        self.assertEqual(info["prompt_version"], prompts.PROMPT_VERSION)
        blob = json.dumps(info).lower()
        for forbidden in ("token", "secret", "password", "answer_key"):
            self.assertNotIn(forbidden, blob)

    def test_health_delegates_to_the_client(self):
        body = {"models": [{"name": "qwen3:1.7b", "digest": "abc"}]}
        transport = FakeTransport(body)
        config = OllamaConfig(timeout_ms=500)
        service = RedAgentService(OllamaClient(config, transport=transport), config=config)
        self.assertTrue(service.health()["model_present"])


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
