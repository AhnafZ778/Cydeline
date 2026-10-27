"""Private, encrypted observer evidence. Never part of learner projections."""
from __future__ import annotations

import base64
import json
import os
import fcntl
import shutil
import time
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .common import DomainError, now, uid

RETENTION_SEC = 7 * 86400
VISUAL_LIMIT = 2 * 1024**3
CORE_LIMIT = 1024**3


def sanitize(value):
    if isinstance(value, dict):
        return {k: "[redacted]" if k.lower() in {
            "authorization", "cookie", "password", "secret", "access_code", "code_hash"
        } else sanitize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize(v) for v in value]
    if isinstance(value, str):
        for name in ("RANGE_SECRET", "INSTRUCTOR_PIN"):
            secret = os.environ.get(name)
            if secret and len(secret) >= 4:
                value = value.replace(secret, "[redacted]")
        return value
    return value


class ObserverLog:
    def __init__(self, store, path):
        self.store = store
        self.directory = Path(path).parent
        self.reserve_file = Path(str(path) + ".observer-reserve")
        keyfile = Path(str(path) + ".observer-key")
        fd = os.open(keyfile, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, "r+b") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            if os.fstat(f.fileno()).st_mode & 0o077:
                raise RuntimeError("Observer key permissions must be private (0600)")
            if os.fstat(f.fileno()).st_size == 0:
                f.write(AESGCM.generate_key(bit_length=256))
                f.flush()
                os.fsync(f.fileno())
            f.seek(0)
            self.cipher = AESGCM(f.read())
        with store.lock, store.db:
            store.db.execute("""CREATE TABLE IF NOT EXISTS observer_records (
                run_id TEXT NOT NULL, sequence INTEGER NOT NULL, id TEXT NOT NULL,
                kind TEXT NOT NULL, created REAL NOT NULL, size INTEGER NOT NULL,
                sealed TEXT, PRIMARY KEY(run_id,sequence))""")

    def admit(self):
        # One active company: reserve real disk blocks for its core audit, separate
        # from the visual budget. Release those blocks as core records consume them.
        existing = self.reserve_file.stat().st_size if self.reserve_file.exists() else 0
        if shutil.disk_usage(self.directory).free + existing < CORE_LIMIT + VISUAL_LIMIT:
            raise DomainError("Insufficient disk capacity for observer audit and recording", 507)
        with open(self.reserve_file, "ab") as f:
            os.posix_fallocate(f.fileno(), 0, CORE_LIMIT)

    def release(self):
        self.reserve_file.unlink(missing_ok=True)

    def purge(self):
        with self.store.lock, self.store.db:
            self.store.db.execute("DELETE FROM observer_records WHERE created<?", (time.time()-30*86400,))
            self.store.db.execute("UPDATE observer_records SET sealed=NULL,size=0 WHERE created<? AND sealed IS NOT NULL", (time.time()-RETENTION_SEC,))

    def emit(self, r, kind, payload, decision_id=None):
        body = sanitize({"event_id": uid("obs"), "run_id": r["run_id"],
                         "kind": kind, "timestamp_utc": now(),
                         "at_sec": r["virtual_clock_sec"],
                         "decision_id": decision_id, "payload": payload})
        raw = json.dumps(body).encode()
        visual = kind == "capture.chunk"
        if len(raw) > (512 * 1024 if visual else 128 * 1024):
            raise DomainError("Observer record exceeds its size limit", 413)
        nonce = os.urandom(12)
        sealed = base64.b64encode(nonce + self.cipher.encrypt(nonce, raw, r["run_id"].encode())).decode()
        s = self.store
        with s.lock, s.db:
            used = s.db.execute("SELECT COALESCE(SUM(size),0) FROM observer_records WHERE run_id=? AND (kind='capture.chunk')=?", (r["run_id"], visual)).fetchone()[0]
            if used + len(sealed) > (VISUAL_LIMIT if visual else CORE_LIMIT):
                raise DomainError("Visual capture limit reached" if visual else "Observer audit storage limit reached", 507)
            if not visual and self.reserve_file.exists():
                with open(self.reserve_file, "r+b") as reserve:
                    reserve.truncate(max(0, CORE_LIMIT-used-len(sealed)))
            sequence = s.db.execute("SELECT COALESCE(MAX(sequence),0)+1 FROM observer_records WHERE run_id=?", (r["run_id"],)).fetchone()[0]
            s.db.execute("INSERT INTO observer_records VALUES (?,?,?,?,?,?,?)", (r["run_id"], sequence, body["event_id"], kind, time.time(), len(sealed), sealed))
        return {**body, "sequence": sequence}

    def page(self, rid, after=0, limit=100, visual=False):
        limit = min(200, max(1, limit))
        s = self.store
        self.purge()
        with s.lock, s.db:
            rows = s.db.execute("SELECT * FROM observer_records WHERE run_id=? AND sequence>? AND (kind='capture.chunk')=? ORDER BY sequence LIMIT ?", (rid, after, visual, min(200, max(1, limit))+1)).fetchall()
            result = []
            for row in rows[:limit]:
                if row["sealed"] is None:
                    item = {"event_id": row["id"], "kind": row["kind"], "run_id": rid, "payload": {}, "expired": True}
                else:
                    data = base64.b64decode(row["sealed"])
                    item = json.loads(self.cipher.decrypt(data[:12], data[12:], rid.encode()))
                result.append({**item, "sequence": row["sequence"]})
            return {"events": result, "next_cursor": result[-1]["sequence"] if result else after, "has_more": len(rows) > limit}
