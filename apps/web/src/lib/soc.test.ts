import { describe, expect, it } from "vitest";
import { PLAYBOOKS } from "../content/console/playbooks";
import { KEYS } from "../content/console/keys";
import { gradeAlert } from "./consoleGrade";
import { defang } from "./defang";
import { parseHash, practiceHref, extHref } from "./route";
import { channelIds, closeAlert, createCase, localDay, pointsOf, retryAlert, returnInvestigation, seed, takeAlert, type SeedAlert } from "./socLogic";

const alerts: SeedAlert[] = [
  ...Array.from({ length: 14 }, (_, index) => ({ id: `A${index}`, role: "analyst" as const })),
  { id: "closed-1", role: "analyst", startsClosed: true },
  { id: "ir-1", role: "responder" },
];

describe("practice console", () => {
  it("defangs pasted indicators", () => {
    expect(defang("hxxps://evil[.]example")).toBe("https://evil.example");
  });

  it("parses practice and scanner hashes", () => {
    expect(parseHash("#/practice/cases/NS-4412")).toEqual({ kind: "practice", page: "cases", caseId: "NS-4412" });
    expect(parseHash(extHref("ipcheck", "198.51.100.77"))).toEqual({ kind: "ext", site: "ipcheck", query: "198.51.100.77" });
    const scanned = parseHash(extHref("multiscan", "http://northstar-perks.example/claim"));
    expect(scanned).toMatchObject({ kind: "ext", query: "http://northstar-perks.example/claim" });
    expect(parseHash("")).toEqual({ kind: "mission" });
    expect(practiceHref("email")).toBe("#/practice/email");
  });

  it("keeps ten alerts on the main channel and refills after ownership", () => {
    const start = seed(alerts);
    expect(start.mainOrder).toHaveLength(10);
    expect(start.pool).toHaveLength(4);
    const next = takeAlert(start, "A0");
    expect(next.channel.A0).toBe("investigation");
    expect(next.mainOrder).toHaveLength(10);
    expect(next.mainOrder).toContain("A10");
    expect(next.mainOrder).not.toContain("A0");
    const visible = channelIds(next, "main", "analyst", alerts);
    expect(visible).toHaveLength(10);
    expect(channelIds(next, "main", "responder", alerts)).toContain("ir-1");
  });

  it("returns every investigation alert to the main channel", () => {
    const taken = takeAlert(takeAlert(seed(alerts), "A0"), "A1");
    const cased = createCase(taken, "A0", "2026-10-22T00:00:00.000Z");
    const back = returnInvestigation(cased, alerts);
    expect(back.investigation).toEqual([]);
    expect(back.channel.A0).toBe("main");
    expect(back.channel.A1).toBe("main");
    expect(back.cases.A0).toBeUndefined();
    expect(back.mainOrder).toEqual(seed(alerts).mainOrder);
    expect(back.pool).toEqual(seed(alerts).pool);
  });

  it("grades only at close and can be wrong", () => {
    let state = createCase(takeAlert(seed(alerts), "A0"), "A0", "2026-10-22T00:00:00.000Z");
    const grade = gradeAlert({
      steps: PLAYBOOKS.phish,
      answers: { attachments: "Yes", analyze: "Malicious", delivered: "Delivered" },
      verdict: "true_positive",
      contained: ["ws-priya"],
      deleted: ["mail-voucher"],
      hostId: "ws-priya",
      key: KEYS["NS-4412"],
    });
    expect(grade.perfect).toBe(true);
    expect(grade.points).toBe(30);
    state = closeAlert(state, "A0", "true_positive", "note", grade, "2026-10-22");
    expect(state.channel.A0).toBe("closed");
    expect(state.pendingStreak).toBe(true);
    expect(state.pendingConfetti).toBe(true);
    expect(pointsOf(state)).toBe(30);
    const again = closeAlert(state, "A0", "true_positive", "note", grade, "2026-10-22");
    expect(again).toBe(state);
  });

  it("hides the delivered branch when the mail was not delivered", () => {
    const missed = gradeAlert({
      steps: PLAYBOOKS.phish,
      answers: { attachments: "No", analyze: "Non-malicious", delivered: "Delivered" },
      verdict: "false_positive",
      contained: [],
      deleted: [],
      hostId: "ws-priya",
      key: KEYS["NS-4412"],
    });
    expect(missed.perfect).toBe(false);
    expect(missed.lines.some((line) => line.id === "delete")).toBe(true);
    expect(localDay(new Date("2026-10-22T12:00:00Z"))).toMatch(/2026-10-2/);
  });

  it("returns a retried alert to the main channel without growing past ten", () => {
    const start = seed(alerts);
    const full = { ...start, channel: { ...start.channel, A0: "closed" as const }, closedOrder: ["A0"], mainOrder: start.mainOrder.filter((id) => id !== "A0").concat("A10"), pool: start.pool.slice(1) };
    const retried = retryAlert(full, "A0", "analyst");
    expect(retried.channel.A0).toBe("main");
    expect(retried.mainOrder).toHaveLength(10);
    expect(retried.mainOrder[0]).toBe("A0");
    expect(retried.pool[0]).toBe(full.mainOrder[9]);
  });
});
