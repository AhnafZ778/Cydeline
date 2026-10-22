import {
  AgentDecisionMeta,
  AgentRole,
  ControlPlaneClient,
  DebriefResponse,
  DeclarationRecord,
  DefenderAction,
  DefenderActionReceipt,
  EventEnvelope,
  Mode,
  NetworkInfo,
  Outcome,
  ReplayResponse,
  RubricDimension,
  RunState,
  RunStatusSnapshot,
  VerificationResponse,
} from "../types/contracts";

/**
 * StatefulSimulationClient — in-browser stand-in for Saad's control plane + Tanvir's adversary.
 *
 * It is NOT the real model. Every AI move is scripted and labelled as simulated in provenance.
 * What it does faithfully: emit target-style access-log events (benign traffic from three
 * employees, plus a hijacked `sess_A` used from a second source address), enforce containment,
 * run two verification probes, and compute the deterministic 100-point rubric. It never sends
 * hidden truth (`agent_meta`, `summary`, `risk_label`, adversary decisions) to the learner view
 * until the run is completed.
 */

const CLOCK_ORIGIN_MS = Date.parse("2026-10-22T06:54:00.000Z");
const START_CLOCK = 360; // learner's shift begins at 07:00:00 scenario time
const TICK_SEC = 2; // virtual seconds per 4s of wall time: 0.5x so a first-time learner can read the logs
const AI_TURN_SEC = 8;
const PROTECTED = "doc_finance_07";
const ADV_IP = "203.0.113.57"; // RFC 5737 documentation range
const ADV_UA = "curl/8.5.0";
const PROBE_IP = "192.0.2.20";
const CONSOLE_IP = "192.0.2.10";

type UserKey = "eli" | "priya" | "maya";
type EventType = EventEnvelope["event_type"];

interface UserProfile {
  actor: string;
  session: string;
  ip: string;
  ua: string;
}

const USERS: Record<UserKey, UserProfile> = {
  eli: {
    actor: "eli@northstar.test",
    session: "sess_E1",
    ip: "198.51.100.41",
    ua: "Mozilla/5.0 (X11; Linux x86_64) Chrome/126.0",
  },
  priya: {
    actor: "priya@northstar.test",
    session: "sess_P1",
    ip: "198.51.100.77",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/17.5",
  },
  maya: {
    actor: "maya@northstar.test",
    session: "sess_A",
    ip: "198.51.100.23",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
  },
};

interface BenignRequest {
  type: EventType;
  method: string;
  path: string;
  resource: string;
  status: number;
  bytes: number;
  weight: number;
}

const DOCS: BenignRequest = { type: "document.list", method: "GET", path: "/api/v1/docs", resource: "docs", status: 200, bytes: 2140, weight: 3 };
const SESSION: BenignRequest = { type: "session.inspect", method: "GET", path: "/api/v1/session", resource: "session_status", status: 200, bytes: 312, weight: 1 };
const file = (name: string, status = 200, bytes = 18000, weight = 2): BenignRequest => ({
  type: "document.access",
  method: "GET",
  path: `/api/v1/docs/${name}`,
  resource: name,
  status,
  bytes,
  weight,
});

const CATALOG: Record<UserKey, BenignRequest[]> = {
  eli: [DOCS, SESSION, file("q3_forecast.csv", 200, 64210, 3), file("ops_roster.xlsx", 200, 22800, 2), file("old_budget.xlsx", 404, 0, 0.35)],
  priya: [DOCS, SESSION, file("brand_kit.zip", 200, 912004, 2), file("ops_roster.xlsx", 304, 0, 2), file("q3_forecast.csv", 304, 0, 1)],
  maya: [DOCS, SESSION, file("q3_forecast.csv", 304, 0, 2), file("hr_policy.pdf", 200, 88120, 2)],
};

interface AttackStep {
  at: number;
  kind: "inspect" | "list" | "test" | "request" | "retry" | "stop";
}

interface InternalRunStore {
  snapshot: RunStatusSnapshot;
  events: EventEnvelope[]; // full fidelity (replay)
  adversaryEventIds: Set<string>;
  idempotencyCache: Map<string, DefenderActionReceipt>;
  rng: () => number;
  clock: number;
  nextBenign: Record<UserKey, number>;
  plan: AttackStep[];
  reqCounter: number;
  firstAdversaryClock: number | null;
  effectiveContainmentClock: number | null;
  hadBroadDisruption: boolean;
  wrongDeclarations: number;
  aiDecisions: AgentDecisionMeta[];
  forceFallback: boolean;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number, w = 4) => String(n).padStart(w, "0");
