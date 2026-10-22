import { describe, expect, it } from "vitest";
import { ctaFor, objectiveStates, selectPhase, stepIndex } from "./phase";
import type { RunStatusSnapshot } from "../types/contracts";

const snap = (p: Partial<RunStatusSnapshot> = {}): RunStatusSnapshot =>
  ({
    run_id: "run_1",
    state: "running",
    sess_a_revoked: false,
    declaration: null,
    verification: null,
    applied_actions: [],
    ...p,
  }) as unknown as RunStatusSnapshot;

describe("selectPhase", () => {
  it("walks observe -> investigate -> declare -> contain -> verify -> done from server facts", () => {
    expect(selectPhase({ snapshot: snap(), pinnedCount: 0, inspected: false, drawer: null })).toBe("observe");
    expect(selectPhase({ snapshot: snap(), pinnedCount: 0, inspected: true, drawer: null })).toBe("investigate");
    expect(selectPhase({ snapshot: snap(), pinnedCount: 2, inspected: true, drawer: "declare" })).toBe("declare");
    expect(selectPhase({ snapshot: snap({ declaration: {} as never }), pinnedCount: 2, inspected: true, drawer: null })).toBe("contain");
    expect(selectPhase({ snapshot: snap({ declaration: {} as never, sess_a_revoked: true }), pinnedCount: 2, inspected: true, drawer: null })).toBe("verify");
    expect(
      selectPhase({ snapshot: snap({ sess_a_revoked: true, verification: { both_passed: true } as never }), pinnedCount: 2, inspected: true, drawer: null })
    ).toBe("done");
  });
  it("maps phases to stepper indices", () => {
    expect(stepIndex("observe")).toBe(0);
    expect(stepIndex("verify")).toBe(4);
    expect(stepIndex("done")).toBe(5);
  });
});

describe("ctaFor", () => {
  it("offers exactly one action per phase with a reason when disabled", () => {
    const a = ctaFor("investigate", { selectedId: null, selectedPinned: false, pinnedCount: 0 });
    expect(a.enabled).toBe(false);
    expect(a.reason).toBeTruthy();
    expect(ctaFor("investigate", { selectedId: "e1", selectedPinned: false, pinnedCount: 0 })).toMatchObject({ label: "Pin evidence", enabled: true });
    expect(ctaFor("investigate", { selectedId: null, selectedPinned: false, pinnedCount: 2 })).toMatchObject({ label: "Declare incident", enabled: true });
    expect(ctaFor("contain", { selectedId: null, selectedPinned: false, pinnedCount: 2 }).label).toBe("Choose response");
    expect(ctaFor("verify", { selectedId: null, selectedPinned: false, pinnedCount: 2 }).label).toBe("Run both checks");
    expect(ctaFor("done", { selectedId: null, selectedPinned: false, pinnedCount: 2 }).label).toBe("See debrief");
  });
});

describe("objectiveStates", () => {
  it("ticks objectives as the learner progresses", () => {
    const o = objectiveStates({ snapshot: snap(), pinnedCount: 2, inspected: true });
    expect(o.map((x) => x.done)).toEqual([true, true, false, false, false]);
  });
});
