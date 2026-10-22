import { LogRowView, isTargetRequest } from "./format";
import { AiFootprint } from "./adversary";

/**
 * Workflow model for the live canvas. Pure derivation from emitted log facts.
 * Nothing here pre-highlights a suspect: the only "AI" styling comes from the Adversary Lens
 * footprint, which the caller passes in only when the lens is Coached (practice mode).
 *
 *   [AI adversary] -> Source IP -> Session -> API gateway -> Route -> Protected asset
 *                                                   \-> Refused (4xx)
 *                                    [Your response] ->/
 */
export const FLOW_W = 1120;
export const FLOW_H = 376;

const CY = 182;
const STEP = 84;
const COLS = { ai: 64, ip: 236, session: 412, gateway: 616, route: 826, sink: 1036 } as const;

export type FlowKind = "ai" | "ip" | "session" | "gateway" | "route" | "refused" | "asset" | "response";
export type IconKey = "bot" | "globe" | "key" | "shield" | "login" | "file" | "lock" | "ban" | "filelock" | "zap";

export interface FlowNode {
  id: string;
  kind: FlowKind;
  label: string;
  sub: string;
  x: number;
  y: number;
  r: number;
  icon: IconKey;
  /** Requests that passed through this node (AI node: requests attributed to the AI). */
  count: number;
  /** Latest request time through the node (epoch ms), 0 if none yet. */
  lastMs: number;
  /** Row filter equivalent to "everything this node touched". */
  filter?: { key: "session" | "ip" | "path"; value: string };
  vault?: boolean;
  /** Attributed to the AI by the Adversary Lens (Coached only). */
  ai?: boolean;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  kind: "traffic" | "ai" | "response";
  ok: number;
  denied: number;
  lastSeq: number;
  lastMs: number;
  lastDenied: boolean;
  ai?: boolean;
}

export interface Flow {
  nodes: FlowNode[];
  edges: FlowEdge[];
  byId: Map<string, FlowNode>;
  hasIps: boolean;
  stages: Array<{ label: string; x: number }>;
}

export type RouteKey = "route:/session" | "route:/docs" | "route:/vault";

export function routeOf(r: LogRowView): RouteKey {
  if (r.restricted) return "route:/vault";
  if (r.path.startsWith("/api/v1/session")) return "route:/session";
  return "route:/docs";
}

const ROUTES: Array<{ id: RouteKey; label: string; sub: string; icon: IconKey; vault?: boolean; path: string }> = [
  { id: "route:/session", label: "/session", sub: "sign-in state", icon: "login", path: "/api/v1/session*" },
  { id: "route:/docs", label: "/docs", sub: "shared files", icon: "file", path: "/api/v1/docs*" },
  { id: "route:/vault", label: "/vault", sub: "restricted", icon: "lock", vault: true, path: "/api/v1/vault*" },
];

const isRefused = (r: LogRowView) => r.status !== null && r.status >= 400;

function rowsY(n: number): number[] {
  if (n <= 0) return [];
  const step = n > 1 ? Math.min(STEP, (STEP * 3) / (n - 1)) : STEP;
  return Array.from({ length: n }, (_, i) => CY + (i - (n - 1) / 2) * step);
}

/** Push nodes apart vertically so circles and their labels never overlap. */
function relax(ys: number[], min = 84): number[] {
  const out = [...ys];
  for (let i = 1; i < out.length; i++) if (out[i] - out[i - 1] < min) out[i] = out[i - 1] + min;
  return out;
}

export interface FlowInput {
  rows: LogRowView[];
  protectedId: string;
  /** Coached-lens footprint, or null when the lens is Blind. */
  ai: AiFootprint | null;
  /** Short verb under the AI node ("Planning…", "Listing files"). */
  aiSub?: string;
  /** Latest applied containment, if any. */
  response?: { label: string; session: string } | null;
}