const isoAt = (clockSec: number) => new Date(CLOCK_ORIGIN_MS + Math.round(clockSec * 1000)).toISOString();

const REDACTED_KEYS = ["agent_meta", "summary", "risk_label"] as const;

function sanitize(e: EventEnvelope, reveal: boolean): EventEnvelope {
  const copy = structuredClone(e);
  if (!reveal) {
    for (const k of REDACTED_KEYS) delete copy[k];
  }
  return copy;
}

export class StatefulSimulationClient implements ControlPlaneClient {
  public readonly modeLabel = "Stateful AI Simulation" as const;
  private runs = new Map<string, InternalRunStore>();
  private runCounter = 1;

  // ---------------------------------------------------------------- helpers
  private getStore(runId: string): InternalRunStore {
    const store = this.runs.get(runId);
    if (!store) throw new Error(`Run ${runId} not found`);
    return store;
  }

  private revealed(store: InternalRunStore): boolean {
    return store.snapshot.state === "completed";
  }

  private rand(store: InternalRunStore, lo: number, hi: number): number {
    return lo + store.rng() * (hi - lo);
  }

  private pickWeighted(store: InternalRunStore, list: BenignRequest[]): BenignRequest {
    const total = list.reduce((s, r) => s + r.weight, 0);
    let x = store.rng() * total;
    for (const r of list) {
      x -= r.weight;
      if (x <= 0) return r;
    }
    return list[0];
  }

  private pushEvent(
    store: InternalRunStore,
    t: number,
    partial: Omit<EventEnvelope, "event_id" | "run_id" | "sequence" | "timestamp_utc" | "visible_at_utc" | "virtual_clock_sec" | "learner_visible"> & {
      learner_visible?: boolean;
    }
  ): EventEnvelope {
    const sequence = store.events.length + 1;
    const evt: EventEnvelope = {
      event_id: `evt_${pad(sequence)}`,
      run_id: store.snapshot.run_id,
      sequence,
      timestamp_utc: isoAt(t),
      visible_at_utc: isoAt(t + 0.4),
      virtual_clock_sec: Math.round(t),
      learner_visible: true,
      ...partial,
    };
    store.events.push(evt);
    return evt;
  }

  private nextReq(store: InternalRunStore): string {
    return `req_${pad(store.reqCounter++)}`;
  }

  private benignEvent(store: InternalRunStore, user: UserKey, t: number, forced?: BenignRequest): EventEnvelope {
    const u = USERS[user];
    const req = forced ?? this.pickWeighted(store, CATALOG[user]);
    const outcome: EventEnvelope["outcome"] = req.status === 404 ? "failed" : "allowed";
    const net: NetworkInfo = {
      src_ip: u.ip,
      user_agent: u.ua,
      http_method: req.method,
      path: req.path,
      status_code: req.status,
      latency_ms: Math.round(req.status === 304 ? this.rand(store, 6, 16) : this.rand(store, 9, 62)),
      bytes: req.bytes,
    };
    return this.pushEvent(store, t, {
      source: "target-access",
      event_type: req.type,
      actor_id: u.actor,
      session_handle: u.session,
      resource_id: req.resource,
      outcome,
      correlation_id: this.nextReq(store),
      network: net,
    });
  }

