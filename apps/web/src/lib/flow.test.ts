import { describe, expect, it } from "vitest";
import { chainPath, connected, deriveFlow, packetChain, routeOf } from "./flow";
import { EMPTY_FOOTPRINT, AiFootprint } from "./adversary";
import { row } from "../test/fixtures";

const PROTECTED = "doc_finance_07";

const base = [
  row({ seq: 1, at: 1, session: "sess_E1", ip: "198.51.100.41", actor: "eli@northstar.test" }),
  row({ seq: 2, at: 2, session: "sess_P1", ip: "198.51.100.77", actor: "priya@northstar.test", path: "/api/v1/session" }),
  row({ seq: 3, at: 3, session: "sess_A", ip: "198.51.100.23", actor: "maya@northstar.test" }),
  row({ seq: 4, at: 4, session: "sess_E1", ip: "198.51.100.41", status: 404, path: "/api/v1/docs/old.xlsx" }),
];

describe("routeOf", () => {
  it("separates restricted, session and doc requests", () => {
    expect(routeOf(row({ seq: 1, path: "/api/v1/vault/docs" }))).toBe("route:/vault");
    expect(routeOf(row({ seq: 1, path: "/api/v1/session" }))).toBe("route:/session");
    expect(routeOf(row({ seq: 1, path: "/api/v1/docs/x.csv" }))).toBe("route:/docs");
  });
});

describe("deriveFlow", () => {
  it("builds the fixed skeleton even with no traffic, and never an AI node when blind", () => {
    const f = deriveFlow({ rows: [], protectedId: PROTECTED, ai: null });
    expect(f.nodes.map((n) => n.id).sort()).toEqual(["asset", "gateway", "refused", "route:/docs", "route:/session", "route:/vault"].sort());
    expect(f.edges).toHaveLength(0);
  });

  it("derives ips, sessions and counts only from emitted requests", () => {
    const f = deriveFlow({ rows: base, protectedId: PROTECTED, ai: null });
    expect(f.nodes.filter((n) => n.kind === "ip")).toHaveLength(3);
    expect(f.nodes.filter((n) => n.kind === "session")).toHaveLength(3);
    expect(f.byId.get("gateway")!.count).toBe(4);
    expect(f.byId.get("refused")!.count).toBe(1);
    const toRefused = f.edges.find((e) => e.id === "gateway>refused")!;
    expect(toRefused.denied).toBe(1);
    expect(toRefused.ok).toBe(0);
  });

  it("never marks anything as AI or suspect when the lens is blind", () => {
    const f = deriveFlow({ rows: base, protectedId: PROTECTED, ai: null });
    expect(f.nodes.some((n) => n.ai)).toBe(false);
    expect(f.edges.some((e) => e.ai)).toBe(false);
    expect(f.byId.has("ai")).toBe(false);
  });

  it("lays out nodes so circles and their labels do not overlap", () => {
    const rows = [
      ...base,
      row({ seq: 5, at: 5, session: "sess_A", ip: "203.0.113.57", actor: "maya@northstar.test" }),
    ];
    const f = deriveFlow({ rows, protectedId: PROTECTED, ai: null });
    for (const kind of ["ip", "session"] as const) {
      const col = f.nodes.filter((n) => n.kind === kind).sort((a, b) => a.y - b.y);
      for (let i = 1; i < col.length; i++) expect(col[i].y - col[i - 1].y).toBeGreaterThanOrEqual(78);
    }
    const right = ["route:/session", "route:/docs", "route:/vault", "refused"].map((id) => f.byId.get(id)!.y);
    for (let i = 1; i < right.length; i++) expect(right[i] - right[i - 1]).toBeGreaterThanOrEqual(78);
  });

  it("adds the AI node, its edge and AI attribution only when a coached footprint is supplied", () => {
    const rows = [
      ...base,
      row({ seq: 5, at: 5, session: "sess_A", ip: "203.0.113.57", actor: "maya@northstar.test", path: "/api/v1/vault/docs/doc_finance_07", resource: PROTECTED }),
    ];
    const fp: AiFootprint = { sessions: ["sess_A"], ips: ["203.0.113.57"], rowIds: new Set([rows[4].id]), perIp: new Map([["203.0.113.57", 1]]), requests: 1 };
    const f = deriveFlow({ rows, protectedId: PROTECTED, ai: fp, aiSub: "planning" });
    expect(f.byId.get("ai")!.count).toBe(1);
    expect(f.edges.find((e) => e.id === "ai>ip:203.0.113.57")).toBeTruthy();
    expect(f.byId.get("ip:203.0.113.57")!.ai).toBe(true);
    expect(f.byId.get("session:sess_A")!.ai).toBe(true);
    expect(f.byId.get("ip:198.51.100.41")!.ai).toBeFalsy();
    expect(f.byId.get("asset")!.count).toBe(1);
  });

  it("shows the AI node with no edges before it has done anything", () => {
    const f = deriveFlow({ rows: base, protectedId: PROTECTED, ai: EMPTY_FOOTPRINT });
    expect(f.byId.has("ai")).toBe(true);
    expect(f.edges.some((e) => e.kind === "ai")).toBe(false);
  });

  it("adds a response node and edge only after a response exists", () => {
    expect(deriveFlow({ rows: base, protectedId: PROTECTED, ai: null }).byId.has("response")).toBe(false);
    const f = deriveFlow({ rows: base, protectedId: PROTECTED, ai: null, response: { label: "session revoked", session: "sess_A" } });
    expect(f.byId.get("response")!.sub).toBe("session revoked");
    expect(f.edges.some((e) => e.id === "response>gateway")).toBe(true);
  });

  it("falls back to an even session layout when the log has no source addresses", () => {
    const rows = base.map((_, i) => row({ seq: i + 1, noNetwork: true, session: ["sess_E1", "sess_P1", "sess_A"][i % 3] }));
    const f = deriveFlow({ rows, protectedId: PROTECTED, ai: null });
    expect(f.hasIps).toBe(false);
    expect(f.nodes.filter((n) => n.kind === "session")).toHaveLength(3);
  });
});

