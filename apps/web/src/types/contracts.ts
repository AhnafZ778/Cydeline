/**
 * Canonical Sentinel Loop P0 Contracts (Frozen per 01_PRODUCT_REQUIREMENTS_DOCUMENT.md Section 8)
 * Shared interface between Ahnaf's Frontend (apps/web/), Saad's Control Plane (apps/control-api/),
 * and Tanvir's Local AI Red-Team Engine (services/red-agent/).
 */

export type RunState =
  | "created"
  | "running"
  | "contained"
  | "verification_pending"
  | "completed"
  | "timed_out"
  | "aborted"
  | "technical_failure";

export type Outcome =
  | "defended_and_recovered"
  | "contained_but_disrupted"
  | "attacker_objective_reached"
  | "timed_out_unresolved"
  | "aborted"
  | "technical_failure";

export type Mode = "practice" | "assessment";

export type AgentRole = "scout" | "access_operator" | "adaptation_planner";

export type AttackerAction =
  | "inspect_session_status"
  | "list_accessible_documents"
  | "request_document"
  | "test_existing_session"
  | "wait"
  | "stop";

export type DefenderAction =
  | "revoke_session"
  | "temporarily_disable_account"
  | "require_reauthentication"
  | "restore_account";

export type Verification =
  | "verify_suspicious_session_denied"
  | "verify_benign_workflow";

export interface AttackerProposal {
  role: AgentRole;
  action: AttackerAction;
  target_id: string | null;
  session_handle: string | null;
  reason: string;
}

export interface AgentDecisionMeta {
  step: number;
  role: AgentRole;
  model_id: string;
  quantization: string;
  latency_ms: number;
  fallback_used: boolean;
  proposal: AttackerProposal;
  accepted: boolean;
  rejection_reason?: string | null;
}

/**
 * PROPOSED optional block (see context/contracts/master-integration.contract.md).
 * Mirrors what a real target access log carries. Never contains raw tokens.
 */
export interface NetworkInfo {
  src_ip: string;
  user_agent: string;
  http_method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  bytes?: number;
}

export interface EventEnvelope {
  event_id: string;
  run_id: string;
  sequence: number;
  timestamp_utc: string;
  visible_at_utc: string;
  virtual_clock_sec: number;
  source: "target-access" | "target-auth" | "control-defender" | "control-verify" | "red-agent" | "control-plane" | "model" | "defender" | "system";
  event_type:
    | "session.inspect"
    | "document.list"
    | "document.access"
    | "session.test"
    | "defender.action"
    | "recovery.verify"
    | "agent.stop"
    | "run.created"
    | "run.started"
    | "run.completed"
    | "run.reset"
    | "session.status"
    | "session.revoked"
    | "session.reauth_required"
    | "account.disabled"
    | "account.restored"
    | "benign.workflow"
    | "agent.decision"
    | "declaration.submitted"
    | "verification.check"
    | "score.computed";
  actor_id: string;
  session_handle: string | null;
  resource_id: string | null;
  outcome: "allowed" | "denied" | "applied" | "verified" | "failed" | "stopped" | "listed" | "probed" | "none" | "error" | "unknown" | null;
  correlation_id: string;
  learner_visible: boolean;
  /** Optional access-log fields; UI derives method/path/status from event_type + outcome when absent. */
  network?: NetworkInfo;
  /**
   * Debrief-only annotation (teaching note). Never rendered in the live learner stream and
   * never sent by the control plane before the run is completed.
   */
  summary?: string;
  /** Debrief-only. Never rendered in the live learner stream. */
  risk_label?: "normal" | "scout" | "high_risk" | "contained" | "blocked" | "disrupted";
  /** Debrief/replay-only AI decision metadata (reveals the adversary's moves). */
  agent_meta?: AgentDecisionMeta;
}

export interface DeclarationRecord {
  declaration_id: string;
  run_id: string;
  suspected_actor: string;
  suspected_session: string;
  evidence_event_ids: string[];
  rationale: string;
  created_at_utc: string;
  virtual_clock_sec: number;
}

