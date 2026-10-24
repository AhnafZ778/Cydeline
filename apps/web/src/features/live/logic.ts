import { toLogRow, type LogRowView } from "../../lib/format";
import type { AssistantClaim, AssistantTurn, Event, Replay } from "./types";

export const title = (v: string) =>
  v.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const clock = (sec: number) =>
  Math.floor(sec / 60)
    .toString()
    .padStart(2, "0") +
  ":" +
  Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");

/** The assistant may only explain released target evidence, never control or model events. */
export const releasedEvidence = (events: Event[]): Event[] =>
  events.filter((e) => e.source === "target-access");

export const MAX_ASSISTANT_EVIDENCE = 12;

export function toggleSelection(
  selected: string[],
  id: string,
  max = MAX_ASSISTANT_EVIDENCE,
): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  return selected.length >= max ? selected : [...selected, id];
}

/**
 * Every claim must cite evidence from the learner's own selection. The server enforces this
 * too; the client refuses to show anything that fails so a bad answer is never rendered as fact.
 */
export function citationProblems(
  turn: Pick<AssistantTurn, "analysis" | "evidence_ids" | "context_sources">,
): string[] {
  const allowed = new Set(turn.evidence_ids);
  const problems: string[] = [];
  turn.analysis.claims.forEach((c: AssistantClaim, i: number) => {
    if (!c.evidence_ids.length && !c.supports?.length)
      problems.push(`Claim ${i + 1} cites no evidence.`);
    for (const cite of c.supports ?? []) {
      const value = turn.context_sources?.[cite.source_id]?.[cite.field];
      const excerpt = cite.source_id.startsWith("report:") || cite.source_id.startsWith("reference:");
      if (value === undefined || !cite.quote || (excerpt ? !String(value).includes(cite.quote) : String(value) !== cite.quote))
        problems.push(`Claim ${i + 1} has an unsupported quotation.`);
      if (!excerpt && !allowed.has(cite.source_id))
        problems.push(`Claim ${i + 1} cites an unselected source.`);
    }
    for (const id of c.evidence_ids)
      if (!allowed.has(id))
        problems.push(`Claim ${i + 1} cites ${id}, which was not selected.`);
  });
  return problems;
}

export const REVIEW_LABEL: Record<AssistantTurn["review_status"], string> = {
  unreviewed: "Unverified · review before relying on it",
  corroborated: "Corroborated by you",
  disputed: "Disputed by you",
  needs_more_evidence: "Needs more evidence",
};

/** Replay shows every recorded event, including model-only ones that were never learner-visible. */
export function replayRows(events: Event[]): LogRowView[] {
  return events
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((e) => toLogRow(e));
}

export type Citation = {
  id: string;
  kind: "event" | "response" | "check" | "missing";
  label: string;
  /** Event the inspector should open, when the record has one. */
  eventId: string | null;
};

const eventByAudit = (events: Event[], audit: string | undefined) =>
  audit ? events.find((e) => e.target_audit_id === audit) : undefined;

export function resolveCitation(id: string, replay: Replay): Citation {
  const event = replay.events.find((e) => e.event_id === id);
  if (event)
    return {
      id,
      kind: "event",
      label: `${clock(event.virtual_clock_sec)} · ${title(event.event_type)}`,
      eventId: id,
    };
  const action = replay.defender_actions.find((a) => a.action_id === id);
  if (action) {
    const linked = eventByAudit(replay.events, action.target_audit_id);
    return {
      id,
      kind: "response",
      label: `Response · ${title(action.action)} on ${action.target_handle}`,
      eventId: linked?.event_id ?? null,
    };
  }
  const check = (replay.verification_checks ?? []).find(
    (c) => c.check_id === id,
  );
  if (check) {
    const linked = eventByAudit(replay.events, check.target_audit_id);
    return {
      id,
      kind: "check",
      label: `${check.verification === "verify_suspicious_session_denied" ? "Suspicious access" : "Employee work"} check · ${check.passed ? "passed" : "not recovered"}`,
      eventId: linked?.event_id ?? null,
    };
  }
  return {
    id,
    kind: "missing",
    label: "Record not available in this replay",
    eventId: null,
  };
}

export type Marker = {
  key: string;
  label: string;
  at: number;
  tone: "signal" | "declare" | "respond" | "bad" | "end";
};

/** Moments measured from the recorded shift, never estimated. */
export function scoreTimeline(replay: Replay): {
  markers: Marker[];
  span: number;
} {
  const markers: Marker[] = [];
  const first = replay.events.find(
    (e) => e.event_id === replay.debrief.first_suspicious_event_id,
  );
  if (first)
    markers.push({
      key: "signal",
      label: "First suspicious activity released",
      at: first.virtual_clock_sec,
      tone: "signal",
    });
  const declared = replay.events.find(
    (e) => e.event_type === "declaration.submitted",
  );
  if (declared)
    markers.push({
      key: "declare",
      label: "Incident declared",
      at: declared.virtual_clock_sec,
      tone: "declare",
    });
  replay.defender_actions.forEach((a, i) =>
    markers.push({
      key: "act" + i,
      label: `${title(a.action)} · ${a.target_handle}`,
      at: a.virtual_clock_sec,
      tone: "respond",
    }),
  );
  const read = replay.events.find(
    (e) =>
      e.event_type === "document.access" &&
      e.resource_id === (replay.objective_resource ?? "doc_finance_07") &&
      e.outcome === "allowed" &&
      !!e.decision_id,
  );
  if (read)
    markers.push({
      key: "read",
      label: "Protected document read",
      at: read.virtual_clock_sec,
      tone: "bad",
    });
  const end = replay.events.find((e) => e.event_type === "run.completed");
  if (end)
    markers.push({
      key: "end",
      label: "Shift ended",
      at: end.virtual_clock_sec,
      tone: "end",
    });
  markers.sort((a, b) => a.at - b.at);
  return { markers, span: Math.max(1, ...markers.map((m) => m.at)) };
}

export function containmentMeasure(score: {
  containment_time_delta_sec?: number | null;
  containment_target_sec?: number | null;
}) {
  const delta = score.containment_time_delta_sec;
  const target = score.containment_target_sec;
  if (delta == null || !target) return null;
  return {
    delta,
    target,
    within: delta <= target,
    ratio: Math.min(1, delta / (target * 4)),
  };
}
