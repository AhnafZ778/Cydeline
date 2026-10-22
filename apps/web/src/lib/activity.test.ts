import { describe, expect, it } from "vitest";
import { bucketActivity, computeKpis } from "./activity";
import { T0, row } from "../test/fixtures";

describe("bucketActivity", () => {
  it("counts allowed and refused requests per bucket and ignores control lines", () => {
    const rows = [
      row({ seq: 1, at: 1 }),
      row({ seq: 2, at: 5, status: 403 }),
      row({ seq: 3, at: 20 }),
      row({ seq: 4, at: 21, source: "control-defender" }),
    ];
    const b = bucketActivity(rows, T0 + 25_000, 15, 4);
    expect(b).toHaveLength(4);
    expect(b.reduce((n, x) => n + x.ok, 0)).toBe(2);
    expect(b.reduce((n, x) => n + x.denied, 0)).toBe(1);
  });
});

describe("computeKpis", () => {
  it("reports request rate, refused count, sessions and vault requests with a delta", () => {
    const rows = [
      row({ seq: 1, at: 10, session: "sess_A" }),
      row({ seq: 2, at: 20, session: "sess_E1", status: 404 }),
      row({ seq: 3, at: 30, session: "sess_A", path: "/api/v1/vault/docs" }),
    ];
    const k = computeKpis(rows, T0 + 40_000);
    expect(k.reqPerMin.value).toBe(3);
    expect(k.denied5m.value).toBe(1);
    expect(k.activeSessions.value).toBe(2);
    expect(k.vault.value).toBe(1);
    expect(k.reqPerMin.ticks).toHaveLength(12);
  });
});
