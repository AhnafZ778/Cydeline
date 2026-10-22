import { describe, expect, it } from "vitest";
import { AgentDecisionMeta } from "../types/contracts";
import { aiFootprint, aiStateOf, describeMove, effectiveLens } from "./adversary";
import { row } from "../test/fixtures";

function decision(step: number, action: AgentDecisionMeta["proposal"]["action"], role: AgentDecisionMeta["role"] = "scout"): AgentDecisionMeta {
  return {
    step,
    role,
    model_id: "sim-scripted-v1",
    quantization: "n/a",
    latency_ms: 0,
    fallback_used: false,
    accepted: true,
    proposal: { role, action, target_id: "doc_finance_07", session_handle: "sess_A", reason: "reason" },
  };
}

describe("effectiveLens", () => {
  it("forces Blind in assessment mode regardless of preference", () => {
    expect(effectiveLens("assessment", "coached")).toBe("blind");
    expect(effectiveLens("practice", "coached")).toBe("coached");
    expect(effectiveLens("practice", "blind")).toBe("blind");
    expect(effectiveLens(undefined, "coached")).toBe("coached");
  });
});

describe("aiStateOf", () => {
  const d = [decision(1, "inspect_session_status")];
  it("derives thinking, acting, paused and stopped", () => {
    expect(aiStateOf({ decisions: [], acting: false, paused: false, finished: false })).toBe("thinking");
    expect(aiStateOf({ decisions: d, acting: true, paused: false, finished: false })).toBe("acting");
    expect(aiStateOf({ decisions: d, acting: true, paused: true, finished: false })).toBe("paused");
    expect(aiStateOf({ decisions: [...d, decision(2, "stop")], acting: true, paused: false, finished: false })).toBe("stopped");
    expect(aiStateOf({ decisions: d, acting: false, paused: false, finished: true })).toBe("stopped");
  });
});

describe("describeMove", () => {
  it("narrates in plain language and labels post-control re-tests as retries", () => {
    expect(describeMove(decision(1, "list_accessible_documents")).say).toContain("sess_A");
    expect(describeMove(decision(2, "request_document", "access_operator")).pill).toBe("Request");
    const retry = describeMove(decision(3, "test_existing_session", "adaptation_planner"));
    expect(retry.pill).toBe("Retry");
    expect(retry.role).toBe("Adaptation planner");
  });
});

describe("aiFootprint", () => {
  const rows = [
    row({ seq: 1, session: "sess_A", ip: "198.51.100.23" }),
    row({ seq: 2, session: "sess_E1", ip: "198.51.100.41" }),
    row({ seq: 3, session: "sess_A", ip: "203.0.113.57" }),
    row({ seq: 4, session: "sess_A", ip: "198.51.100.23" }),
    row({ seq: 5, session: "sess_A", ip: "203.0.113.57", source: "control-defender" }),
  ];
  it("is empty until the AI has made a decision", () => {
    expect(aiFootprint(rows, []).requests).toBe(0);
  });
  it("attributes only requests from a source the session did not first appear with", () => {
    const fp = aiFootprint(rows, [decision(1, "inspect_session_status")]);
    expect(fp.sessions).toEqual(["sess_A"]);
    expect(fp.ips).toEqual(["203.0.113.57"]);
    expect(fp.requests).toBe(1);
    expect(fp.rowIds.has(rows[2].id)).toBe(true);
    expect(fp.rowIds.has(rows[0].id)).toBe(false);
    expect(fp.rowIds.has(rows[3].id)).toBe(false);
  });
});
