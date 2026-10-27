import json
import sqlite3
import threading
from functools import wraps
from pathlib import Path

from .common import DomainError

TABLES = (
    "scenario_versions",
    "agent_decisions",
    "defender_actions",
    "declarations",
    "evidence_links",
    "health_checks",
    "scores",
    "checkpoints",
    "workspace",
    "profiles",
    "cohorts",
    "assignments",
    "scenario_drafts",
    "sessions",
    "assistant_turns",
    "observer_grants",
    "observer_capture",
)


def serialized(method):
    @wraps(method)
    def locked(self, *args, **kwargs):
        with self.lock:
            return method(self, *args, **kwargs)

    return locked


class Store:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.db = sqlite3.connect(str(path), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript(
            "CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY,body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (run_id TEXT NOT NULL,sequence INTEGER NOT NULL,id TEXT UNIQUE NOT NULL,body TEXT NOT NULL,PRIMARY KEY(run_id,sequence));"
        )
        for t in TABLES:
            self.db.execute(
                f"CREATE TABLE IF NOT EXISTS {t} (id TEXT PRIMARY KEY,run_id TEXT NOT NULL,body TEXT NOT NULL)"
            )
        self.db.commit()

    @serialized
    def run(self, rid):
        row = self.db.execute("SELECT body FROM runs WHERE id=?", (rid,)).fetchone()
        if not row:
            raise DomainError("Run not found", 404)
        return json.loads(row[0])

    @serialized
    def save(self, r):
        self.db.execute(
            "INSERT OR REPLACE INTO runs VALUES (?,?)", (r["run_id"], json.dumps(r))
        )
        self.db.commit()

    @serialized
    def runs(self):
        return [
            json.loads(r[0])
            for r in self.db.execute("SELECT body FROM runs ORDER BY rowid DESC")
        ]

    @serialized
    def put(self, table, key, rid, body):
        if table not in TABLES:
            raise ValueError("Unknown table")
        self.db.execute(
            f"INSERT OR REPLACE INTO {table} VALUES (?,?,?)",
            (key, rid, json.dumps(body)),
        )
        self.db.commit()
        return body

    @serialized
    def rows(self, table, rid):
        if table not in TABLES:
            raise ValueError("Unknown table")
        return [
            json.loads(r[0])
            for r in self.db.execute(
                f"SELECT body FROM {table} WHERE run_id=? ORDER BY rowid", (rid,)
            )
        ]

    @serialized
    def get(self, table, key):
        if table not in TABLES:
            raise ValueError("Unknown table")
        r = self.db.execute(f"SELECT body FROM {table} WHERE id=?", (key,)).fetchone()
        return json.loads(r[0]) if r else None

    @serialized
    def append(self, rid, event):
        seq = self.db.execute(
            "SELECT COALESCE(MAX(sequence),0)+1 FROM events WHERE run_id=?", (rid,)
        ).fetchone()[0]
        event = {**event, "sequence": seq}
        self.db.execute(
            "INSERT INTO events VALUES (?,?,?,?)",
            (rid, seq, event["event_id"], json.dumps(event)),
        )
        self.db.commit()
        return event

    @serialized
    def events(self, rid):
        return [
            json.loads(r[0])
            for r in self.db.execute(
                "SELECT body FROM events WHERE run_id=? ORDER BY sequence", (rid,)
            )
        ]