export function deriveFlow(input: FlowInput): Flow {
  const reqs = input.rows.filter(isTargetRequest);
  const sessions: string[] = [];
  const sessionUser = new Map<string, string>();
  const ips: string[] = [];
  const ipFirst = new Map<string, number>();
  const ipSession = new Map<string, number>();
  const edgeMap = new Map<string, FlowEdge>();
  const nodeCount = new Map<string, number>();
  const nodeLast = new Map<string, number>();
  const aiRows = input.ai?.rowIds ?? new Set<string>();

  const touch = (id: string, ms: number) => {
    nodeCount.set(id, (nodeCount.get(id) ?? 0) + 1);
    nodeLast.set(id, Math.max(nodeLast.get(id) ?? 0, ms));
  };

  const bump = (from: string, to: string, kind: FlowEdge["kind"], denied: boolean, r: LogRowView, ai = false) => {
    const id = `${from}>${to}`;
    let e = edgeMap.get(id);
    if (!e) {
      e = { id, from, to, kind, ok: 0, denied: 0, lastSeq: 0, lastMs: 0, lastDenied: false, ai };
      edgeMap.set(id, e);
    }
    if (denied) e.denied += 1;
    else e.ok += 1;
    if (r.seq >= e.lastSeq) {
      e.lastSeq = r.seq;
      e.lastMs = r.ms;
      e.lastDenied = denied;
    }
  };

  for (const r of reqs) {
    if (!sessions.includes(r.session)) {
      sessions.push(r.session);
      sessionUser.set(r.session, r.user);
    }
    const denied = isRefused(r);
    const sid = `session:${r.session}`;
    const isAi = aiRows.has(r.id);
    if (r.ip) {
      const ipId = `ip:${r.ip}`;
      if (!ips.includes(r.ip)) {
        ips.push(r.ip);
        ipFirst.set(r.ip, r.ms);
        ipSession.set(r.ip, sessions.indexOf(r.session));
      }
      bump(ipId, sid, "traffic", denied, r, input.ai?.ips.includes(r.ip) ?? false);
      touch(ipId, r.ms);
    }
    bump(sid, "gateway", "traffic", denied, r);
    touch(sid, r.ms);
    touch("gateway", r.ms);
    if (denied) {
      bump("gateway", "refused", "traffic", true, r);
      touch("refused", r.ms);
    } else {
      const rt = routeOf(r);
      bump("gateway", rt, "traffic", false, r);
      touch(rt, r.ms);
      if (rt === "route:/vault" && r.event.resource_id === input.protectedId) {
        bump(rt, "asset", "traffic", false, r);
        touch("asset", r.ms);
      }
    }
    if (isAi) touch("ai", r.ms);
  }

  const aiIps = new Set(input.ai?.ips ?? []);
  const aiSessions = new Set(input.ai?.sessions ?? []);

  // ---- positions
  const orderedIps = [...ips].sort(
    (a, b) => (ipSession.get(a) ?? 0) - (ipSession.get(b) ?? 0) || (ipFirst.get(a) ?? 0) - (ipFirst.get(b) ?? 0)
  );
  const ipYs = rowsY(orderedIps.length);
  const ipY = new Map(orderedIps.map((ip, i) => [ip, ipYs[i]]));

  const sessionRaw = sessions.map((s) => {
    const mine = orderedIps.filter((ip) => sessions[ipSession.get(ip) ?? -1] === s || edgeMap.has(`ip:${ip}>session:${s}`));
    const ys = mine.map((ip) => ipY.get(ip) ?? CY);
    return { s, y: ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : 0, has: ys.length > 0 };
  });
  let sessionYs: number[];
  if (sessionRaw.every((x) => x.has)) {
    const sorted = [...sessionRaw].sort((a, b) => a.y - b.y);
    const relaxed = relax(sorted.map((x) => x.y));
    // Re-centre if the relaxation pushed the group down.
    const shift = relaxed.length ? (relaxed[0] - sorted[0].y + (relaxed[relaxed.length - 1] - sorted[sorted.length - 1].y)) / 2 : 0;
    const map = new Map(sorted.map((x, i) => [x.s, relaxed[i] - shift]));
    sessionYs = sessions.map((s) => map.get(s) ?? CY);
  } else {
    sessionYs = rowsY(sessions.length);
  }

  const nodes: FlowNode[] = [];
  const push = (n: Omit<FlowNode, "count" | "lastMs"> & { count?: number; lastMs?: number }) =>
    nodes.push({ count: nodeCount.get(n.id) ?? 0, lastMs: nodeLast.get(n.id) ?? 0, ...n });

  if (input.ai) {
    push({
      id: "ai",
      kind: "ai",
      label: "AI adversary",
      sub: input.aiSub ?? "",
      x: COLS.ai,
      y: CY,
      r: 34,
      icon: "bot",
      count: input.ai.requests,
      lastMs: nodeLast.get("ai") ?? 0,
    });
  }
  orderedIps.forEach((ip) => {
    const first = new Date(ipFirst.get(ip) ?? 0);
    const hh = String(first.getUTCHours()).padStart(2, "0");
    const mm = String(first.getUTCMinutes()).padStart(2, "0");
    push({
      id: `ip:${ip}`,
      kind: "ip",
      label: ip,
      sub: `first seen ${hh}:${mm}`,
      x: COLS.ip,
      y: ipY.get(ip) ?? CY,
      r: 24,
      icon: "globe",
      filter: { key: "ip", value: ip },
      ai: aiIps.has(ip),
    });
  });
  sessions.forEach((s, i) => {
    push({
      id: `session:${s}`,
      kind: "session",
      label: s,
      sub: sessionUser.get(s) ?? "",
      x: COLS.session,
      y: sessionYs[i],
      r: 26,
      icon: "key",
      filter: { key: "session", value: s },
      ai: aiSessions.has(s),
    });
  });

  const ry = rowsY(4);
  push({ id: "gateway", kind: "gateway", label: "API gateway", sub: "checks every request", x: COLS.gateway, y: CY, r: 38, icon: "shield" });
  ROUTES.forEach((rt, i) =>
    push({
      id: rt.id,
      kind: "route",
      label: rt.label,
      sub: rt.sub,
      x: COLS.route,
      y: ry[i],
      r: 26,
      icon: rt.icon,
      vault: rt.vault,
      filter: { key: "path", value: rt.path },
    })
  );
  push({ id: "refused", kind: "refused", label: "Refused", sub: "turned away (4xx)", x: COLS.route, y: ry[3], r: 26, icon: "ban" });
  push({ id: "asset", kind: "asset", label: input.protectedId, sub: "protected file", x: COLS.sink, y: ry[2], r: 26, icon: "filelock", vault: true });
  if (input.response) {
    push({ id: "response", kind: "response", label: "Your response", sub: input.response.label, x: COLS.gateway, y: ry[3], r: 26, icon: "zap" });
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));

  // ---- AI and response edges
  const edges = [...edgeMap.values()].filter((e) => byId.has(e.from) && byId.has(e.to));
  if (input.ai) {
    const targets = input.ai.ips.length ? input.ai.ips.map((ip) => ({ id: `ip:${ip}`, n: input.ai!.perIp.get(ip) ?? 0 })) : input.ai.sessions.map((s) => ({ id: `session:${s}`, n: 0 }));
    for (const t of targets) {
      if (!byId.has(t.id)) continue;
      edges.push({ id: `ai>${t.id}`, from: "ai", to: t.id, kind: "ai", ok: t.n, denied: 0, lastSeq: 0, lastMs: nodeLast.get("ai") ?? 0, lastDenied: false, ai: true });
    }
  }
  if (input.response) {
    edges.push({ id: "response>gateway", from: "response", to: "gateway", kind: "response", ok: 0, denied: 0, lastSeq: 0, lastMs: 0, lastDenied: false });
  }

  const stages = [
    ...(input.ai ? [{ label: "Adversary", x: COLS.ai }] : []),
    ...(ips.length ? [{ label: "Source IP", x: COLS.ip }] : []),
    { label: "Session", x: COLS.session },
    { label: "Authorize", x: COLS.gateway },
    { label: "Route", x: COLS.route },
    { label: "Outcome", x: COLS.sink },
  ];
  return { nodes, edges, byId, hasIps: ips.length > 0, stages };
}

