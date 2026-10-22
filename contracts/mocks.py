"""Static mock payloads for Ahnaf (browser) and Tanvir (red-agent).

Fixtures live as plain JSON in ``contracts/mocks/`` so they can be copied into a
TypeScript mock module or loaded by a test without importing Python. They are
learner-visible payloads only: no hidden ground truth, scores-from-answer-key, or
raw target internals.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import (
    CONTRACT_MODELS,
    DeclarationResponse,
    DebriefResponse,
    DefenderActionResponse,
    ErrorResponse,
    EventPage,
    HealthResponse,
    ReplayResponse,
    RunResponse,
    SSEFrame,
    VerificationResponse,
)

MOCKS_DIR = Path(__file__).resolve().parent / "mocks"

MOCK_MODELS: dict[str, type] = {
    "attacker_proposal": CONTRACT_MODELS["AttackerProposal"],
    "run": RunResponse,
    "event_page": EventPage,
    "declaration": DeclarationResponse,
    "defender_action": DefenderActionResponse,
    "verification": VerificationResponse,
    "debrief": DebriefResponse,
    "replay": ReplayResponse,
    "health": HealthResponse,
    "error": ErrorResponse,
}

SSE_FRAMES_FILE = "sse_frames.jsonl"


def load_mock(name: str) -> dict[str, Any]:
    """Return one mock payload by base name (without ``.json``)."""

    if name not in MOCK_MODELS:
        raise KeyError(f"unknown mock {name!r}; choose from {sorted(MOCK_MODELS)}")
    path = MOCKS_DIR / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def validate_mocks() -> dict[str, Any]:
    """Parse every JSON mock through its canonical model.

    Returns the validated model instances. Any schema drift raises
    ``pydantic.ValidationError``, which is what the contract test asserts.
    """

    return {name: model.model_validate(load_mock(name)) for name, model in MOCK_MODELS.items()}


def load_sse_frames() -> list[dict[str, Any]]:
    """Return the raw SSE frames from ``sse_frames.jsonl``."""

    path = MOCKS_DIR / SSE_FRAMES_FILE
    frames: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            frames.append(json.loads(line))
    return frames


def validate_sse_frames() -> list[SSEFrame]:
    """Validate every SSE frame and its embedded event envelope."""

    return [SSEFrame.model_validate(frame) for frame in load_sse_frames()]


def mock_filenames() -> list[str]:
    """Return every static fixture under ``contracts/mocks/``."""

    return sorted(path.name for path in MOCKS_DIR.iterdir() if path.is_file())


__all__ = [
    "MOCKS_DIR",
    "MOCK_MODELS",
    "SSE_FRAMES_FILE",
    "load_mock",
    "load_sse_frames",
    "mock_filenames",
    "validate_mocks",
    "validate_sse_frames",
]