  private adversaryEvent(
    store: InternalRunStore,
    t: number,
    kind: "inspect" | "list" | "test" | "request" | "retry",
    decision: AgentDecisionMeta
  ): EventEnvelope {
    const base = {
      source: "target-access" as const,
      actor_id: USERS.maya.actor,
      session_handle: "sess_A",
      correlation_id: this.nextReq(store),
      agent_meta: decision,
    };
    const net = (method: string, path: string, status: number, bytes = 0): NetworkInfo => ({
      src_ip: ADV_IP,
      user_agent: ADV_UA,
      http_method: method,
      path,
      status_code: status,
      latency_ms: Math.round(this.rand(store, 9, 48)),
      bytes,
    });
    let evt: EventEnvelope;
    if (kind === "inspect") {
      evt = this.pushEvent(store, t, {
        ...base,
        event_type: "session.inspect",
        resource_id: "session_status",
        outcome: "allowed",
        network: net("GET", "/api/v1/session", 200, 312),
        summary: `First request on sess_A from ${ADV_IP} (${ADV_UA}). Every earlier request on this session came from ${USERS.maya.ip} using a browser.`,
        risk_label: "scout",
      });
    } else if (kind === "list") {
      evt = this.pushEvent(store, t, {
        ...base,
        event_type: "document.list",
        resource_id: "vault",
        outcome: "allowed",
        network: net("GET", "/api/v1/vault/docs", 200, 1480),
        summary: "A restricted route this session had never requested before.",
        risk_label: "high_risk",
      });
    } else if (kind === "test") {
      evt = this.pushEvent(store, t, {
        ...base,
        event_type: "session.test",
        resource_id: PROTECTED,
        outcome: "allowed",
        network: net("HEAD", `/api/v1/vault/docs/${PROTECTED}`, 200),
        summary: "A HEAD request on the protected document: checking access without downloading it.",
        risk_label: "high_risk",
      });
    } else if (kind === "request") {
      evt = this.pushEvent(store, t, {
        ...base,
        event_type: "document.access",
        resource_id: PROTECTED,
        outcome: "allowed",
        network: net("GET", `/api/v1/vault/docs/${PROTECTED}`, 200, 48213),
        summary: "The protected document was downloaded (48 KB) before containment.",
        risk_label: "high_risk",
      });
    } else {
      evt = this.pushEvent(store, t, {
        ...base,
        event_type: "document.access",
        resource_id: PROTECTED,
        outcome: "denied",
        network: net("GET", `/api/v1/vault/docs/${PROTECTED}`, 403),
        summary: "After containment the same session is refused (403).",
        risk_label: "blocked",
      });
    }
    store.adversaryEventIds.add(evt.event_id);
    if (store.firstAdversaryClock === null) store.firstAdversaryClock = t;
    return evt;
  }

  private decision(store: InternalRunStore, role: AgentRole, action: AgentDecisionMeta["proposal"]["action"], target: string | null, reason: string): AgentDecisionMeta {
    const d: AgentDecisionMeta = {
      step: store.aiDecisions.length + 1,
      role,
      model_id: "sim-scripted-v1",
      quantization: "n/a",
      latency_ms: 0,
      fallback_used: store.forceFallback,
      accepted: true,
      proposal: { role, action, target_id: target, session_handle: "sess_A", reason },
    };
    store.aiDecisions.push(d);
    return d;
  }

  private runPlanStep(store: InternalRunStore, step: AttackStep): EventEnvelope[] {
    const out: EventEnvelope[] = [];
    const { snapshot } = store;
    switch (step.kind) {
      case "inspect": {
        const d = this.decision(store, "scout", "inspect_session_status", null, "Inspect sess_A to confirm privileges");
        out.push(this.adversaryEvent(store, step.at, "inspect", d));
        snapshot.current_ai_role = "scout";
        break;
      }
      case "list": {
        const d = this.decision(store, "scout", "list_accessible_documents", null, "List what sess_A can see");
        out.push(this.adversaryEvent(store, step.at, "list", d));
        snapshot.current_ai_role = "access_operator";
        break;
      }
      case "test": {
        const d = this.decision(store, "access_operator", "test_existing_session", PROTECTED, "Test read clearance before retrieval");
        out.push(this.adversaryEvent(store, step.at, "test", d));
        break;
      }
      case "request": {
        const d = this.decision(store, "access_operator", "request_document", PROTECTED, "Document is accessible via unrevoked sess_A");
        out.push(this.adversaryEvent(store, step.at, "request", d));
        snapshot.protected_asset_compromised = true;
        snapshot.outcome = "attacker_objective_reached";
        store.plan.push({ at: step.at + 3, kind: "stop" });
        break;
      }
      case "retry": {
        const d = this.decision(store, "adaptation_planner", "test_existing_session", PROTECTED, "Re-test sess_A after a defender control");
        out.push(this.adversaryEvent(store, step.at, "retry", d));
        snapshot.current_ai_role = "adaptation_planner";
        break;
      }
      case "stop": {
        const role: AgentRole = snapshot.protected_asset_compromised ? "access_operator" : "adaptation_planner";
        const d = this.decision(store, role, "stop", null, "No permitted access path remains");
        snapshot.last_ai_decision = d;
        out.push(
          this.pushEvent(store, step.at, {
            source: "red-agent",
            event_type: "agent.stop",
            actor_id: "red-agent",
            session_handle: "sess_A",
            resource_id: "none",
            outcome: "stopped",
            correlation_id: this.nextReq(store),
            learner_visible: false,
            agent_meta: d,
            summary: "The adversary stopped.",
            risk_label: "contained",
          })
        );
        break;
      }
    }
    if (step.kind !== "stop") snapshot.last_ai_decision = store.aiDecisions[store.aiDecisions.length - 1];
    return out;
  }

