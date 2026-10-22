import {
  AgentDecisionMeta,
  AgentRole,
  AttackerAction,
  DebriefResponse,
  DeclarationRecord,
  DefenderAction,
  DefenderActionReceipt,
  EventEnvelope,
  Mode,
  Outcome,
  ReplayResponse,
  RunState,
  RunStatusSnapshot,
  Verification,
  VerificationResponse,
} from "../types/contracts";

/**
 * Turn Saad's canonical contracts (contracts/models.py) into the view models
 * the workbench already renders. The simulation client speaks the view model
 * directly. The live client speaks the canonical JSON and passes it through here.
 */

const DIM_LABEL: Record<string, { id: DebriefResponse["dimensions"][number]["id"]; label: string }> = {
  recognition: { id: "recognition_evidence", label: "Recognition and evidence" },
  containment: { id: "effective_containment", label: "Effective containment" },
  verification: { id: "recovery_verification", label: "Recovery verification" },
  continuity: { id: "business_continuity", label: "Business continuity" },
  proportionality: { id: "proportionality", label: "Proportionality" },
  timeliness: { id: "timeliness", label: "Timeliness" },
};

interface CanonicalEvent {
  event_id: string;
  run_id: string;
  sequence: number;
  timestamp_utc: string;
  visible_at_utc: string;
  source: EventEnvelope["source"];
  event_type: EventEnvelope["event_type"];
  actor_id: string;
  session_handle?: string | null;
  resource_id?: string | null;
  outcome?: EventEnvelope["outcome"];
  correlation_id: string;
  target_audit_id?: string | null;
  learner_visible?: boolean;
  virtual_clock_sec?: number;
  network?: EventEnvelope["network"];
  summary?: string;
  risk_label?: EventEnvelope["risk_label"];
  agent_meta?: AgentDecisionMeta;
}

interface CanonicalDecision {
  decision_id: string;
  step: number;
  role: AgentRole;
  model_id: string;
  proposed_json?: {
    role?: AgentRole;
    action?: AttackerAction;
    target_id?: string | null;
    session_handle?: string | null;
    reason?: string;
  } | null;
  accepted_action?: AttackerAction | null;
  rejection_reason?: string | null;
  latency_ms: number;
  fallback_used: boolean;
}

interface CanonicalDebrief {
  run_id: string;
  outcome?: Outcome;
  terminal_outcome?: Outcome;
  score_total?: number;
  total_score?: number;
  outcome_gate?: string | null;
  outcome_gate_explanation?: string;
  first_suspicious_event_id?: string | null;
  fallback_used?: boolean;
  notes?: string[];
  recommended_next_step?: string;
  dimensions?: DebriefResponse["dimensions"];
  model_provenance?: DebriefResponse["model_provenance"];
  scenario_id?: string;
  mode?: Mode;
  run_state?: RunState;
  breakdown?: Array<{
    dimension: string;
    awarded: number;
    max_points: number;
    explanation: string;
    evidence_ids?: string[];
  }>;
}

interface CanonicalRun {
  run_id: string;
  scenario_id?: string;
  mode?: Mode;
  state?: RunState;
  outcome?: Outcome | null;
}

function isViewEvent(raw: CanonicalEvent): boolean {
  return raw.virtual_clock_sec !== undefined || raw.network !== undefined || raw.agent_meta !== undefined;
}

export function adaptEvent(raw: CanonicalEvent): EventEnvelope {
  if (isViewEvent(raw)) return raw as EventEnvelope;
  return {
    ...raw,
    session_handle: raw.session_handle ?? null,
    resource_id: raw.resource_id ?? null,
    outcome: raw.outcome ?? null,
    learner_visible: raw.learner_visible !== false,
    virtual_clock_sec: 0,
  };
}

export function adaptEvents(raw: CanonicalEvent[]): EventEnvelope[] {
  return raw.map(adaptEvent);
}

function decisionToMeta(d: CanonicalDecision): AgentDecisionMeta {
  const proposed = d.proposed_json ?? {};
  const action = d.accepted_action ?? proposed.action ?? "wait";
  return {
    step: d.step,
    role: d.role,
    model_id: d.model_id,
    quantization: "contract",
    latency_ms: d.latency_ms,
    fallback_used: d.fallback_used,
    accepted: d.accepted_action != null,
    rejection_reason: d.rejection_reason,
    proposal: {
      role: proposed.role ?? d.role,
      action,
      target_id: proposed.target_id ?? null,
      session_handle: proposed.session_handle ?? null,
      reason: proposed.reason ?? "",
    },
  };
}

