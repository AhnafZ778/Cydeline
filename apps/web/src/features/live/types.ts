export type Artifact = {
  type: "IP Address" | "URL" | "Domain" | "Access Handle" | "Other";
  value: string;
  event_ids: string[];
};
export type IncidentCase = {
  id: string;
  title: string;
  opened?: boolean;
  revision: number;
  owner: string | null;
  role: string;
  status: string;
  created_at?: string;
  alert_ids: string[];
  artifacts: Artifact[];
  note: string;
  scope: string;
  report: string;
  submitted_report?: { text: string; submitted_at: string; event_ids: string[] };
  submission_valid?: boolean;
  playbook_started: boolean;
  completed_steps: string[];
  notes: { from: string; hypothesis: string; next_step: string; at: string }[];
};
import type { EventEnvelope } from "../../types/contracts";
export type Event = EventEnvelope & {
  decision_id?: string;
  target_audit_id?: string;
  parent_event_id?: string;
};
export type Scenario = {
  scenario_id: string;
  version: string;
  title: string;
  summary: string;
  duration_sec: number;
  difficulty: string;
  family: string;
  tools: string[];
  skills: string[];
  briefing?: Briefing;
  variants?: VariantInfo[];
};
export type Alert = {
  id: string;
  title: string;
  severity: string;
  status: string;
  session_handle: string;
  event_ids: string[];
  created_sec: number;
  sla_sec: number;
  verdict: string | null;
  revision?: number;
  owner?: string | null;
  owner_id?: string | null;
  case_id?: string;
  closure_comment?: string;
  closed_at?: string;
  created_at?: string;
};
export type Workspace = {
  worksheet?: WorksheetRecord;
  revision: number;
  note: string;
  hypothesis: string;
  hypothesis_status: string;
  evidence_ids: string[];
  timeline: { event_id: string; note: string }[];
  saved_queries: { name: string; query: string }[];
  alerts: Alert[];
  cases: IncidentCase[];
  messages: {
    id: string;
    kind: string;
    from: string;
    text: string;
    at_sec: number;
  }[];
  hints_used: (number | string)[];
};
export type Receipt = {
  action_id: string;
  action: string;
  target_handle: string;
  target_audit_id: string;
  applied_at: string;
  message: string;
  virtual_clock_sec: number;
};
export type Check = {
  check_id: string;
  verification: string;
  passed: boolean;
  target_audit_id: string;
  measured_result: Record<string, unknown>;
};
export type Snapshot = {
  run_id: string;
  scenario_id: string;
  scenario_version: string;
  scenario: Scenario;
  mode: "practice" | "assessment";
  assistance: string;
  state: string;
  outcome: string | null;
  paused: boolean;
  awaiting_begin?: boolean;
  variant?: VariantInfo | null;
  ai_unavailable?: boolean;
  virtual_clock_sec: number;
  remaining_sec: number;
  workspace: Workspace;
  business: {
    workflow_id: string;
    user_id: string;
    passed: boolean;
    http_status: number;
  }[];
  disrupted_seconds: number;
  state_revision: number;
  last_sequence: number;
  model_status: string;
  last_ai_decision?: EventEnvelope["agent_meta"] | null;
  declaration: {
    declaration_id: string;
    suspected_session: string;
    suspected_actor: string;
    event_ids: string[];
    rationale: string;
  } | null;
  verification: { checks: Check[]; all_passed: boolean } | null;
  applied_actions: Receipt[];
  branch_from?: { run_id: string; checkpoint_id: string } | null;
};
export type Score = {
  run_id: string;
  outcome: string;
  score_total: number;
  breakdown: {
    dimension: string;
    awarded: number;
    max_points: number;
    explanation: string;
    evidence_ids: string[];
  }[];
  fallback_used: boolean;
  notes: string[];
  model_provenance: {
    model_id: string;
    total_decisions: number;
    fallback_count: number;
    median_latency_ms: number;
  };
  disrupted_seconds: number;
  containment_time_delta_sec?: number | null;
  containment_target_sec?: number | null;
  first_suspicious_event_id?: string | null;
};
export type Replay = {
  run_id: string;
  events: Event[];
  agent_decisions: unknown[];
  defender_actions: Receipt[];
  verification_checks: Check[];
  debrief: Score;
  workspace: Workspace;
  trace_hash: string;
  variant?: VariantInfo;
  seed?: number;
  objective_resource?: string;
  learning?: LearningDebrief;
  checkpoints: { id: string; label: string; sequence: number }[];
};
export type AssistantClaim = { text: string; evidence_ids: string[]; kind?: "fact" | "hypothesis"; supports?: { source_id: string; field: string; quote: string }[] };
export type AssistantTurn = {
  id: string;
  created_at: string;
  question: string;
  analysis: { claims: AssistantClaim[]; next_question: string };
  evidence_ids: string[];
  model_id: string;
  latency_ms: number;
  review_status:
    "unreviewed" | "corroborated" | "disputed" | "needs_more_evidence";
  review_note: string;
  level?: string;
  context_sources?: Record<string, Record<string, unknown>>;
  query_pattern?: string;
  query_explanation?: string;
};
export type ProgressAttempt = {
  run_id: string;
  scenario_id: string;
  scenario_version: string;
  mode: string;
  assistance: string;
  condition: string;
  state: string;
  outcome: string | null;
  branch: boolean;
  counts_toward_progress: boolean;
  exclusion_reason: string | null;
  score: Score;
};
export type ProgressData = {
  attempts: ProgressAttempt[];
  policy: string;
  counted: number;
  excluded: number;
  competency: Record<
    string,
    {
      attempts: number;
      mean_score: number;
      dimensions: Record<
        string,
        { average_pct: number | null; attempts: number }
      >;
    }
  >;
  by_scenario: {
    scenario_id: string;
    scenario_version: string;
    attempts: number;
    mean_score: number;
    outcomes: Record<string, number>;
  }[];
  adversary: {
    attempts: number;
    objective_reached: number;
    median_decision_latency_ms: number | null;
    excluded_for_model_fallback: number;
  };
};
export const terminal = (state: string) =>
  ["completed", "timed_out", "aborted", "technical_failure"].includes(state);