  /** Advance scenario time, generating benign traffic and any scheduled adversary moves in order. */
  private advanceTo(store: InternalRunStore, target: number): EventEnvelope[] {
    const generated: Array<{ t: number; make: () => EventEnvelope[] }> = [];
    const { snapshot } = store;
    const contained = snapshot.sess_a_revoked || snapshot.maya_account_disabled;

    (Object.keys(USERS) as UserKey[]).forEach((user) => {
      while (store.nextBenign[user] <= target) {
        const t = store.nextBenign[user];
        store.nextBenign[user] = t + this.rand(store, 10, 20);
        if (user === "maya" && contained) continue;
        generated.push({ t, make: () => [this.benignEvent(store, user, t)] });
      }
    });

    store.plan.sort((a, b) => a.at - b.at);
    while (store.plan.length && store.plan[0].at <= target) {
      const step = store.plan.shift()!;
      generated.push({ t: step.at, make: () => this.runPlanStep(store, step) });
    }

    generated.sort((a, b) => a.t - b.t);
    const out: EventEnvelope[] = [];
    for (const g of generated) out.push(...g.make());
    store.clock = target;
    snapshot.virtual_clock_sec = Math.round(target);
    snapshot.ai_step = 1 + Math.floor(Math.max(0, target - START_CLOCK) / AI_TURN_SEC);
    snapshot.ai_steps_remaining = store.plan.length;
    return out;
  }

  private bump(store: InternalRunStore, sec: number): EventEnvelope[] {
    return this.advanceTo(store, store.clock + sec);
  }

  private publicSnapshot(store: InternalRunStore): RunStatusSnapshot {
    const snap = structuredClone(store.snapshot);
    // Adversary Lens (practice mode only): the live AI move is shown to the learner so they can watch
    // an attack unfold. Assessment runs keep it hidden until completion. It never affects scoring.
    if (!this.revealed(store) && snap.mode !== "practice") snap.last_ai_decision = null;
    return snap;
  }

  private visibleEvents(store: InternalRunStore): EventEnvelope[] {
    const reveal = this.revealed(store);
    return store.events.filter((e) => e.learner_visible).map((e) => sanitize(e, reveal));
  }

  // ----------------------------------------------------------------- run lifecycle
  public async createAndStartRun(mode: Mode = "practice"): Promise<RunStatusSnapshot> {
    const n = this.runCounter++;
    const runId = `run_${pad(n)}`;
    const rng = mulberry32(0x5e17 + n * 7919);

    const snapshot: RunStatusSnapshot = {
      run_id: runId,
      scenario_id: "stolen-session-v1",
      mode,
      state: "running",
      outcome: null,
      virtual_clock_sec: 0,
      current_ai_role: "scout",
      ai_step: 1,
      ai_steps_remaining: 4,
      protected_asset_id: PROTECTED,
      protected_asset_compromised: false,
      sess_a_revoked: false,
      maya_account_disabled: false,
      eli_workflow_healthy: true,
      declaration: null,
      applied_actions: [],
      verification: null,
      last_ai_decision: null,
    };

    const store: InternalRunStore = {
      snapshot,
      events: [],
      adversaryEventIds: new Set(),
      idempotencyCache: new Map(),
      rng,
      clock: 0,
      nextBenign: { eli: 2 + rng() * 6, priya: 5 + rng() * 6, maya: 8 + rng() * 6 },
      plan: [
        { at: START_CLOCK + 8, kind: "inspect" },
        { at: START_CLOCK + 36, kind: "list" },
        { at: START_CLOCK + 64, kind: "test" },
        { at: START_CLOCK + 96, kind: "request" },
      ],
      reqCounter: 1,
      firstAdversaryClock: null,
      effectiveContainmentClock: null,
      hadBroadDisruption: false,
      wrongDeclarations: 0,
      aiDecisions: [],
      forceFallback: false,
    };
    this.runs.set(runId, store);

    // Pre-history: benign traffic only, so the learner can see what "normal" looks like.
    // One benign 404 is forced so not every 4xx looks malicious.
    store.nextBenign.eli = 3;
    let forced404 = false;
    const history: Array<{ t: number; user: UserKey }> = [];
    (Object.keys(USERS) as UserKey[]).forEach((user) => {
      while (store.nextBenign[user] < START_CLOCK) {
        history.push({ t: store.nextBenign[user], user });
        store.nextBenign[user] += this.rand(store, 10, 20);
      }
    });
    history.sort((a, b) => a.t - b.t);
    for (const h of history) {
      let forcedReq: BenignRequest | undefined;
      if (!forced404 && h.user === "eli" && h.t > 120) {
        forcedReq = CATALOG.eli[4];
        forced404 = true;
      }
      this.benignEvent(store, h.user, h.t, forcedReq);
    }
    store.clock = START_CLOCK;
    snapshot.virtual_clock_sec = START_CLOCK;
    snapshot.ai_step = 1;

    return this.publicSnapshot(store);
  }