export interface DefenderActionReceipt {
  action_id: string;
  run_id: string;
  action: DefenderAction;
  target_handle: string;
  idempotency_key: string;
  applied_at_utc: string;
  virtual_clock_sec: number;
  result: "applied" | "noop_idempotent" | "rejected";
  target_audit_id: string;
  message: string;
}

export interface VerificationProbeResult {
  check_type: Verification;
  passed: boolean;
  observed_http_status: number;
  summary: string;
  target_audit_id: string;
  checked_at_utc: string;
}

export interface VerificationResponse {
  run_id: string;
  run_state: RunState;
  outcome: Outcome | null;
  suspicious_denied: VerificationProbeResult;
  benign_workflow: VerificationProbeResult;
  both_passed: boolean;
}

export interface RubricDimension {
  id:
    | "recognition_evidence"
    | "effective_containment"
    | "recovery_verification"
    | "business_continuity"
    | "proportionality"
    | "timeliness";
  label: string;
  max_points: number;
  awarded_points: number;
  cited_ids: string[];
  explanation: string;
}

export interface DebriefResponse {
  run_id: string;
  scenario_id: string;
  mode: Mode;
  run_state: RunState;
  terminal_outcome: Outcome;
  total_score: number;
  max_score: 100;
  outcome_gate_explanation: string;
  dimensions: RubricDimension[];
  model_provenance: {
    model_id: string;
    quantization: string;
    total_decisions: number;
    fallback_count: number;
    median_latency_ms: number;
  };
  first_suspicious_event_id: string | null;
  containment_time_delta_sec: number | null;
  recommended_next_step: string;
}

export interface ReplayResponse {
  run_id: string;
  scenario_id: string;
  read_only: true;
  events: EventEnvelope[];
  debrief: DebriefResponse;
}

export interface RunStatusSnapshot {
  run_id: string;
  scenario_id: string;
  mode: Mode;
  state: RunState;
  outcome: Outcome | null;
  virtual_clock_sec: number;
  current_ai_role: AgentRole;
  ai_step: number;
  ai_steps_remaining: number;
  protected_asset_id: string;
  protected_asset_compromised: boolean;
  sess_a_revoked: boolean;
  maya_account_disabled: boolean;
  eli_workflow_healthy: boolean;
  declaration: DeclarationRecord | null;
  applied_actions: DefenderActionReceipt[];
  verification: VerificationResponse | null;
  last_ai_decision: AgentDecisionMeta | null;
}

export interface ControlPlaneClient {
  readonly modeLabel: "Stateful AI Simulation" | "Live FastAPI Control Plane";
  createAndStartRun(mode: Mode): Promise<RunStatusSnapshot>;
  getSnapshot(runId: string): Promise<RunStatusSnapshot>;
  getEvents(runId: string): Promise<EventEnvelope[]>;
  stepSimulationTurn(runId: string, forceFallback?: boolean): Promise<{
    snapshot: RunStatusSnapshot;
    newEvents: EventEnvelope[];
  }>;
  declareIncident(
    runId: string,
    payload: {
      suspected_actor: string;
      suspected_session: string;
      evidence_event_ids: string[];
      rationale: string;
    }
  ): Promise<{ declaration: DeclarationRecord; snapshot: RunStatusSnapshot }>;
  applyDefenderAction(
    runId: string,
    payload: {
      action: DefenderAction;
      target_handle: string;
      idempotency_key: string;
    }
  ): Promise<{ receipt: DefenderActionReceipt; snapshot: RunStatusSnapshot; event: EventEnvelope }>;
  verifyRecovery(runId: string): Promise<{
    verification: VerificationResponse;
    snapshot: RunStatusSnapshot;
    events: EventEnvelope[];
  }>;
  getDebrief(runId: string): Promise<DebriefResponse>;
  getReplay(runId: string): Promise<ReplayResponse>;
  resetRun(runId: string, mode?: Mode): Promise<RunStatusSnapshot>;
}
