"""Structured, secret-safe logging shared by the control, target and worker services."""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time

# Any field with one of these words in its name (split on "_" / "-") is never written, whatever its value.
SENSITIVE = frozenset(
    {"secret", "token", "pin", "code", "cookie", "authorization", "password", "key"}
)
_RESERVED = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime", "taskName"}


def redact(key, value):
    lowered = str(key).lower()
    if lowered == "idempotency_key":
        return value
    if SENSITIVE & set(re.split(r"[^a-z0-9]+", lowered)):
        return "[redacted]"
    return value


class JsonFormatter(logging.Formatter):
    def format(self, record):
        body = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key in _RESERVED or key.startswith("_"):
                continue
            body[key] = redact(key, value)
        if record.exc_info:
            body["exception"] = self.formatException(record.exc_info)
        return json.dumps(body, default=str, separators=(",", ":"))


def configure_logging(level=None, stream=None):
    """Install one JSON handler on the root logger; safe to call repeatedly."""
    root = logging.getLogger()
    for handler in root.handlers:
        if getattr(handler, "_cydeline", False):
            return
    handler = logging.StreamHandler(stream or sys.stderr)
    handler.setFormatter(JsonFormatter())
    handler._cydeline = True  # type: ignore[attr-defined]
    root.addHandler(handler)
    root.setLevel((level or os.environ.get("LOG_LEVEL", "INFO")).upper())
    # httpx logs full request URLs at INFO; the runtime emits its own request records.
    logging.getLogger("httpx").setLevel(logging.WARNING)