  public async getSnapshot(runId: string): Promise<RunStatusSnapshot> {
    return this.publicSnapshot(this.getStore(runId));
  }

  public async getEvents(runId: string): Promise<EventEnvelope[]> {
    return this.visibleEvents(this.getStore(runId));
  }

  public async stepSimulationTurn(
    runId: string,
    forceFallback = false
  ): Promise<{ snapshot: RunStatusSnapshot; newEvents: EventEnvelope[] }> {
    const store = this.getStore(runId);
    if (forceFallback) store.forceFallback = true;
    if (store.snapshot.state === "completed") {
      return { snapshot: this.publicSnapshot(store), newEvents: [] };
    }
    const reveal = this.revealed(store);
    const created = this.bump(store, TICK_SEC);
    return {
      snapshot: this.publicSnapshot(store),
      newEvents: created.filter((e) => e.learner_visible).map((e) => sanitize(e, reveal)),
    };
  }

  // ----------------------------------------------------------------- learner actions
  public async declareIncident(
    runId: string,
    payload: {
      suspected_actor: string;
      suspected_session: string;
      evidence_event_ids: string[];
      rationale: string;
    }
  ): Promise<{ declaration: DeclarationRecord; snapshot: RunStatusSnapshot }> {
    const store = this.getStore(runId);
    const visible = new Map(store.events.filter((e) => e.learner_visible).map((e) => [e.event_id, e]));

    if (payload.evidence_event_ids.length === 0) {
      throw new Error("Pin at least one log line as evidence before declaring.");
    }
    for (const id of payload.evidence_event_ids) {
      if (!visible.has(id)) {
        throw new Error(`Evidence ${id} is not a visible event in this run.`);
      }
    }
    if (payload.suspected_session !== "sess_A") {
      store.wrongDeclarations += 1;
      throw new Error(
        `Not supported: the pinned lines do not show ${payload.suspected_session} behaving differently from the other sessions. Re-check which session stands out.`
      );
    }
    const supporting = payload.evidence_event_ids.filter((id) => store.adversaryEventIds.has(id));
    if (supporting.length === 0) {
      store.wrongDeclarations += 1;
      throw new Error(
        `Evidence incomplete: none of the pinned lines show ${payload.suspected_session} doing anything unusual. Pin at least one line that does.`
      );
    }

    this.bump(store, 1);
    const declaration: DeclarationRecord = {
      declaration_id: `decl_${runId}_01`,
      run_id: runId,
      suspected_actor: payload.suspected_actor,
      suspected_session: payload.suspected_session,
      evidence_event_ids: [...payload.evidence_event_ids],
      rationale: payload.rationale || "No rationale provided.",
      created_at_utc: isoAt(store.clock),
      virtual_clock_sec: Math.round(store.clock),
    };
    store.snapshot.declaration = declaration;
    return { declaration: structuredClone(declaration), snapshot: this.publicSnapshot(store) };
  }

