import { EventEnvelope } from "../types/contracts";

export type Level = "INFO" | "WARN" | "ERROR" | "NOTICE";

/** One access-log line, derived only from emitted event facts. No interpretation. */
export interface LogRowView {
  id: string;
  seq: number;
  /** Epoch ms of the event (scenario time). */
  ms: number;
  time: string; // HH:MM:SS.mmm (UTC)
  level: Level;
  source: string;
  method: string;
  path: string;
  status: number | null;
  session: string;
  user: string;
  ip: string | null;
  latency: string | null;
  rid: string;
  ua: string | null;
  bytes: number | null;
  restricted: boolean;
  eventType: string;
  outcome: string;
  event: EventEnvelope;
}

export function levelFor(source: string, status: number | null): Level {
  if (source.startsWith("control-") || source === "defender" || source === "system" || source === "model") return "NOTICE";
  if (status !== null && status >= 500) return "ERROR";
  if (status !== null && status >= 400) return "WARN";
  return "INFO";
}

function httpStatus(outcome: string | null | undefined): number | null {
  if (outcome === "denied") return 403;
  if (outcome === "failed" || outcome === "error") return 500;
  if (outcome === "stopped" || outcome === "none" || outcome === "unknown" || outcome == null) return null;
  return 200;
}

function derivedHttp(e: EventEnvelope): { method: string; path: string; status: number | null } {
  const status = httpStatus(e.outcome);
  const resource = e.resource_id || "-";
  switch (e.event_type) {
    case "session.inspect":
    case "session.status":
      return { method: "GET", path: "/api/v1/session", status };
    case "document.list":
      return { method: "GET", path: "/api/v1/docs", status };
    case "document.access":
    case "benign.workflow":
      return { method: "GET", path: `/api/v1/docs/${resource}`, status };
    case "session.test":
      return { method: "HEAD", path: `/api/v1/docs/${resource}`, status };
    case "defender.action":
    case "session.revoked":
    case "session.reauth_required":
    case "account.disabled":
    case "account.restored":
      return { method: "POST", path: `/control/${resource}`, status };
    case "recovery.verify":
    case "verification.check":
      return { method: "GET", path: `/api/v1/docs/${resource}`, status };
    default:
      return { method: "-", path: resource, status };
  }
}

export function hms(ms: number, withMillis = true): string {
  const d = new Date(ms);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  const base = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
  return withMillis ? `${base}.${p(d.getUTCMilliseconds(), 3)}` : base;
}

export function toLogRow(e: EventEnvelope): LogRowView {
  const net = e.network;
  const http = net
    ? { method: net.http_method, path: net.path, status: net.status_code as number | null }
    : derivedHttp(e);
  const ms = Date.parse(e.timestamp_utc);
  const resource = e.resource_id ?? "";
  const restricted = http.path.includes("/vault") || resource.startsWith("doc_finance");
  return {
    id: e.event_id,
    seq: e.sequence,
    ms,
    time: hms(ms),
    level: levelFor(e.source, http.status),
    source: e.source,
    method: http.method,
    path: http.path,
    status: http.status,
    session: e.session_handle ?? "",
    user: (e.actor_id ?? "").split("@")[0],
    ip: net?.src_ip ?? null,
    latency: net ? `${net.latency_ms}ms` : null,
    rid: e.correlation_id,
    ua: net?.user_agent ?? null,
    bytes: net?.bytes ?? null,
    restricted,
    eventType: e.event_type,
    outcome: e.outcome ?? "",
    event: e,
  };
}

export function toRows(events: EventEnvelope[]): LogRowView[] {
  return events
    .filter((e) => e.learner_visible)
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map(toLogRow);
}

export function statusClass(status: number | null): string {
  if (status === null) return "";
  if (status >= 500) return "status--5xx";
  if (status === 403 || status === 401) return "status--denied";
  if (status >= 400) return "status--4xx";
  return "";
}

/** Is this a request to the target (as opposed to a control-plane audit/probe line)? */
export function isTargetRequest(r: LogRowView): boolean {
  return r.source === "target-access" || r.source === "target-auth";
}