describe("packet routing", () => {
  it("routes a refused request into the Refused sink and an allowed vault read on to the asset", () => {
    const rows = [
      ...base,
      row({ seq: 5, at: 5, session: "sess_A", ip: "198.51.100.23", status: 403, path: "/api/v1/vault/docs/doc_finance_07", resource: PROTECTED }),
      row({ seq: 6, at: 6, session: "sess_A", ip: "198.51.100.23", path: "/api/v1/vault/docs/doc_finance_07", resource: PROTECTED }),
    ];
    const f = deriveFlow({ rows, protectedId: PROTECTED, ai: null });
    expect(packetChain(f, rows[4], null, PROTECTED)).toEqual(["ip:198.51.100.23", "session:sess_A", "gateway", "refused"]);
    const chain = packetChain(f, rows[5], null, PROTECTED);
    expect(chain.slice(-2)).toEqual(["route:/vault", "asset"]);
    expect(chainPath(f, chain)).toMatch(/^M/);
  });

  it("starts an AI request at the AI node only when attributed", () => {
    const rows = [...base, row({ seq: 5, at: 5, session: "sess_A", ip: "203.0.113.57" })];
    const fp: AiFootprint = { sessions: ["sess_A"], ips: ["203.0.113.57"], rowIds: new Set([rows[4].id]), perIp: new Map([["203.0.113.57", 1]]), requests: 1 };
    const f = deriveFlow({ rows, protectedId: PROTECTED, ai: fp });
    expect(packetChain(f, rows[4], fp, PROTECTED)[0]).toBe("ai");
    expect(packetChain(f, rows[4], null, PROTECTED)[0]).toBe("ip:203.0.113.57");
  });
});

describe("connected", () => {
  it("returns every node upstream and downstream of the hovered node", () => {
    const f = deriveFlow({ rows: base, protectedId: PROTECTED, ai: null });
    const c = connected(f, "session:sess_E1");
    expect(c.has("ip:198.51.100.41")).toBe(true);
    expect(c.has("gateway")).toBe(true);
    expect(c.has("refused")).toBe(true);
    expect(c.has("ip:198.51.100.77")).toBe(false);
  });
});