/** Attach replay decisions onto the event stream so the attack map can draw the AI's tracks. */
export function attachDecisions(events: EventEnvelope[], decisions: CanonicalDecision[]): EventEnvelope[] {
  if (decisions.length === 0) return events;
  const next = events.map((event) => ({ ...event }));
  for (const meta of decisions.map(decisionToMeta)) {
    const session = meta.proposal.session_handle;
    const host =
      next.find((e) => !e.agent_meta && e.event_type === "agent.decision") ??
      next.find((e) => !e.agent_meta && !!session && e.session_handle === session && e.event_type === "document.access") ??
      next.find((e) => !e.agent_meta && !!session && e.session_handle === session);
    if (host) host.agent_meta = meta;
  }
  return next;
}

export function adaptDebrief(raw: CanonicalDebrief, decisions: CanonicalDecision[] = []): DebriefResponse {
  if (raw.dimensions && raw.terminal_outcome && raw.model_provenance) return raw as DebriefResponse;
  const latencies = decisions.map((d) => d.latency_ms).sort((a, b) => a - b);
  const mid = latencies.length === 0 ? 0 : latencies[Math.floor(latencies.length / 2)];
  const fallbackCount = decisions.filter((d) => d.fallback_used).length || (raw.fallback_used ? 1 : 0);
  return {
    run_id: raw.run_id,
    scenario_id: raw.scenario_id ?? "stolen-session",
    mode: raw.mode ?? "practice",
    run_state: raw.run_state ?? "completed",
    terminal_outcome: raw.terminal_outcome ?? raw.outcome ?? "technical_failure",
    total_score: raw.total_score ?? raw.score_total ?? 0,
    max_score: 100,
    outcome_gate_explanation: raw.outcome_gate_explanation ?? raw.outcome_gate ?? "",
    dimensions: (raw.breakdown ?? []).map((d) => {
      const known = DIM_LABEL[d.dimension];
      return {
        id: known?.id ?? "recognition_evidence",
        label: known?.label ?? d.dimension,
        max_points: d.max_points,
        awarded_points: d.awarded,
        cited_ids: d.evidence_ids ?? [],
        explanation: d.explanation,
      };
    }),
    model_provenance: raw.model_provenance ?? {
      model_id: decisions[0]?.model_id ?? (fallbackCount ? "fallback" : "control-plane"),
      quantization: "contract",
      total_decisions: decisions.length,
      fallback_count: fallbackCount,
      median_latency_ms: mid,
    },
    first_suspicious_event_id: raw.first_suspicious_event_id ?? null,
    containment_time_delta_sec: null,
    recommended_next_step: raw.recommended_next_step ?? (raw.notes ?? []).join(" "),
  };
}

interface CanonicalReplay {
  run_id: string;
  events: CanonicalEvent[];
  agent_decisions?: CanonicalDecision[];
  debrief: CanonicalDebrief;
  scenario_id?: string;
}

export function adaptReplay(raw: CanonicalReplay): ReplayResponse {
  const decisions = raw.agent_decisions ?? [];
  const events = attachDecisions(adaptEvents(raw.events), decisions);
  const debrief = adaptDebrief({ ...raw.debrief, scenario_id: raw.debrief.scenario_id ?? raw.scenario_id }, decisions);
  return { run_id: raw.run_id, scenario_id: debrief.scenario_id, read_only: true, events, debrief };
}

export function adaptSnapshot(run: CanonicalRun, events: CanonicalEvent[] = []): RunStatusSnapshot {
  const visible = adaptEvents(events);
  const revoked = visible.some((e) => e.event_type === "session.revoked" || e.resource_id === "revoke_session");
  const disabled = visible.some((e) => e.event_type === "account.disabled");
  const restored = visible.some((e) => e.event_type === "account.restored");
  const compromised = visible.some(
    (e) => e.event_type === "document.access" && e.outcome === "allowed" && (e.resource_id ?? "").startsWith("doc_finance")
  );
  return {
    run_id: run.run_id,
    scenario_id: run.scenario_id ?? "stolen-session",
    mode: run.mode ?? "practice",
    state: run.state ?? "running",
    outcome: run.outcome ?? null,
    virtual_clock_sec: 0,
    current_ai_role: "scout",
    ai_step: 0,
    ai_steps_remaining: 0,
    protected_asset_id: "doc_finance_07",
    protected_asset_compromised: compromised,
    sess_a_revoked: revoked,
    maya_account_disabled: disabled && !restored,
    eli_workflow_healthy: true,
    declaration: null,
    applied_actions: [],
    verification: null,
    last_ai_decision: null,
  };
}

