import { AgentDecisionMeta, AgentRole, AttackerAction, Mode } from "../types/contracts";
import { LogRowView, isTargetRequest } from "./format";

/**
 * Adversary Lens helpers (practice mode only).
 *
 * The lens lets a learner watch the AI opponent work in real time. It is a teaching aid:
 * it shows *what the AI does* (its chosen action and target), never a verdict about what the
 * learner should do, and it never affects scoring. Assessment runs are always Blind.
 */
export type Lens = "coached" | "blind";
export type AiState = "thinking" | "acting" | "stopped" | "paused";

/** Assessment runs are forced Blind so the lens can never act as an oracle in a scored attempt. */
export function effectiveLens(mode: Mode | undefined, pref: Lens): Lens {
  return mode === "assessment" ? "blind" : pref;
}

export function aiStateOf(input: { decisions: AgentDecisionMeta[]; acting: boolean; paused: boolean; finished: boolean }): AiState {
  const last = input.decisions[input.decisions.length - 1];
  if (last?.proposal.action === "stop" || input.finished) return "stopped";
  if (input.paused) return "paused";
  return input.acting ? "acting" : "thinking";
}

export const ROLE_LABEL: Record<AgentRole, string> = {
  scout: "Scout",
  access_operator: "Access operator",
  adaptation_planner: "Adaptation planner",
};

interface MoveInfo {
  /** Very short verb for the node sub-label and step pills. */
  short: string;
  pill: string;
  /** One plain-language sentence about what the AI is doing. */
  say: (d: AgentDecisionMeta) => string;
  /** Why attackers do this. A technique lesson, not advice about the learner's choices. */
  lesson: string;
}

const handle = (d: AgentDecisionMeta) => d.proposal.session_handle ?? "a session";
const target = (d: AgentDecisionMeta) => d.proposal.target_id ?? "protected files";

export const MOVES: Record<AttackerAction, MoveInfo> = {
  inspect_session_status: {
    short: "Inspecting session",
    pill: "Inspect",
    say: (d) => `Checking what ${handle(d)} is allowed to do`,
    lesson: "Attackers first check what a stolen session can do before touching anything.",
  },
  list_accessible_documents: {
    short: "Listing files",
    pill: "List",
    say: (d) => `Listing the documents ${handle(d)} can see`,
    lesson: "Next they map what is reachable. A listing looks like ordinary browsing.",
  },
  test_existing_session: {
    short: "Testing access",
    pill: "Test",
    say: (d) => `Testing whether ${handle(d)} can read ${target(d)}`,
    lesson: "A HEAD request checks access without downloading, which leaves a quieter trail.",
  },
  request_document: {
    short: "Requesting file",
    pill: "Request",
    say: (d) => `Requesting ${target(d)} using ${handle(d)}`,
    lesson: "The theft itself is a normal-looking GET with a valid token. The tell is who is asking.",
  },
  wait: {
    short: "Waiting",
    pill: "Wait",
    say: () => "Waiting and watching for a change",
    lesson: "Patient attackers pause to blend into normal traffic.",
  },
  stop: {
    short: "Stopped",
    pill: "Stop",
    say: (d) => d.proposal.reason || "Stopped: no permitted access path remains",
    lesson: "An adversary stops when every path it knows is closed. It may come back with a new one.",
  },
};

export function describeMove(d: AgentDecisionMeta): { short: string; pill: string; say: string; lesson: string; role: string } {
  const m = MOVES[d.proposal.action];
  const retry = d.role === "adaptation_planner" && d.proposal.action === "test_existing_session";
  return {
    short: retry ? "Retrying access" : m.short,
    pill: retry ? "Retry" : m.pill,
    say: retry ? `Re-testing ${handle(d)} after a defender control` : m.say(d),
    lesson: retry ? "Blocked is not gone: adversaries re-test after every control to see what changed." : m.lesson,
    role: ROLE_LABEL[d.role] ?? d.role,
  };
}

export function provenance(d: AgentDecisionMeta): string {
  return d.model_id.startsWith("sim-") ? "Scripted simulation" : d.model_id;
}

export interface AiFootprint {
  sessions: string[];
  ips: string[];
  rowIds: Set<string>;
  /** Requests attributed to the AI, per source IP. */
  perIp: Map<string, number>;
  requests: number;
}

export const EMPTY_FOOTPRINT: AiFootprint = { sessions: [], ips: [], rowIds: new Set(), perIp: new Map(), requests: 0 };

/**
 * Attribute log rows to the AI using only public facts: the session handle in its decisions plus
 * any source address that session did not first appear with. This is a heuristic until the control
 * plane links adversary events to decisions explicitly (see master-integration contract request 5).
 */
export function aiFootprint(rows: LogRowView[], decisions: AgentDecisionMeta[]): AiFootprint {
  const sessions = [...new Set(decisions.map((d) => d.proposal.session_handle).filter((s): s is string => !!s))];
  if (sessions.length === 0) return EMPTY_FOOTPRINT;
  const baseline = new Map<string, string>();
  for (const r of rows) {
    if (isTargetRequest(r) && r.ip && sessions.includes(r.session) && !baseline.has(r.session)) baseline.set(r.session, r.ip);
  }
  const rowIds = new Set<string>();
  const perIp = new Map<string, number>();
  for (const r of rows) {
    if (!isTargetRequest(r) || !r.ip || !sessions.includes(r.session)) continue;
    if (r.ip === baseline.get(r.session)) continue;
    rowIds.add(r.id);
    perIp.set(r.ip, (perIp.get(r.ip) ?? 0) + 1);
  }
  return { sessions, ips: [...perIp.keys()], rowIds, perIp, requests: rowIds.size };
}
