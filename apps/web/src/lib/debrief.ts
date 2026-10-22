import { DebriefResponse, EventEnvelope, RunStatusSnapshot } from "../types/contracts";
import { LogRowView, hms, toLogRow } from "./format";

export interface TimelineItem {
  ms: number;
  time: string;
  headline: string;
  sub: string;
  tone: "" | "is-you" | "is-ok" | "is-bad" | "is-you is-ok";
}

export function logLine(r: LogRowView): string {
  return [r.time, r.level, r.method, r.path, r.status ?? "-", r.session, r.user, r.ip ?? "", r.rid].filter((x) => x !== "").join("  ");
}

/** Build "what you did" from the final snapshot and the full-fidelity replay. */
export function buildTimeline(snapshot: RunStatusSnapshot | null, events: EventEnvelope[], debrief: DebriefResponse): TimelineItem[] {
  const items: TimelineItem[] = [];
  const byId = new Map(events.map((e) => [e.event_id, e]));
  const add = (iso: string | number, headline: string, sub: string, tone: TimelineItem["tone"]) => {
    const ms = typeof iso === "number" ? iso : Date.parse(iso);
    items.push({ ms, time: hms(ms, false), headline, sub, tone });
  };

  const first = debrief.first_suspicious_event_id ? byId.get(debrief.first_suspicious_event_id) : undefined;
  if (first) {
    const r = toLogRow(first);
    add(first.timestamp_utc, `First request from ${r.ip ?? "a new source"} on ${r.session}`, "The line that gave it away", "");
  }

  const decl = snapshot?.declaration;
  if (decl) {
    add(
      decl.created_at_utc,
      `You declared ${decl.suspected_session}`,
      `${decl.evidence_event_ids.length} evidence line${decl.evidence_event_ids.length === 1 ? "" : "s"} cited`,
      "is-you"
    );
  }

  for (const a of snapshot?.applied_actions ?? []) {
    if (a.result === "rejected") continue;
    add(a.applied_at_utc, `You applied ${a.action.replace(/_/g, " ")}`, "Confirmed by the server", "is-you is-ok");
  }

  const containAt = (snapshot?.applied_actions ?? []).find((a) => a.result !== "rejected" && a.action !== "restore_account");
  if (containAt && decl) {
    const after = events.find(
      (e) => e.session_handle === decl.suspected_session && e.outcome === "denied" && e.source === "target-access" && Date.parse(e.timestamp_utc) >= Date.parse(containAt.applied_at_utc)
    );
    if (after) add(after.timestamp_utc, `${decl.suspected_session} request refused`, "The block took effect", "is-ok");
  }

  const stop = events.find((e) => e.event_type === "agent.stop");
  if (stop) add(stop.timestamp_utc, "The AI adversary stopped", "Revealed in the replay", "is-ok");

  const ver = snapshot?.verification;
  if (ver) {
    const at = Date.parse(ver.benign_workflow.checked_at_utc);
    add(
      at,
      ver.both_passed ? "Both verification checks passed" : "Verification found a problem",
      ver.both_passed ? "Intruder denied, legitimate work running" : [!ver.suspicious_denied.passed && "intruder still active", !ver.benign_workflow.passed && "legitimate work blocked"].filter(Boolean).join(", "),
      ver.both_passed ? "is-ok" : "is-bad"
    );
  }

  return items.sort((a, b) => a.ms - b.ms);
}

export const DOT_ROWS = [
  { id: "inspect_session_status", label: "Probe the session" },
  { id: "list_accessible_documents", label: "Map the vault" },
  { id: "test_existing_session", label: "Test access" },
  { id: "request_document", label: "Read the document" },
  { id: "stop", label: "Stand down" },
] as const;

export interface DotCell {
  state: "" | "on" | "on-deny";
}

/** One dot per AI decision, laid out by action type. */
export function buildDotMatrix(events: EventEnvelope[]): { label: string; cells: DotCell[] }[] {
  const decisions = events.filter((e) => e.agent_meta).sort((a, b) => (a.agent_meta!.step ?? 0) - (b.agent_meta!.step ?? 0));
  const n = Math.max(6, decisions.length);
  return DOT_ROWS.map((row) => ({
    label: row.label,
    cells: Array.from({ length: n }, (_, i) => {
      const d = decisions[i];
      if (!d || d.agent_meta!.proposal.action !== row.id) return { state: "" as const };
      return { state: d.outcome === "denied" ? ("on-deny" as const) : ("on" as const) };
    }),
  }));
}

export const DIM_CONCEPT: Record<string, string> = {
  recognition_evidence: "hijack",
  effective_containment: "blast",
  recovery_verification: "verify",
  business_continuity: "blast",
  proportionality: "blast",
  timeliness: "logline",
};