export function adaptReceipt(raw: {
  action_id: string;
  run_id: string;
  action: DefenderAction;
  target_handle: string;
  idempotency_key: string;
  applied_at?: string | null;
  requested_at?: string;
  applied?: boolean;
  duplicate?: boolean;
  target_audit_id?: string | null;
  measured_result?: Record<string, unknown>;
  result?: DefenderActionReceipt["result"];
  applied_at_utc?: string;
  message?: string;
  virtual_clock_sec?: number;
}): DefenderActionReceipt {
  if (raw.result && raw.applied_at_utc && raw.message !== undefined) {
    return raw as DefenderActionReceipt;
  }
  const result: DefenderActionReceipt["result"] = raw.duplicate ? "noop_idempotent" : raw.applied === false ? "rejected" : "applied";
  const measured = raw.measured_result ?? {};
  const message =
    typeof measured.session_status === "string"
      ? `Session is ${measured.session_status}.`
      : result === "applied"
        ? "The control plane applied the action."
        : "The control plane rejected the action.";
  return {
    action_id: raw.action_id,
    run_id: raw.run_id,
    action: raw.action,
    target_handle: raw.target_handle,
    idempotency_key: raw.idempotency_key,
    applied_at_utc: raw.applied_at_utc ?? raw.applied_at ?? raw.requested_at ?? new Date(0).toISOString(),
    virtual_clock_sec: raw.virtual_clock_sec ?? 0,
    result,
    target_audit_id: raw.target_audit_id ?? "",
    message,
  };
}

export function adaptDeclaration(
  raw: {
    declaration_id: string;
    run_id: string;
    suspected_actor: string;
    suspected_session: string;
    rationale: string;
    event_ids?: string[];
    evidence_event_ids?: string[];
    created_at?: string;
    created_at_utc?: string;
    accepted?: boolean;
    rejected_event_ids?: string[];
  }
): DeclarationRecord {
  if (raw.accepted === false) {
    const rejected = (raw.rejected_event_ids ?? []).join(", ");
    throw new Error(rejected ? `Evidence was rejected: ${rejected}` : "The server did not accept that declaration.");
  }
  return {
    declaration_id: raw.declaration_id,
    run_id: raw.run_id,
    suspected_actor: raw.suspected_actor,
    suspected_session: raw.suspected_session,
    evidence_event_ids: raw.evidence_event_ids ?? raw.event_ids ?? [],
    rationale: raw.rationale,
    created_at_utc: raw.created_at_utc ?? raw.created_at ?? new Date(0).toISOString(),
    virtual_clock_sec: 0,
  };
}

export function adaptVerification(raw: {
  run_id: string;
  all_passed?: boolean;
  both_passed?: boolean;
  run_state?: RunState;
  outcome?: Outcome | null;
  checks?: Array<{ verification: Verification; passed: boolean; target_audit_id: string; checked_at: string; measured_result?: { http_status?: number; summary?: string } }>;
  suspicious_denied?: VerificationResponse["suspicious_denied"];
  benign_workflow?: VerificationResponse["benign_workflow"];
}): VerificationResponse {
  if (raw.suspicious_denied && raw.benign_workflow) return raw as VerificationResponse;
  const byName = new Map((raw.checks ?? []).map((c) => [c.verification, c]));
  const probe = (name: Verification): VerificationResponse["suspicious_denied"] => {
    const c = byName.get(name);
    return {
      check_type: name,
      passed: c?.passed ?? false,
      observed_http_status: c?.measured_result?.http_status ?? (c?.passed ? 200 : 403),
      summary: c?.measured_result?.summary ?? (c?.passed ? "Passed" : "Failed"),
      target_audit_id: c?.target_audit_id ?? "",
      checked_at_utc: c?.checked_at ?? new Date(0).toISOString(),
    };
  };
  return {
    run_id: raw.run_id,
    run_state: raw.run_state ?? "verification_pending",
    outcome: raw.outcome ?? null,
    suspicious_denied: probe("verify_suspicious_session_denied"),
    benign_workflow: probe("verify_benign_workflow"),
    both_passed: raw.both_passed ?? raw.all_passed ?? false,
  };
}
