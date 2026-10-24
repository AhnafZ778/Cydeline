import { type Page } from "@playwright/test";
export const RID = "run_review01";
export const scenarios = [
  {
    scenario_id: "stolen-session",
    version: "v1",
    title: "The Stolen Session",
    summary:
      "Investigate compromised browser access and preserve employee work.",
    duration_sec: 180,
    difficulty: "introductory",
    family: "identity",
    tools: ["logs"],
    skills: ["investigation"],
  },
  {
    scenario_id: "northstar-breach",
    version: "v2",
    title: "The Reporting Blind Spot",
    summary: "Investigate browser access and a reporting service.",
    duration_sec: 720,
    difficulty: "standard",
    family: "identity",
    tools: ["logs"],
    skills: ["scope"],
  },
];
export function event(i: number, extra: Record<string, unknown> = {}) {
  return {
    event_id: "evt_review" + String(i).padStart(3, "0"),
    run_id: RID,
    sequence: i,
    timestamp_utc: "2026-10-23T12:00:00Z",
    visible_at_utc: "2026-10-23T12:00:00Z",
    virtual_clock_sec: i,
    source: "target-access",
    event_type: "session.inspect",
    actor_id: "maya",
    session_handle: "sess_A",
    resource_id: null,
    outcome: "allowed",
    correlation_id: "corr_review" + i,
    learner_visible: true,
    target_audit_id: "audit_review" + i,
    network: {
      src_ip: "203.0.113.57",
      http_method: "GET",
      path: "/session/status",
      status_code: 200,
      user_agent: "Training Browser",
      latency_ms: 1,
    },
    ...extra,
  };
}
export function snapshot() {
  return {
    run_id: RID,
    scenario_id: "stolen-session",
    scenario_version: "v1",
    scenario: scenarios[0],
    mode: "practice",
    assistance: "coached",
    state: "running",
    outcome: null,
    paused: false,
    virtual_clock_sec: 10,
    remaining_sec: 170,
    state_revision: 0,
    last_sequence: 12,
    model_status: "ready",
    ai_unavailable: false,
    business: [
      { workflow_id: "wf_eli", user_id: "eli", passed: true, http_status: 200 },
    ],
    disrupted_seconds: 0,
    declaration: null,
    verification: null,
    applied_actions: [],
    workspace: {
      revision: 0,
      note: "",
      hypothesis: "",
      hypothesis_status: "open",
      evidence_ids: [],
      timeline: [],
      saved_queries: [],
      alerts: [
        {
          id: "alert_review01",
          title: "Session observed from a new source",
          severity: "medium",
          status: "new",
          session_handle: "sess_A",
          event_ids: ["evt_review001"],
          created_sec: 8,
          sla_sec: 180,
          created_at: "2026-10-23T12:00:00Z",
          verdict: null,
          revision: 0,
        },
      ],
      cases: [
        {
          id: "case_main",
          opened: false,
          title: "The Stolen Session",
          owner: null,
          role: "triage",
          status: "open",
          notes: [],
          revision: 0,
          alert_ids: [],
          artifacts: [],
          note: "",
          scope: "",
          report: "",
          playbook_started: false,
          completed_steps: [],
        },
      ],
      messages: [],
      hints_used: [],
    },
  };
}
export async function installSoc(page: Page, active = false) {
  const state = {
    snapshot: snapshot() as any,
    events: Array.from({ length: 12 }, (_, i) => event(i + 1)),
    active,
    available: true,
    calls: [] as { path: string; method: string; body: any }[],
    streamRequests: 0,
    conflict: false,
  };
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname,
      method = req.method();
    if (!path.startsWith("/api/")) return route.continue();
    const body = req.postDataJSON() ?? {};
    state.calls.push({ path, method, body });
    let result: any = {};
    const s = state.snapshot,
      ws = s.workspace;
    const json = (data: any, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (path === "/api/session")
      result = {
        id: "learner_review01",
        name: "Review analyst",
        role: "learner",
      };
    else if (path === "/api/health")
      result = {
        model: { available: state.available, name: "test-model" },
        services: { control: "ok", target: "ok" },
      };
    else if (path === "/api/scenarios") result = { scenarios };
    else if (path === "/api/people") result = { people: [] };
    else if (path === "/api/assignments") result = { assignments: [] };
    else if (path === "/api/instructor")
      return json({ message: "Instructor access required" }, 403);
    else if (path === "/api/progress")
      result = {
        attempts: [],
        policy: "Finished attempts only.",
        counted: 0,
        excluded: 0,
        competency: {},
        by_scenario: [],
        adversary: {
          attempts: 0,
          objective_reached: 0,
          median_decision_latency_ms: null,
          excluded_for_model_fallback: 0,
        },
      };
    else if (path === "/api/runs" && method === "GET")
      result = {
        runs: state.active
          ? [
              {
                run_id: RID,
                scenario_id: s.scenario_id,
                state: s.state,
                outcome: s.outcome,
              },
            ]
          : [],
      };
    else if (path === "/api/runs" && method === "POST") {
      if (!state.available)
        return json({ message: "AI unavailable — Retry" }, 503);
      state.active = true;
      const sc = scenarios.find((x) => x.scenario_id === body.scenario_id)!;
      Object.assign(s, {
        scenario_id: sc.scenario_id,
        scenario_version: sc.version,
        scenario: sc,
        mode: body.mode,
        assistance: body.mode === "assessment" ? "blind" : body.assistance,
      });
      result = s;
    } else if (path.endsWith("/stream")) {
      state.streamRequests++;
      return route.fulfill({
        contentType: "text/event-stream",
        body: "event: snapshot\ndata: " + JSON.stringify(s) + "\n\n",
      });
    } else if (path.endsWith("/events"))
      result = { events: state.events, next_cursor: 12, has_more: false };
    else if (path.endsWith("/workspace")) {
      if (state.conflict) {
        state.conflict = false;
        ws.revision++;
        return json(
          { message: "Case changed in another session. Reload before saving." },
          409,
        );
      }
      Object.assign(ws, body);
      ws.revision++;
      result = s;
    } else if (path.endsWith("/cases") && method === "POST") {
      const a = ws.alerts.find((a: any) => a.id === body.alert_id),
        c = ws.cases[0];
      Object.assign(c, {
        opened: true,
        owner: "Review analyst",
        alert_ids: [a.id],
        revision: c.revision + 1,
      });
      a.case_id = c.id;
      ws.revision++;
      result = s;
    } else if (path.includes("/cases/") && method === "PATCH") {
      if (body.revision !== ws.cases[0].revision) return json({message:"Case changed in another tab. Your draft is retained."},409);
      Object.assign(ws.cases[0], body);
      ws.cases[0].revision++;
      if (body.start_playbook) ws.cases[0].playbook_started = true;
      if (body.complete_step)
        ws.cases[0].completed_steps.push(body.complete_step);
      ws.revision++;
      result = s;
    } else if (path.includes("/alerts/")) {
      const a = ws.alerts[0];
      Object.assign(a, body, {
        owner: "Review analyst",
        owner_id: "learner_review01",
      });
      if (body.comment) a.closure_comment = body.comment;
      a.revision++;
      ws.revision++;
      result = s;
    } else if (path.endsWith("/queries"))
      result = {
        events: body.query.includes("nomatch") ? [] : state.events,
        count: state.events.length,
      };
    else if (path.endsWith("/ai/retry")) {
      s.ai_unavailable = false;
      s.model_status = "ready";
      s.state_revision++;
      result = s;
    } else if (path.endsWith("/pause")) {
      if (s.mode === "assessment")
        return json({ message: "Assessment cannot pause" }, 403);
      s.paused = !s.paused;
      s.state_revision++;
      result = s;
    } else if (path.includes("/tools/"))
      result = {
        status: "stopped",
        desktop_os: "Windows",
        message: "Configure WINDOWS_BASE_IMAGE with a prepared Windows image.",
      };
    else if (path.endsWith("/worksheet")) {
      result = ws.worksheet ?? { revision:0, fields:{observation:"",hypothesis:"",supporting_evidence:"",contradicting_evidence:"",scope_uncertainty:"",action_impact:"",verification_handoff:""},evidence_ids:[],saved_at:null,saved_by:null };
    }
    else if (path === "/api/learning") result = {references:[],exercises:[]};
    else if (path.endsWith("/assistant")) result = { turns: [] };
    else result = s;
    return json(result);
  });
  return state;
}
