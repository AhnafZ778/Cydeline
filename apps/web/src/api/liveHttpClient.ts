import {
  adaptDeclaration,
  adaptDebrief,
  adaptEvents,
  adaptReceipt,
  adaptReplay,
  adaptSnapshot,
  adaptVerification,
} from "../lib/contractAdapt";
import {
  ControlPlaneClient,
  DeclarationRecord,
  DefenderAction,
  DefenderActionReceipt,
  EventEnvelope,
  Mode,
  RunStatusSnapshot,
  VerificationResponse,
} from "../types/contracts";

/**
 * LiveHttpControlClient — Production REST + SSE adapter for Saad's `apps/control-api/`.
 * Implements the exact 11 endpoints in `01_PRODUCT_REQUIREMENTS_DOCUMENT.md` Section 8.4.
 */
export class LiveHttpControlClient implements ControlPlaneClient {
  public readonly modeLabel = "Live FastAPI Control Plane" as const;
  private baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      ...init,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `HTTP ${res.status} on ${path}`);
    }
    return res.json() as Promise<T>;
  }

  public async createAndStartRun(mode: Mode): Promise<RunStatusSnapshot> {
    const created = await this.request<{ run_id: string }>("/runs", {
      method: "POST",
      body: JSON.stringify({ scenario_version: "v1", mode }),
    });
    await this.request(`/runs/${created.run_id}/start`, { method: "POST" });
    return this.getSnapshot(created.run_id);
  }

  public async getSnapshot(runId: string): Promise<RunStatusSnapshot> {
    const [run, events] = await Promise.all([
      this.request<Parameters<typeof adaptSnapshot>[0]>(`/runs/${runId}`),
      this.getEvents(runId),
    ]);
    return adaptSnapshot(run, events);
  }

  public async getEvents(runId: string): Promise<EventEnvelope[]> {
    const data = await this.request<{ events: Parameters<typeof adaptEvents>[0] }>(`/runs/${runId}/events`);
    return adaptEvents(data.events ?? []);
  }

  public async stepSimulationTurn(runId: string): Promise<{
    snapshot: RunStatusSnapshot;
    newEvents: EventEnvelope[];
  }> {
    const [snapshot, events] = await Promise.all([
      this.getSnapshot(runId),
      this.getEvents(runId),
    ]);
    return { snapshot, newEvents: events };
  }

  public async declareIncident(
    runId: string,
    payload: {
      suspected_actor: string;
      suspected_session: string;
      evidence_event_ids: string[];
      rationale: string;
    }
  ): Promise<{ declaration: DeclarationRecord; snapshot: RunStatusSnapshot }> {
    const body = await this.request<Parameters<typeof adaptDeclaration>[0]>(`/runs/${runId}/declare`, {
      method: "POST",
      body: JSON.stringify({
        suspected_actor: payload.suspected_actor,
        suspected_session: payload.suspected_session,
        rationale: payload.rationale,
        event_ids: payload.evidence_event_ids,
      }),
    });
    return { declaration: adaptDeclaration(body), snapshot: await this.getSnapshot(runId) };
  }

  public async applyDefenderAction(
    runId: string,
    payload: {
      action: DefenderAction;
      target_handle: string;
      idempotency_key: string;
    }
  ): Promise<{ receipt: DefenderActionReceipt; snapshot: RunStatusSnapshot; event: EventEnvelope }> {
    const body = await this.request<Parameters<typeof adaptReceipt>[0]>(`/runs/${runId}/defender-actions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const receipt = adaptReceipt(body);
    const events = await this.getEvents(runId);
    const event =
      [...events].reverse().find((e) => e.event_type === "session.revoked" || e.event_type === "defender.action" || e.event_type === "account.disabled") ??
      events[events.length - 1] ?? {
        event_id: receipt.action_id,
        run_id: receipt.run_id,
        sequence: events.length + 1,
        timestamp_utc: receipt.applied_at_utc,
        visible_at_utc: receipt.applied_at_utc,
        virtual_clock_sec: 0,
        source: "defender" as const,
        event_type: "session.revoked" as const,
        actor_id: "analyst",
        session_handle: receipt.target_handle,
        resource_id: receipt.action,
        outcome: "applied" as const,
        correlation_id: receipt.action_id,
        learner_visible: true,
      };
    return { receipt, snapshot: await this.getSnapshot(runId), event };
  }

  public async verifyRecovery(runId: string): Promise<{
    verification: VerificationResponse;
    snapshot: RunStatusSnapshot;
    events: EventEnvelope[];
  }> {
    const body = await this.request<Parameters<typeof adaptVerification>[0]>(`/runs/${runId}/verify`, {
      method: "POST",
    });
    return { verification: adaptVerification(body), snapshot: await this.getSnapshot(runId), events: await this.getEvents(runId) };
  }

  public async getDebrief(runId: string) {
    const body = await this.request<Parameters<typeof adaptDebrief>[0]>(`/runs/${runId}/debrief`);
    return adaptDebrief(body);
  }

  public async getReplay(runId: string) {
    const body = await this.request<Parameters<typeof adaptReplay>[0]>(`/runs/${runId}/replay`);
    return adaptReplay(body);
  }

  public async resetRun(runId: string, mode: Mode = "practice"): Promise<RunStatusSnapshot> {
    const run = await this.request<Parameters<typeof adaptSnapshot>[0]>(`/runs/${runId}/reset`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    });
    return adaptSnapshot(run, []);
  }
}
