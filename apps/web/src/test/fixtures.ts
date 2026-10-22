import { EventEnvelope } from "../types/contracts";
import { LogRowView, toLogRow } from "../lib/format";

export const T0 = Date.parse("2026-10-22T07:00:00.000Z");

export interface EvOpts {
  seq: number;
  at?: number; // seconds after T0
  session?: string;
  actor?: string;
  ip?: string;
  method?: string;
  path?: string;
  status?: number;
  source?: EventEnvelope["source"];
  eventType?: EventEnvelope["event_type"];
  resource?: string;
  visible?: boolean;
  noNetwork?: boolean;
  outcome?: EventEnvelope["outcome"];
}

export function ev(o: EvOpts): EventEnvelope {
  const ts = new Date(T0 + (o.at ?? o.seq) * 1000).toISOString();
  const status = o.status ?? 200;
  const path = o.path ?? "/api/v1/docs";
  return {
    event_id: `evt_${String(o.seq).padStart(4, "0")}`,
    run_id: "run_test",
    sequence: o.seq,
    timestamp_utc: ts,
    visible_at_utc: ts,
    virtual_clock_sec: o.seq,
    source: o.source ?? "target-access",
    event_type: o.eventType ?? "document.list",
    actor_id: o.actor ?? "eli@northstar.test",
    session_handle: o.session ?? "sess_E1",
    resource_id: o.resource ?? "docs",
    outcome: o.outcome ?? (status >= 400 ? "denied" : "allowed"),
    correlation_id: `req_${String(o.seq).padStart(4, "0")}`,
    learner_visible: o.visible ?? true,
    network: o.noNetwork
      ? undefined
      : {
          src_ip: o.ip ?? "198.51.100.41",
          user_agent: "Mozilla/5.0",
          http_method: o.method ?? "GET",
          path,
          status_code: status,
          latency_ms: 12,
        },
  };
}

export function row(o: EvOpts): LogRowView {
  return toLogRow(ev(o));
}
