from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime


def now():
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def uid(prefix):
    return prefix + "_" + uuid.uuid4().hex[:20]


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


class DomainError(Exception):
    def __init__(self, message, status=409, headers=None):
        self.message, self.status, self.headers = message, status, headers


class LoginThrottle:
    """Bound credential guessing: `limit` failures inside `window` seconds lock the caller out for `lockout` seconds."""

    def __init__(self, limit=5, window=300, lockout=60, clock=None):
        import time

        self.limit, self.window, self.lockout = limit, window, lockout
        self.clock = clock or time.monotonic
        self.failures = {}
        self.locked = {}

    def check(self, key):
        now_ = self.clock()
        until = self.locked.get(key, 0)
        if until > now_:
            wait = int(until - now_) + 1
            raise DomainError(
                f"Too many failed attempts. Try again in {wait} seconds.",
                429,
                {"Retry-After": str(wait)},
            )
        self.locked.pop(key, None)

    def failed(self, key):
        now_ = self.clock()
        recent = [t for t in self.failures.get(key, []) if now_ - t < self.window]
        recent.append(now_)
        if len(recent) >= self.limit:
            self.locked[key] = now_ + self.lockout
            recent = []
        self.failures[key] = recent
        if len(self.failures) > 1024:
            self.prune(now_)

    def passed(self, key):
        self.failures.pop(key, None)
        self.locked.pop(key, None)

    def prune(self, now_):
        self.failures = {
            k: v
            for k, v in self.failures.items()
            if any(now_ - t < self.window for t in v)
        }
        self.locked = {k: u for k, u in self.locked.items() if u > now_}
