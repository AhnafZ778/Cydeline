import { describe, expect, it } from "vitest";
import { applyPivot, groupBySession, matchRow, parseTerm } from "./query";
import { row } from "../test/fixtures";

describe("parseTerm", () => {
  it("parses key:value with aliases", () => {
    expect(parseTerm("sess:sess_A")).toEqual({ key: "session", value: "sess_A", negate: false });
    expect(parseTerm("status:4xx")).toEqual({ key: "status", value: "4xx", negate: false });
  });
  it("supports negation and free text", () => {
    expect(parseTerm("-user:eli")).toEqual({ key: "user", value: "eli", negate: true });
    expect(parseTerm("vault")).toEqual({ key: null, value: "vault", negate: false });
  });
  it("treats unknown keys as free text and ignores blanks", () => {
    expect(parseTerm("colour:red")).toEqual({ key: null, value: "colour:red", negate: false });
    expect(parseTerm("   ")).toBeNull();
  });
});

describe("matchRow", () => {
  const ok = row({ seq: 1, session: "sess_A", actor: "maya@northstar.test", ip: "203.0.113.57", path: "/api/v1/vault/docs/doc_finance_07" });
  const denied = row({ seq: 2, status: 403 });
  it("matches wildcards and status classes", () => {
    expect(matchRow(ok, [parseTerm("path:/api/v1/vault*")!])).toBe(true);
    expect(matchRow(denied, [parseTerm("status:4xx")!])).toBe(true);
    expect(matchRow(ok, [parseTerm("status:4xx")!])).toBe(false);
    expect(matchRow(denied, [parseTerm("status:>=400")!])).toBe(true);
  });
  it("ANDs terms and honours negation", () => {
    expect(matchRow(ok, [parseTerm("session:sess_A")!, parseTerm("ip:203.0.113.*")!])).toBe(true);
    expect(matchRow(ok, [parseTerm("-user:maya")!])).toBe(false);
  });
});

describe("pivots", () => {
  const rows = [
    row({ seq: 1, session: "sess_A", ip: "198.51.100.23", actor: "maya@northstar.test" }),
    row({ seq: 2, session: "sess_A", ip: "203.0.113.57", actor: "maya@northstar.test", path: "/api/v1/vault/docs" }),
    row({ seq: 3, session: "sess_E1", status: 404 }),
  ];
  it("filters denied and restricted", () => {
    expect(applyPivot(rows, "denied").map((r) => r.seq)).toEqual([3]);
    expect(applyPivot(rows, "restricted").map((r) => r.seq)).toEqual([2]);
  });
  it("groups by session and counts distinct source IPs as a fact", () => {
    const g = groupBySession(rows);
    expect(g.map((x) => x.session)).toEqual(["sess_A", "sess_E1"]);
    expect(g[0].distinctIps).toEqual(["198.51.100.23", "203.0.113.57"]);
    expect(g[1].distinctIps).toHaveLength(1);
  });
});