let sessionReady: Promise<void> | null = null;
let analystId = "pending";
let identityGeneration = 0;
export function invalidateSession() { identityGeneration++; sessionReady = null; analystId = "pending"; }
export const draftKey = (rid: string, name: string) => "soc-draft:" + analystId + ":" + rid + ":" + name;
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const identity = identityGeneration;
  if (path !== "/session") {
    sessionReady ??= fetch("/api/session", { credentials: "same-origin" }).then(
      async (r) => {
        if (!r.ok) throw new Error("Unable to open local training session");
        const actor = await r.json();
        if (identity !== identityGeneration) throw Error("Analyst changed. Reconnect before continuing.");
        analystId = actor.id;
      },
    );
    await sessionReady.catch((e) => {
      sessionReady = null;
      throw e;
    });
  }
  const r = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r
    .json()
    .catch(() => ({ message: "The live range did not return a response." }));
  if (!r.ok)
    throw Object.assign(new Error(data.message ?? data.detail?.[0]?.msg ?? "Request failed"), { status: r.status });
  if (path === "/session" && data.id && identity === identityGeneration) analystId = data.id;
  if (method !== "GET" && (path === "/session" || path === "/session/logout" || path === "/session/demo")) {
    invalidateSession();
    localStorage.setItem("soc-identity-revision", crypto.randomUUID());
    window.dispatchEvent(new window.Event("soc-identity-changed"));
  }
  return data as T;
}

export type Briefing = {
  version: string; role: string; authority: string; normal_work: string[];
  evidence_limits: string; escalation_policy: string; recovery_policy: string;
  assessment: string;
};
export type VariantInfo = { id: string; version: string; label: string; manifest_hash: string };
export type WorksheetFields = Record<"observation" | "hypothesis" | "supporting_evidence" | "contradicting_evidence" | "scope_uncertainty" | "action_impact" | "verification_handoff", string>;
export type WorksheetRecord = { revision: number; fields: WorksheetFields; evidence_ids: string[]; saved_at: string | null; saved_by: string | null; save_id?: string };
export type LearningDebrief = {
  consequences: { action_id: string; action: string; target_handle: string; event_id: string | null; available_evidence_ids: string[]; cited_evidence_ids: string[]; measured_change: Record<string, unknown>; next_attempt_event_id: string | null; next_attempt_outcome: string | null; next_decision_id: string | null; uncertainty: string | null }[];
  business: Snapshot["business"]; business_check_id: string | null;
  recommended_exercise_id: string; recommendation_reason: string; notice: string;
  skill_observations: { skill: string; source_ids: string[]; observation: string }[];
};