  public async applyDefenderAction(
    runId: string,
    payload: { action: DefenderAction; target_handle: string; idempotency_key: string }
  ): Promise<{ receipt: DefenderActionReceipt; snapshot: RunStatusSnapshot; event: EventEnvelope }> {
    const store = this.getStore(runId);
    const { snapshot } = store;

    const existing = store.idempotencyCache.get(payload.idempotency_key);
    if (existing) {
      const last = [...store.events].reverse().find((e) => e.event_type === "defender.action" && e.correlation_id === existing.target_audit_id);
      return {
        receipt: structuredClone({ ...existing, result: "noop_idempotent" }),
        snapshot: this.publicSnapshot(store),
        event: sanitize(last ?? store.events[store.events.length - 1], this.revealed(store)),
      };
    }

    this.bump(store, 1);
    const auditId = `ctl_${pad(store.events.length + 1)}`;
    let message = "";
    let path = "";
    let risk: EventEnvelope["risk_label"] = "contained";
    const markContained = () => {
      if (store.effectiveContainmentClock === null) store.effectiveContainmentClock = store.clock;
      if (snapshot.state === "running") snapshot.state = "contained";
      // Adversary reacts only if it has not already finished.
      const alreadyDone = snapshot.protected_asset_compromised;
      if (!alreadyDone) {
        store.plan = [
          { at: store.clock + 5, kind: "retry" },
          { at: store.clock + 9, kind: "stop" },
        ];
      }
    };

    switch (payload.action) {
      case "revoke_session":
        snapshot.sess_a_revoked = true;
        path = `/control/sessions/${payload.target_handle}/revoke`;
        message = `Session ${payload.target_handle} revoked.`;
        markContained();
        break;
      case "require_reauthentication":
        snapshot.sess_a_revoked = true;
        path = "/control/users/maya/reauth";
        message = "Re-authentication required for maya@northstar.test; active session invalidated.";
        markContained();
        break;
      case "temporarily_disable_account":
        snapshot.maya_account_disabled = true;
        snapshot.sess_a_revoked = true;
        store.hadBroadDisruption = true;
        path = "/control/users/maya/disable";
        message = "Account maya@northstar.test disabled; legitimate work is also blocked.";
        risk = "disrupted";
        markContained();
        break;
      case "restore_account":
        snapshot.maya_account_disabled = false;
        path = "/control/users/maya/restore";
        message = "Account maya@northstar.test restored; sess_A stays revoked.";
        break;
    }

    const receipt: DefenderActionReceipt = {
      action_id: `act_${pad(snapshot.applied_actions.length + 1, 2)}`,
      run_id: runId,
      action: payload.action,
      target_handle: payload.target_handle,
      idempotency_key: payload.idempotency_key,
      applied_at_utc: isoAt(store.clock),
      virtual_clock_sec: Math.round(store.clock),
      result: "applied",
      target_audit_id: auditId,
      message,
    };
    store.idempotencyCache.set(payload.idempotency_key, receipt);
    snapshot.applied_actions.push(receipt);

    const evt = this.pushEvent(store, store.clock, {
      source: "control-defender",
      event_type: "defender.action",
      actor_id: "analyst",
      session_handle: payload.target_handle,
      resource_id: payload.action,
      outcome: "applied",
      correlation_id: auditId,
      network: {
        src_ip: CONSOLE_IP,
        user_agent: "sentinel-console/1.0",
        http_method: "POST",
        path,
        status_code: 200,
        latency_ms: 18,
      },
      summary: message,
      risk_label: risk,
    });

    return {
      receipt: structuredClone(receipt),
      snapshot: this.publicSnapshot(store),
      event: sanitize(evt, this.revealed(store)),
    };
  }

