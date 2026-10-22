import { LogRowView, isTargetRequest } from "./format";
import { FlowNode, routeOf } from "./flow";
import { AiFootprint } from "./adversary";

export interface Stat {
  label: string;
  value: string;
  tone?: "coral" | "teal";
}

export interface NodeFacts {
  rows: LogRowView[];
  stats: Stat[];
  /** Plain observations drawn from the logs. Facts only, never a verdict. */
  notes: string[];
}

const refused = (r: LogRowView) => r.status !== null && r.status >= 400;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const hm = (ms: number) => new Date(ms).toISOString().slice(11, 19);

/** Rows that passed through a node. */
export function rowsThrough(node: FlowNode, all: LogRowView[], ai: AiFootprint | null, protectedId: string): LogRowView[] {
  const reqs = all.filter(isTargetRequest);
  switch (node.kind) {
    case "ip":
      return reqs.filter((r) => r.ip === node.filter?.value);
    case "session":
      return reqs.filter((r) => r.session === node.filter?.value);
    case "gateway":
      return reqs;
    case "route":
      return reqs.filter((r) => !refused(r) && routeOf(r) === node.id);
    case "refused":
      return reqs.filter(refused);
    case "asset":
      return reqs.filter((r) => !refused(r) && r.event.resource_id === protectedId && r.restricted);
    case "ai":
      return reqs.filter((r) => ai?.rowIds.has(r.id));
    case "response":
      return all.filter((r) => r.source.startsWith("control-"));
  }
}

export function factsFor(node: FlowNode, all: LogRowView[], ai: AiFootprint | null, protectedId: string): NodeFacts {
  const rows = rowsThrough(node, all, ai, protectedId);
  const bad = rows.filter(refused).length;
  const stats: Stat[] = [];
  const notes: string[] = [];
  if (node.kind !== "response") {
    stats.push({ label: "Requests", value: String(rows.length) });
    if (node.kind !== "refused" && node.kind !== "asset" && node.kind !== "route") {
      stats.push({ label: "Allowed", value: String(rows.length - bad), tone: "teal" });
      stats.push({ label: "Refused", value: String(bad), tone: bad ? "coral" : undefined });
    }
  }
  if (rows.length) {
    stats.push({ label: "First seen", value: hm(rows[0].ms) });
    stats.push({ label: "Last seen", value: hm(rows[rows.length - 1].ms) });
  }

  if (node.kind === "session") {
    const ips = uniq(rows.map((r) => r.ip).filter((x): x is string => !!x));
    const uas = uniq(rows.map((r) => r.ua).filter((x): x is string => !!x));
    stats.push({ label: "Source IPs", value: String(ips.length || "-") });
    if (ips.length) notes.push(`Seen from ${ips.length} source address${ips.length > 1 ? "es" : ""}: ${ips.join(", ")}`);
    if (uas.length) notes.push(`Client${uas.length > 1 ? "s" : ""}: ${uas.map((u) => u.split(" ")[0]).join(", ")}`);
    const routes = uniq(rows.filter((r) => !refused(r)).map((r) => routeOf(r).replace("route:", "")));
    if (routes.length) notes.push(`Reached: ${routes.join(", ")}`);
  } else if (node.kind === "ip") {
    const ss = uniq(rows.map((r) => r.session));
    const uas = uniq(rows.map((r) => r.ua).filter((x): x is string => !!x));
    stats.push({ label: "Sessions", value: String(ss.length) });
    if (ss.length) notes.push(`Used by: ${ss.join(", ")}`);
    if (uas.length) notes.push(`Client${uas.length > 1 ? "s" : ""}: ${uas.map((u) => u.split(" ")[0]).join(", ")}`);
  } else if (node.kind === "gateway") {
    stats.push({ label: "Sessions", value: String(uniq(rows.map((r) => r.session)).length) });
    stats.push({ label: "Source IPs", value: String(uniq(rows.map((r) => r.ip).filter(Boolean)).length || "-") });
  } else if (node.kind === "route" || node.kind === "asset") {
    stats.push({ label: "Sessions", value: String(uniq(rows.map((r) => r.session)).length) });
    const ss = uniq(rows.map((r) => r.session));
    if (ss.length) notes.push(`Used by: ${ss.join(", ")}`);
  } else if (node.kind === "refused") {
    const codes = new Map<number, number>();
    for (const r of rows) if (r.status !== null) codes.set(r.status, (codes.get(r.status) ?? 0) + 1);
    const top = [...codes.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} \u00d7${n}`);
    if (top.length) notes.push(`Status codes: ${top.join(", ")}`);
    const ss = uniq(rows.map((r) => r.session));
    if (ss.length) notes.push(`Sessions refused: ${ss.join(", ")}`);
  } else if (node.kind === "ai") {
    if (ai?.ips.length) notes.push(`Seen on: ${ai.ips.join(", ")}`);
    if (ai?.sessions.length) notes.push(`Acting through: ${ai.sessions.join(", ")}`);
  } else if (node.kind === "response") {
    notes.push(`Applied at ${rows.length ? hm(rows[rows.length - 1].ms) : "-"} UTC`);
  }
  return { rows, stats, notes };
}