/** Smooth horizontal-handle bezier between two node centres (n8n style). Nodes cover the ends. */
export function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, dy = 0): string {
  const xm = (a.x + b.x) / 2;
  return `M${a.x} ${a.y + dy} C${xm} ${a.y + dy} ${xm} ${b.y + dy} ${b.x} ${b.y + dy}`;
}

export function edgeMid(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function edgeWidth(count: number): number {
  return 1.6 + Math.min(3.2, Math.log2(count + 1) * 0.6);
}

/** Node ids a single request travels through, in order. Empty when the structure is not on screen. */
export function packetChain(flow: Flow, r: LogRowView, ai: AiFootprint | null, protectedId: string): string[] {
  const chain: string[] = [];
  const isAi = !!ai?.rowIds.has(r.id);
  if (isAi && flow.byId.has("ai")) chain.push("ai");
  if (r.ip && flow.byId.has(`ip:${r.ip}`)) chain.push(`ip:${r.ip}`);
  chain.push(`session:${r.session}`, "gateway");
  if (isRefused(r)) chain.push("refused");
  else {
    const rt = routeOf(r);
    chain.push(rt);
    if (rt === "route:/vault" && r.event.resource_id === protectedId) chain.push("asset");
  }
  return chain.every((id) => flow.byId.has(id)) ? chain : [];
}

export function chainPath(flow: Flow, chain: string[]): string | null {
  if (chain.length < 2) return null;
  const pts = chain.map((id) => flow.byId.get(id)!);
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const xm = (a.x + b.x) / 2;
    d += ` C${xm} ${a.y} ${xm} ${b.y} ${b.x} ${b.y}`;
  }
  return d;
}

/** All nodes on any path through `id` (upstream and downstream), used for hover emphasis. */
export function connected(flow: Flow, id: string): Set<string> {
  const out = new Set<string>([id]);
  const walk = (start: string, dir: "from" | "to") => {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const e of flow.edges) {
        const [a, b] = dir === "to" ? [e.from, e.to] : [e.to, e.from];
        if (a === cur && !out.has(b)) {
          out.add(b);
          stack.push(b);
        }
      }
    }
  };
  walk(id, "to");
  walk(id, "from");
  return out;
}