  public async verifyRecovery(runId: string): Promise<{
    verification: VerificationResponse;
    snapshot: RunStatusSnapshot;
    events: EventEnvelope[];
  }> {
    const store = this.getStore(runId);
    const { snapshot } = store;
    this.bump(store, 2);

    const suspiciousDenied = snapshot.sess_a_revoked || snapshot.maya_account_disabled;
    const benignHealthy = snapshot.eli_workflow_healthy && !snapshot.maya_account_disabled;
    const p1 = `aud_ver_${pad(store.events.length + 1)}`;
    const p2 = `aud_ver_${pad(store.events.length + 2)}`;

    const e1 = this.pushEvent(store, store.clock, {
      source: "control-verify",
      event_type: "recovery.verify",
      actor_id: "verify-probe",
      session_handle: "sess_A",
      resource_id: PROTECTED,
      outcome: suspiciousDenied ? "verified" : "failed",
      correlation_id: p1,
      network: {
        src_ip: PROBE_IP,
        user_agent: "sentinel-probe/1.0",
        http_method: "HEAD",
        path: `/api/v1/vault/docs/${PROTECTED}`,
        status_code: suspiciousDenied ? 403 : 200,
        latency_ms: 14,
      },
      summary: suspiciousDenied ? "Probe 1 passed: sess_A is refused." : "Probe 1 failed: sess_A can still read the vault.",
      risk_label: suspiciousDenied ? "contained" : "high_risk",
    });
    const e2 = this.pushEvent(store, store.clock + 0.6, {
      source: "control-verify",
      event_type: "recovery.verify",
      actor_id: USERS.eli.actor,
      session_handle: USERS.eli.session,
      resource_id: "q3_forecast.csv",
      outcome: benignHealthy ? "verified" : "failed",
      correlation_id: p2,
      network: {
        src_ip: PROBE_IP,
        user_agent: "sentinel-probe/1.0",
        http_method: "GET",
        path: "/api/v1/docs/q3_forecast.csv",
        status_code: benignHealthy ? 200 : 503,
        latency_ms: 21,
      },
      summary: benignHealthy ? "Probe 2 passed: legitimate work succeeds." : "Probe 2 failed: legitimate work is blocked.",
      risk_label: benignHealthy ? "normal" : "disrupted",
    });
    store.clock += 0.6;
    snapshot.virtual_clock_sec = Math.round(store.clock);

    let outcome: Outcome | null = snapshot.outcome;
    let state: RunState = "verification_pending";
    if (snapshot.protected_asset_compromised) {
      outcome = "attacker_objective_reached";
      state = "completed";
    } else if (suspiciousDenied && benignHealthy) {
      outcome = "defended_and_recovered";
      state = "completed";
    } else if (suspiciousDenied && !benignHealthy) {
      outcome = "contained_but_disrupted";
    }
    snapshot.state = state;
    snapshot.outcome = outcome;

    const verification: VerificationResponse = {
      run_id: runId,
      run_state: state,
      outcome,
      suspicious_denied: {
        check_type: "verify_suspicious_session_denied",
        passed: suspiciousDenied,
        observed_http_status: suspiciousDenied ? 403 : 200,
        summary: suspiciousDenied ? "sess_A -> 403 refused" : "sess_A -> 200 still active",
        target_audit_id: p1,
        checked_at_utc: isoAt(store.clock),
      },
      benign_workflow: {
        check_type: "verify_benign_workflow",
        passed: benignHealthy,
        observed_http_status: benignHealthy ? 200 : 503,
        summary: benignHealthy ? "legitimate user -> 200 OK" : "maya disabled -> work blocked",
        target_audit_id: p2,
        checked_at_utc: isoAt(store.clock),
      },
      both_passed: suspiciousDenied && benignHealthy,
    };
    snapshot.verification = verification;

    const reveal = this.revealed(store);
    return {
      verification: structuredClone(verification),
      snapshot: this.publicSnapshot(store),
      events: [sanitize(e1, reveal), sanitize(e2, reveal)],
    };
  }

