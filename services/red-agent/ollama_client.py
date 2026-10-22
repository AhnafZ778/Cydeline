"""Minimal Ollama HTTP client with an injectable transport (FR-B01).

Why not the official SDK: the service needs exactly two endpoints
(``/api/tags`` and ``/api/chat``), zero install footprint, and a transport seam
so the whole decision loop can be unit-tested on a machine where the model is not
pulled yet. ``ollama`` the Python package is not a dependency of this segment.

Timeouts are layered on purpose:

* the **service** enforces the per-turn budget (``fallback.run_bounded``), and
* the **socket** timeout here is deliberately ~2s longer, so the service-level
  timeout is the one that fires first and the fallback is tagged ``timeout``
  rather than a generic ``model_error``.

That keeps failure provenance honest in the debrief (AT-05).
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
import time
from typing import Any, Callable, Mapping, Sequence
import urllib.error
import urllib.request

if __package__:
    from . import schemas as _s
else:
    import schemas as _s

DEFAULT_MODEL = "qwen3:1.7b"
DEFAULT_BASE_URL = "http://127.0.0.1:11434"

# transport(method, url, payload, timeout_s) -> parsed JSON body
Transport = Callable[[str, str, "Mapping[str, Any] | None", float], dict[str, Any]]


class OllamaUnavailable(_s.ModelInvocationError):
    """The local runtime is unreachable, refused the request, or returned an error."""


class OllamaProtocolError(_s.ModelInvocationError):
    """The runtime answered, but not with the documented response shape."""


def _normalise_base_url(raw: str) -> str:
    value = raw.strip().rstrip("/")
    if not value:
        return DEFAULT_BASE_URL
    if "://" not in value:
        # OLLAMA_HOST is conventionally "host:port" without a scheme.
        value = f"http://{value}"
    return value


@dataclass(frozen=True, slots=True)
class OllamaConfig:
    """Runtime configuration; every field is overridable by environment variable."""

    model: str = DEFAULT_MODEL
    base_url: str = DEFAULT_BASE_URL
    timeout_ms: int = 10_000
    temperature: float = 0.0
    num_predict: int = 180
    seed: int = 42
    keep_alive: str = "5m"
    # Qwen3-family models are thinking models: with thinking enabled the whole
    # num_predict budget can be spent on reasoning tokens, leaving ``content``
    # empty (measured: done_reason=length, eval_count=180). Disabled by default
    # because this service needs one small structured proposal per turn, not a
    # chain of thought. ``OLLAMA_THINK=1`` opts back in for experiments.
    think: bool = False

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "OllamaConfig":
        source = os.environ if env is None else env

        def _int(name: str, default: int) -> int:
            raw = source.get(name)
            if raw is None or not raw.strip():
                return default
            try:
                return int(raw)
            except ValueError as exc:
                raise _s.RedAgentError(f"{name} must be an integer, got {raw!r}") from exc

        def _float(name: str, default: float) -> float:
            raw = source.get(name)
            if raw is None or not raw.strip():
                return default
            try:
                return float(raw)
            except ValueError as exc:
                raise _s.RedAgentError(f"{name} must be a number, got {raw!r}") from exc

        def _bool(name: str, default: bool) -> bool:
            raw = source.get(name)
            if raw is None or not raw.strip():
                return default
            value = raw.strip().lower()
            if value in {"1", "true", "yes", "on"}:
                return True
            if value in {"0", "false", "no", "off"}:
                return False
            raise _s.RedAgentError(f"{name} must be a boolean, got {raw!r}")

        return cls(
            model=source.get("OLLAMA_MODEL", DEFAULT_MODEL),
            base_url=_normalise_base_url(source.get("OLLAMA_HOST", DEFAULT_BASE_URL)),
            timeout_ms=_int("RED_AGENT_TIMEOUT_MS", 10_000),
            temperature=_float("OLLAMA_TEMPERATURE", 0.0),
            num_predict=_int("OLLAMA_NUM_PREDICT", 180),
            seed=_int("OLLAMA_SEED", 42),
            keep_alive=source.get("OLLAMA_KEEP_ALIVE", "5m"),
            think=_bool("OLLAMA_THINK", False),
        )

    def __post_init__(self) -> None:
        if self.timeout_ms <= 0:
            raise _s.RedAgentError("timeout_ms must be positive")
        if not self.model.strip():
            raise _s.RedAgentError("model must not be empty")

    # -- derived -----------------------------------------------------------
    @property
    def normalised_base_url(self) -> str:
        return _normalise_base_url(self.base_url)

    @property
    def chat_url(self) -> str:
        return f"{self.normalised_base_url}/api/chat"

    @property
    def tags_url(self) -> str:
        return f"{self.normalised_base_url}/api/tags"

    @property
    def socket_timeout_s(self) -> float:
        """Socket timeout, deliberately longer than the service budget."""

        return self.timeout_ms / 1000.0 + 2.0

    def describe(self) -> dict[str, Any]:
        """Provenance block for the model card / decision trace."""

        return {
            "model": self.model,
            "base_url": self.normalised_base_url,
            "timeout_ms": self.timeout_ms,
            "temperature": self.temperature,
            "num_predict": self.num_predict,
            "seed": self.seed,
            "think": self.think,
        }


@dataclass(frozen=True, slots=True)
class ModelReply:
    """One completion plus the provenance the debrief needs."""

    text: str
    model: str
    latency_ms: float
    eval_count: int | None = None
    prompt_eval_count: int | None = None
    total_duration_ms: float | None = None
    done_reason: str | None = None
    thinking_chars: int = 0


def _urllib_transport(
    method: str,
    url: str,
    payload: "Mapping[str, Any] | None",
    timeout_s: float,
) -> dict[str, Any]:
    """Default transport. The only place in this segment that touches a socket."""

    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:  # noqa: S310
            body = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:300]
        raise OllamaUnavailable(f"Ollama returned HTTP {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise OllamaUnavailable(f"Ollama request failed: {exc}") from exc

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise OllamaProtocolError(f"Ollama returned non-JSON body: {exc}") from exc
    if not isinstance(parsed, dict):
        raise OllamaProtocolError("Ollama returned a non-object JSON body")
    return parsed


class OllamaClient:
    """Thin, testable wrapper over the two Ollama endpoints this segment needs."""

    def __init__(
        self,
        config: OllamaConfig | None = None,
        *,
        transport: Transport | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.config = config or OllamaConfig.from_env()
        self._transport: Transport = transport or _urllib_transport
        self._clock = clock

    # -- runtime introspection --------------------------------------------
    def health(self) -> dict[str, Any]:
        """Return the runtime's model list plus a compact provenance summary."""

        body = self._call("GET", self.config.tags_url, None)
        models = body.get("models")
        if not isinstance(models, list):
            raise OllamaProtocolError("/api/tags response has no 'models' list")
        return {
            "reachable": True,
            "base_url": self.config.normalised_base_url,
            "configured_model": self.config.model,
            "model_present": any(
                isinstance(entry, dict)
                and str(entry.get("name") or entry.get("model") or "")
                in {self.config.model, f"{self.config.model}:latest"}
                for entry in models
            ),
            "models": [
                {
                    "name": entry.get("name") or entry.get("model"),
                    "digest": entry.get("digest"),
                    "parameter_size": (entry.get("details") or {}).get("parameter_size"),
                    "quantization_level": (entry.get("details") or {}).get(
                        "quantization_level"
                    ),
                }
                for entry in models
                if isinstance(entry, dict)
            ],
        }

    def resolve_digest(self) -> str | None:
        """Digest of the configured model, or ``None`` when it is not pulled."""

        for entry in self.health().get("models", []):
            name = str(entry.get("name") or "")
            if name in {self.config.model, f"{self.config.model}:latest"}:
                digest = entry.get("digest")
                return str(digest) if digest else None
        return None

    # -- inference ---------------------------------------------------------
    def chat(
        self,
        messages: Sequence[Mapping[str, str]],
        *,
        format_schema: Mapping[str, Any] | None = None,
    ) -> ModelReply:
        """Send one chat completion and return the assistant text plus provenance."""

        payload: dict[str, Any] = {
            "model": self.config.model,
            "messages": [dict(message) for message in messages],
            "stream": False,
            "options": {
                "temperature": self.config.temperature,
                "num_predict": self.config.num_predict,
                "seed": self.config.seed,
            },
            "keep_alive": self.config.keep_alive,
            "think": self.config.think,
        }
        if format_schema is not None:
            payload["format"] = dict(format_schema)

        started = self._clock()
        body = self._call("POST", self.config.chat_url, payload)
        latency_ms = (self._clock() - started) * 1000.0

        if body.get("error"):
            raise OllamaUnavailable(f"Ollama error: {body['error']}")

        message = body.get("message")
        if not isinstance(message, dict):
            raise OllamaProtocolError("chat response has no 'message' object")
        content = message.get("content")
        if not isinstance(content, str):
            raise OllamaProtocolError("chat response 'message.content' is not a string")

        total_duration = body.get("total_duration")
        thinking = message.get("thinking")
        return ModelReply(
            text=content,
            model=str(body.get("model") or self.config.model),
            latency_ms=latency_ms,
            eval_count=body.get("eval_count") if isinstance(body.get("eval_count"), int) else None,
            prompt_eval_count=(
                body.get("prompt_eval_count")
                if isinstance(body.get("prompt_eval_count"), int)
                else None
            ),
            total_duration_ms=(
                total_duration / 1_000_000.0
                if isinstance(total_duration, int | float)
                else None
            ),
            done_reason=str(body["done_reason"]) if body.get("done_reason") else None,
            thinking_chars=len(thinking) if isinstance(thinking, str) else 0,
        )

    # -- internals ---------------------------------------------------------
    def _call(
        self, method: str, url: str, payload: "Mapping[str, Any] | None"
    ) -> dict[str, Any]:
        try:
            body = self._transport(method, url, payload, self.config.socket_timeout_s)
        except _s.RedAgentError:
            raise
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise OllamaUnavailable(f"Ollama request failed: {exc}") from exc
        except Exception as exc:  # noqa: BLE001 - transport is a caller-supplied seam
            raise _s.ModelInvocationError(f"transport failure: {exc}") from exc
        if not isinstance(body, dict):
            raise OllamaProtocolError("transport did not return a JSON object")
        return body
