import { describe, expect, it } from "vitest";
import debrief from "../../../../contracts/mocks/debrief.json";
import eventPage from "../../../../contracts/mocks/event_page.json";
import replay from "../../../../contracts/mocks/replay.json";
import { adaptDebrief, adaptEvents, adaptReplay } from "./contractAdapt";
import { toLogRow } from "./format";

describe("canonical contract adapter", () => {
  it("renders a canonical event page as access-log rows", () => {
    const rows = adaptEvents(eventPage.events as never).map(toLogRow);
    expect(rows.map((r) => `${r.method} ${r.path} ${r.status ?? "-"}`)).toEqual([
      "GET /api/v1/session 200",
      "GET /api/v1/docs 200",
      "GET /api/v1/docs/doc_ops_02 200",
      "GET /api/v1/session 403",
      "GET /api/v1/session 200",
      "GET /api/v1/docs 200",
    ]);
    expect(rows[2].session).toBe("sess_eli");
    expect(rows[4].session).toBe("sess_A");
  });

  it("turns the canonical debrief and replay into the scorecard and the attack map", () => {
    const adapted = adaptReplay(replay as never);
    const score = adaptDebrief(debrief as never, replay.agent_decisions as never);
    expect(score.total_score).toBe(98);
    expect(score.terminal_outcome).toBe("defended_and_recovered");
    expect(score.dimensions.map((d) => d.id)).toContain("effective_containment");
    expect(score.model_provenance.model_id).toBe("qwen3:1.7b-q4_k_m");
    expect(adapted.debrief.total_score).toBe(98);
    const tagged = adapted.events.find((e) => e.agent_meta);
    expect(tagged?.agent_meta?.proposal.session_handle).toBe("sess_A");
    expect(tagged?.agent_meta?.proposal.action).toBe("request_document");
  });
});
