import { describe, expect, it } from "vitest";
import { levelFor, toLogRow, toRows } from "./format";
import { ev } from "../test/fixtures";

describe("toLogRow", () => {
  it("uses the network block when present", () => {
    const r = toLogRow(ev({ seq: 1, ip: "203.0.113.57", method: "HEAD", path: "/api/v1/vault/docs/doc_finance_07", status: 200 }));
    expect(r.method).toBe("HEAD");
    expect(r.ip).toBe("203.0.113.57");
    expect(r.restricted).toBe(true);
    expect(r.latency).toBe("12ms");
  });
  it("derives method, path and status when network is absent and hides missing columns", () => {
    const r = toLogRow(ev({ seq: 2, noNetwork: true, eventType: "session.inspect", outcome: "denied", resource: "sess_A" }));
    expect(r.method).toBe("GET");
    expect(r.path).toBe("/api/v1/session");
    expect(r.status).toBe(403);
    expect(r.ip).toBeNull();
    expect(r.latency).toBeNull();
  });
  it("never exposes prose summary or risk label on the row model", () => {
    const e = ev({ seq: 3 });
    e.summary = "secret teaching note";
    e.risk_label = "high_risk";
    const r = toLogRow(e) as unknown as Record<string, unknown>;
    expect(JSON.stringify(Object.keys(r))).not.toMatch(/summary|risk/);
  });
});

describe("levelFor", () => {
  it("maps outcome facts to levels", () => {
    expect(levelFor("target-access", 200)).toBe("INFO");
    expect(levelFor("target-access", 403)).toBe("WARN");
    expect(levelFor("target-access", 500)).toBe("ERROR");
    expect(levelFor("control-defender", 200)).toBe("NOTICE");
  });
});

describe("toRows", () => {
  it("drops learner-hidden events and sorts by sequence", () => {
    const rows = toRows([ev({ seq: 3 }), ev({ seq: 1 }), ev({ seq: 2, visible: false, source: "red-agent" })]);
    expect(rows.map((r) => r.seq)).toEqual([1, 3]);
  });
});