  // ----------------------------------------------------------------- debrief / replay
  public async getDebrief(runId: string): Promise<DebriefResponse> {
    const store = this.getStore(runId);
    const { snapshot, events } = store;
    const decl = snapshot.declaration;
    const ver = snapshot.verification;

    const supporting = (decl?.evidence_event_ids ?? []).filter((id) => store.adversaryEventIds.has(id));
    const correctSession = decl?.suspected_session === "sess_A";
    const recPoints = decl
      ? Math.max(0, (correctSession ? 10 : 0) + Math.min(10, supporting.length * 5) - Math.min(6, store.wrongDeclarations * 3))
      : 0;

    const containActs = snapshot.applied_actions.filter((a) => a.action !== "restore_account");
    const containPoints = snapshot.sess_a_revoked ? 25 : 0;

    let verPoints = 0;
    if (ver) {
      if (ver.suspicious_denied.passed) verPoints += 10;
      if (ver.benign_workflow.passed) verPoints += 10;
    }

    const continuityPoints = snapshot.maya_account_disabled ? 5 : store.hadBroadDisruption ? 12 : 15;
    const propPoints = snapshot.maya_account_disabled ? 0 : store.hadBroadDisruption ? 5 : snapshot.sess_a_revoked ? 10 : 0;

    const deltaSec =
      store.effectiveContainmentClock !== null && store.firstAdversaryClock !== null
        ? Math.max(0, Math.round(store.effectiveContainmentClock - store.firstAdversaryClock))
        : null;
    let timePoints = 0;
    if (deltaSec !== null) timePoints = deltaSec <= 30 ? 10 : deltaSec <= 60 ? 8 : 5;

    const firstAdv = events.find((e) => store.adversaryEventIds.has(e.event_id));
    const eliAfter = events.find((e) => e.session_handle === "sess_E1" && e.network?.status_code === 200 && e.sequence > (events.find((x) => x.event_type === "defender.action")?.sequence ?? Infinity));
    const eliAny = events.find((e) => e.session_handle === "sess_E1" && e.network?.status_code === 200);

    const dimensions: RubricDimension[] = [
      {
        id: "recognition_evidence",
        label: "Recognition & evidence",
        max_points: 20,
        awarded_points: recPoints,
        cited_ids: decl ? decl.evidence_event_ids : [],
        explanation: decl
          ? `Named ${decl.suspected_session} with ${supporting.length} supporting line(s)${store.wrongDeclarations ? `; ${store.wrongDeclarations} rejected attempt(s) cost points` : ""}.`
          : "No incident was declared.",
      },
      {
        id: "effective_containment",
        label: "Effective containment",
        max_points: 25,
        awarded_points: containPoints,
        cited_ids: containActs.map((a) => a.action_id),
        explanation: snapshot.sess_a_revoked
          ? "sess_A was revoked and later requests from it were refused (403)."
          : "sess_A was not contained.",
      },
      {
        id: "recovery_verification",
        label: "Recovery verification",
        max_points: 20,
        awarded_points: verPoints,
        cited_ids: ver ? [ver.suspicious_denied.target_audit_id, ver.benign_workflow.target_audit_id] : [],
        explanation: ver
          ? ver.both_passed
            ? "Both probes ran and passed."
            : "Probes ran, but at least one did not pass."
          : "Verification probes were not run.",
      },
      {
        id: "business_continuity",
        label: "Business continuity",
        max_points: 15,
        awarded_points: continuityPoints,
        cited_ids: [(eliAfter ?? eliAny)?.event_id ?? "evt_0001"],
        explanation: snapshot.maya_account_disabled
          ? "Maya's account is still disabled, so her legitimate work is blocked."
          : store.hadBroadDisruption
            ? "A broad action briefly blocked legitimate work before it was restored."
            : "Eli, Priya and Maya's legitimate work was never blocked.",
      },
      {
        id: "proportionality",
        label: "Proportionality",
        max_points: 10,
        awarded_points: propPoints,
        cited_ids: snapshot.applied_actions.map((a) => a.action_id),
        explanation: store.hadBroadDisruption
          ? "An account-wide action was used where ending one session was enough."
          : "The smallest action that worked was used; no account was frozen.",
      },
      {
        id: "timeliness",
        label: "Timeliness",
        max_points: 10,
        awarded_points: timePoints,
        cited_ids: firstAdv ? [firstAdv.event_id] : [],
        explanation:
          deltaSec !== null
            ? `Contained ${deltaSec}s after the first request from the unusual source (scenario clock; AI inference time excluded).`
            : "No effective containment was recorded.",
      },
    ];

    const total = dimensions.reduce((a, d) => a + d.awarded_points, 0);
    let terminal: Outcome = "timed_out_unresolved";
    let gate = "Both verification probes must pass before a run is marked defended_and_recovered.";
    if (snapshot.protected_asset_compromised) {
      terminal = "attacker_objective_reached";
      gate = "The protected document was read before containment. Later containment counts as recovery, not prevention.";
    } else if (ver?.both_passed) {
      terminal = "defended_and_recovered";
      gate = "sess_A was refused (403), legitimate work was verified, and doc_finance_07 was never read.";
    } else if (snapshot.sess_a_revoked && snapshot.maya_account_disabled) {
      terminal = "contained_but_disrupted";
      gate = "The intruder was blocked, but disabling Maya's account disrupted legitimate work. Restore it and verify again.";
    }

    return {
      run_id: runId,
      scenario_id: snapshot.scenario_id,
      mode: snapshot.mode,
      run_state: snapshot.state,
      terminal_outcome: terminal,
      total_score: total,
      max_score: 100,
      outcome_gate_explanation: gate,
      dimensions,
      model_provenance: {
        model_id: "sim-scripted-v1",
        quantization: "n/a",
        total_decisions: store.aiDecisions.length,
        fallback_count: store.aiDecisions.filter((d) => d.fallback_used).length,
        median_latency_ms: 0,
      },
      first_suspicious_event_id: firstAdv?.event_id ?? null,
      containment_time_delta_sec: deltaSec,
      recommended_next_step:
        terminal === "defended_and_recovered"
          ? "Run it again and try to contain faster, or see what an account-wide action does to your score."
          : "Run it again. Compare the source address on each sess_A request before you declare.",
    };
  }

  public async getReplay(runId: string): Promise<ReplayResponse> {
    const store = this.getStore(runId);
    const debrief = await this.getDebrief(runId);
    return {
      run_id: runId,
      scenario_id: store.snapshot.scenario_id,
      read_only: true,
      events: structuredClone(store.events),
      debrief,
    };
  }

  public async resetRun(_runId: string, mode: Mode = "practice"): Promise<RunStatusSnapshot> {
    return this.createAndStartRun(mode);
  }
}
