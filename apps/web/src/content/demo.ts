import { EventEnvelope } from "../types/contracts";
import { LogRowView, toRows } from "../lib/format";

/**
 * Static, benign-only sample used by the landing preview. It deliberately shows
 * no incident so the first screen never hints at the answer.
 */
const BASE = Date.parse("2026-10-22T06:56:00.000Z");

function evt(i: number, session: string, actor: string, ip: string, eventType: EventEnvelope["event_type"], path: string, resource: string, status: number): EventEnvelope {
  return {
    event_id: `evt_demo_${i}`,
    run_id: "demo",
    sequence: i,
    timestamp_utc: new Date(BASE + i * 7000).toISOString(),
    visible_at_utc: new Date(BASE + i * 7000).toISOString(),
    virtual_clock_sec: i * 7,
    source: "target-access",
    event_type: eventType,
    actor_id: actor,
    session_handle: session,
    resource_id: resource,
    outcome: status >= 400 ? "denied" : "allowed",
    correlation_id: `req_demo_${i}`,
    learner_visible: true,
    network: { src_ip: ip, user_agent: "Mozilla/5.0", http_method: "GET", path, status_code: status, latency_ms: 12 + i },
  };
}

export function demoRows(): LogRowView[] {
  const eli = ["sess_E1", "eli@northstar.test", "198.51.100.41"] as const;
  const priya = ["sess_P1", "priya@northstar.test", "198.51.100.77"] as const;
  const maya = ["sess_A", "maya@northstar.test", "198.51.100.23"] as const;
  return toRows([
    evt(1, ...eli, "session.inspect", "/api/v1/session", "session", 200),
    evt(2, ...priya, "document.list", "/api/v1/docs", "docs", 200),
    evt(3, ...maya, "session.inspect", "/api/v1/session", "session", 200),
    evt(4, ...eli, "document.access", "/api/v1/docs/q3_forecast.csv", "q3_forecast.csv", 200),
    evt(5, ...priya, "document.access", "/api/v1/docs/ops_roster.xlsx", "ops_roster.xlsx", 200),
    evt(6, ...maya, "document.list", "/api/v1/docs", "docs", 200),
    evt(7, ...eli, "document.list", "/api/v1/docs", "docs", 200),
  ]);
}
