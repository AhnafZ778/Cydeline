import { describe, expect, it } from "vitest";
import {
  citationProblems,
  clock,
  containmentMeasure,
  releasedEvidence,
  replayRows,
  resolveCitation,
  scoreTimeline,
  title,
  toggleSelection,
} from "./logic";
import type { Event, Replay } from "./types";

const ev = (
  over: Partial<Event> & { event_id: string; sequence: number },
): Event =>
  ({
    run_id: "run_x",
    timestamp_utc: "2026-10-23T00:00:00.000Z",
    visible_at_utc: "2026-10-23T00:00:00.000Z",
    virtual_clock_sec: over.sequence * 10,
    source: "target-access",
    event_type: "document.access",
    actor_id: "maya",
    session_handle: "sess_A",
    resource_id: null,
    outcome: "allowed",
    correlation_id: "corr_" + over.event_id,
    learner_visible: true,
    ...over,
  }) as Event;

const replay = (): Replay =>
  ({
    run_id: "run_x",
    events: [
      ev({ event_id: "evt_1", sequence: 1, target_audit_id: "audit_1" }),
      ev({
        event_id: "evt_agent",
        sequence: 2,
        source: "red-agent",
        event_type: "agent.decision",
        learner_visible: false,
        session_handle: null,
      }),
      ev({
        event_id: "evt_read",
        sequence: 3,
        resource_id: "doc_finance_07",
        decision_id: "decision_1",
      }),
      ev({
        event_id: "evt_decl",
        sequence: 4,
        source: "control-defender",
        event_type: "declaration.submitted",
      }),
      ev({
        event_id: "evt_resp",
        sequence: 5,
        event_type: "session.revoked",
        target_audit_id: "audit_resp",
      }),
      ev({
        event_id: "evt_chk",
        sequence: 6,
        event_type: "verification.check",
        target_audit_id: "audit_chk",
      }),
      ev({
        event_id: "evt_end",
        sequence: 7,
        source: "control-plane",
        event_type: "run.completed",
      }),
    ],
    agent_decisions: [],
    defender_actions: [
      {
        action_id: "act_1",
        action: "revoke_session",
        target_handle: "sess_A",
        target_audit_id: "audit_resp",
        applied_at: "",
        message: "",
        virtual_clock_sec: 50,
      },
    ],
    verification_checks: [
      {
        check_id: "check_1",
        verification: "verify_suspicious_session_denied",
        passed: true,
        target_audit_id: "audit_chk",
        measured_result: {},
      },
      {
        check_id: "check_2",
        verification: "verify_benign_workflow",
        passed: false,
        target_audit_id: "audit_none",
        measured_result: {},
      },
    ],
    debrief: { first_suspicious_event_id: "evt_1" },
    workspace: {},
    trace_hash: "x",
    checkpoints: [],
  }) as unknown as Replay;

describe("assistant evidence selection", () => {
  it("offers only released target evidence", () => {
    const ids = releasedEvidence(replay().events).map((e) => e.event_id);
    expect(ids).toEqual(
      ["evt_1", "evt_read", "evt_resp", "evt_chk"].filter((i) =>
        ids.includes(i),
      ),
    );
    expect(ids).not.toContain("evt_agent");
    expect(ids).not.toContain("evt_end");
    expect(ids).not.toContain("evt_decl");
  });
  it("toggles, de-duplicates and caps the selection", () => {
    expect(toggleSelection(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleSelection(["a", "b"], "a")).toEqual(["b"]);
    const full = Array.from({ length: 12 }, (_, i) => "e" + i);
    expect(toggleSelection(full, "extra")).toBe(full);
  });
  it("flags claims that cite nothing or cite evidence the learner did not select", () => {
    const turn = (claims: { text: string; evidence_ids: string[] }[]) => ({
      analysis: { claims, next_question: "?" },
      evidence_ids: ["evt_1", "evt_read"],
    });
    expect(
      citationProblems(turn([{ text: "ok", evidence_ids: ["evt_1"] }])),
    ).toEqual([]);
    expect(
      citationProblems(turn([{ text: "no cite", evidence_ids: [] }])),
    ).toHaveLength(1);
    const outside = citationProblems(
      turn([{ text: "x", evidence_ids: ["evt_1", "evt_other"] }]),
    );
    expect(outside).toEqual([
      "Claim 1 cites evt_other, which was not selected.",
    ]);
  });
  it("accepts exact report and reference excerpts while rejecting invented quotations", () => {
    const turn = { evidence_ids: [], context_sources: {"report:observation": {text:"A new source needs corroboration."}}, analysis: {
      claims: [{text:"Recorded excerpt",evidence_ids:[],supports:[{source_id:"report:observation",field:"text",quote:"needs corroboration"}]}],next_question:"?",
    }};
    expect(citationProblems(turn)).toEqual([]);
    turn.analysis.claims[0].supports[0].quote="Invented verdict";
    expect(citationProblems(turn)).toHaveLength(1);
  });
});

describe("replay rows and citations", () => {
  it("keeps model-only events so every replay event can be inspected", () => {
    const rows = replayRows(replay().events);
    expect(rows.map((r) => r.id)).toContain("evt_agent");
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("resolves event, response and check citations to an inspectable event", () => {
    const r = replay();
    expect(resolveCitation("evt_read", r)).toMatchObject({
      kind: "event",
      eventId: "evt_read",
    });
    expect(resolveCitation("act_1", r)).toMatchObject({
      kind: "response",
      eventId: "evt_resp",
      label: "Response · Revoke Session on sess_A",
    });
    expect(resolveCitation("check_1", r)).toMatchObject({
      kind: "check",
      eventId: "evt_chk",
    });
    expect(resolveCitation("check_1", r).label).toContain("passed");
  });
  it("never invents a link: unknown ids and unlinked checks stay unlinked", () => {
    const r = replay();
    expect(resolveCitation("check_2", r)).toMatchObject({
      kind: "check",
      eventId: null,
    });
    expect(resolveCitation("check_2", r).label).toContain("not recovered");
    expect(resolveCitation("evt_forged", r)).toMatchObject({
      kind: "missing",
      eventId: null,
    });
  });
});

describe("measured score visuals", () => {
  it("builds the timeline from recorded events only, in order", () => {
    const { markers, span } = scoreTimeline(replay());
    expect(markers.map((m) => m.key)).toEqual([
      "signal",
      "read",
      "declare",
      "act0",
      "end",
    ]);
    expect(markers.map((m) => m.at)).toEqual([10, 30, 40, 50, 70]);
    expect(markers.find((m) => m.key === "read")?.tone).toBe("bad");
    expect(span).toBe(70);
  });
  it("reports containment against the published target without inventing a value", () => {
    expect(
      containmentMeasure({
        containment_time_delta_sec: 40,
        containment_target_sec: 30,
      }),
    ).toMatchObject({ within: false, delta: 40, target: 30 });
    expect(
      containmentMeasure({
        containment_time_delta_sec: 12,
        containment_target_sec: 30,
      })?.within,
    ).toBe(true);
    expect(
      containmentMeasure({
        containment_time_delta_sec: null,
        containment_target_sec: 30,
      }),
    ).toBeNull();
    expect(containmentMeasure({ containment_time_delta_sec: 5 })).toBeNull();
  });
  it("formats time and labels", () => {
    expect(clock(75)).toBe("01:15");
    expect(title("contained_but_disrupted")).toBe("Contained But Disrupted");
  });
});
