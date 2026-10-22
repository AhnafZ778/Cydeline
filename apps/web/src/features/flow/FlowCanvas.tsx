import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "lucide-react";
import { LogRowView, isTargetRequest } from "../../lib/format";
import { Flow, FlowEdge, FlowNode, FLOW_H, FLOW_W, chainPath, connected, edgeMid, edgePath, edgeWidth, packetChain } from "../../lib/flow";
import { AiFootprint, AiState } from "../../lib/adversary";
import { ICONS } from "./icons";

const REDUCED =
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A node or edge counts as "live" when it handled a request within this much scenario time. */
const LIVE_MS = 14000;


interface Packet {
  id: number;
  d: string;
  tone: "ok" | "denied" | "ai";
}

function PacketDot({ packet }: { packet: Packet }) {
  const ref = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => {
    (ref.current as unknown as { beginElement?: () => void } | null)?.beginElement?.();
  }, []);
  const r = packet.tone === "ai" ? 6 : 4.5;
  return (
    <g className={`packet packet--${packet.tone}`} opacity="0">
      <circle className="packet__trail" r={r + 4} />
      <circle className="packet__dot" r={r} />
      <animateMotion ref={ref} begin="indefinite" dur="2.6s" fill="freeze" path={packet.d} />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.9;1" dur="2.6s" begin="indefinite" fill="freeze" />
    </g>
  );
}

function pillSize(text: string): number {
  return 14 + text.length * 6.4;
}

function Pill(props: { x: number; y: number; text: string; tone: "ok" | "denied" | "ai" }) {
  const w = pillSize(props.text);
  return (
    <g className={`epill epill--${props.tone}`} transform={`translate(${props.x} ${props.y})`} aria-hidden="true">
      <rect x={-w / 2} y={-9} width={w} height={18} rx={9} />
      <text y={4} textAnchor="middle">
        {props.text}
      </text>
    </g>
  );
}

export interface FlowCanvasProps {
  flow: Flow;
  rows: LogRowView[];
  nowMs: number;
  suspect: string | null;
  revokedSessions: string[];
  affectedIds: string[];
  selectedId: string | null;
  /** Present only when the Adversary Lens is Coached. */
  ai: { state: AiState; footprint: AiFootprint } | null;
  protectedId: string;
  onNode: (n: FlowNode) => void;
  onBackground: () => void;
  /** Static decorative preview (landing): no focus, no interaction, optional cropped viewBox. */
  preview?: { viewBox: string };
}

export function FlowCanvas(props: FlowCanvasProps) {
  const { flow } = props;
  const [packets, setPackets] = useState<Packet[]>([]);
  const [hover, setHover] = useState<FlowNode | null>(null);
  const [pulse, setPulse] = useState<string | null>(null);
  const lastSeq = useRef<number | null>(null);
  const prevRevoked = useRef<string[]>(props.revokedSessions);
  const animate = !REDUCED;
  const aiState = props.ai?.state ?? null;
  const acting = aiState === "acting";

  // One packet per fresh request, travelling the exact route the request took.
  useEffect(() => {
    const maxSeq = props.rows.reduce((m, r) => Math.max(m, r.seq), 0);
    if (lastSeq.current === null) {
      lastSeq.current = maxSeq;
      return;
    }
    const floor = lastSeq.current;
    lastSeq.current = maxSeq;
    if (!animate) return;
    const fresh = props.rows.filter((r) => r.seq > floor && isTargetRequest(r)).slice(-4);
    const created: Packet[] = [];
    for (const r of fresh) {
      const d = chainPath(flow, packetChain(flow, r, props.ai?.footprint ?? null, props.protectedId));
      if (!d) continue;
      const isAi = !!props.ai?.footprint.rowIds.has(r.id);
      created.push({ id: r.seq, d, tone: isAi ? "ai" : r.status !== null && r.status >= 400 ? "denied" : "ok" });
    }
    if (!created.length) return;
    setPackets((p) => [...p, ...created]);
    const timer = window.setTimeout(() => setPackets((p) => p.filter((x) => !created.some((c) => c.id === x.id))), 3000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.rows]);

  // Shield pulse when a session is revoked.
  useEffect(() => {
    const added = props.revokedSessions.filter((s) => !prevRevoked.current.includes(s));
    prevRevoked.current = props.revokedSessions;
    if (added.length && animate) {
      setPulse("gateway");
      const t = window.setTimeout(() => setPulse(null), 1200);
      return () => window.clearTimeout(t);
    }
  }, [props.revokedSessions, animate]);

  const focusId = hover?.id ?? null;
  const emphasis = useMemo(() => (focusId ? connected(flow, focusId) : null), [flow, focusId]);
  const live = (ms: number) => ms > 0 && props.nowMs - ms < LIVE_MS;

  const nodeClass = (n: FlowNode) => {
    const parts = ["fnode", `fnode--${n.kind === "route" && n.vault ? "vault" : n.kind}`];
    if (n.id === "ai") parts.push(`is-${aiState ?? "thinking"}`);
    else if (live(n.lastMs)) parts.push("is-live");
    if (n.ai) parts.push("is-ai");
    if (n.kind === "session" && props.suspect === n.filter?.value) parts.push("is-suspect");
    if (n.kind === "session" && props.revokedSessions.includes(n.filter?.value ?? "")) parts.push("is-revoked");
    if (props.affectedIds.includes(n.id)) parts.push("is-affected");
    if (props.selectedId === n.id) parts.push("is-selected");
    if (emphasis && !emphasis.has(n.id)) parts.push("is-dim");
    if (pulse === n.id) parts.push("is-pulse");
    return parts.join(" ");
  };

  const renderEdge = (e: FlowEdge) => {
    const a = flow.byId.get(e.from)!;
    const b = flow.byId.get(e.to)!;
    const mid = edgeMid(a, b);
    const dim = emphasis && !(emphasis.has(e.from) && emphasis.has(e.to));
    const isLive = animate && (e.kind === "ai" ? acting : live(e.lastMs) && e.kind === "traffic");
    const blocked = e.to === "gateway" && e.from.startsWith("session:") && props.revokedSessions.includes(e.from.slice(8));
    const cls = ["edge", `edge--${e.kind}`, e.ai ? "is-ai" : "", dim ? "is-dim" : "", blocked ? "is-blocked" : ""].filter(Boolean).join(" ");
    const showDenied = e.denied > 0 && (e.to === "gateway" || e.to === "refused");
    return (
      <g key={e.id} className={cls}>
        {(e.ok > 0 || e.kind !== "traffic") && (
          <path className="edge__base" strokeWidth={e.kind === "traffic" ? edgeWidth(e.ok) : e.kind === "ai" ? 2.2 : 2.4} d={edgePath(a, b)} />
        )}
        {e.denied > 0 && <path className="edge__denied" strokeWidth={edgeWidth(e.denied)} d={edgePath(a, b, e.ok > 0 ? 4 : 0)} />}
        {isLive && e.ok > 0 && <path className="edge__flow" d={edgePath(a, b)} />}
        {isLive && e.kind === "ai" && <path className="edge__flow" d={edgePath(a, b)} />}
        {e.kind === "traffic" && e.ok > 0 && <Pill x={mid.x} y={mid.y} text={String(e.ok)} tone={e.ai ? "ai" : "ok"} />}
        {e.kind === "ai" && e.ok > 0 && <Pill x={mid.x} y={mid.y} text={String(e.ok)} tone="ai" />}
        {showDenied && <Pill x={mid.x} y={mid.y + (e.ok > 0 ? 17 : 0)} text={`${e.denied} refused`} tone="denied" />}
      </g>
    );
  };

  const renderNode = (n: FlowNode) => {
    const Icon = ICONS[n.icon];
    const sz = Math.round(n.r * 0.82);
    const isRevoked = n.kind === "session" && props.revokedSessions.includes(n.filter?.value ?? "");
    const isSuspect = n.kind === "session" && props.suspect === n.filter?.value;
    const sub = isRevoked ? `${n.sub} · revoked` : isSuspect ? `${n.sub} · suspect` : n.sub;
    const hasLeft = n.kind !== "ai" && n.kind !== "response";
    const hasRight = n.kind !== "asset" && n.kind !== "refused" && n.kind !== "response";
    const activate = () => props.onNode(n);
    const mono = n.kind === "ip" || n.kind === "session" || n.kind === "asset";
    const summary =
      n.kind === "ai"
        ? `${n.label}, ${aiState ?? "thinking"}`
        : `${n.label}, ${n.count} request${n.count === 1 ? "" : "s"}`;
    // The focusable button owns only the shapes and carries the accessible name; the visible text sits beside it
    // (decorative, aria-hidden) so the name never disagrees with on-screen text (WCAG 2.5.3).
    return (
      <g
        key={n.id}
        className={nodeClass(n)}
        transform={`translate(${n.x} ${n.y})`}
        onClick={(ev) => {
          ev.stopPropagation();
          activate();
        }}
        onMouseEnter={() => setHover(n)}
        onMouseLeave={() => setHover(null)}
      >
        <g
          className="fnode__hit"
          tabIndex={props.preview ? undefined : 0}
          role={props.preview ? undefined : "button"}
          aria-pressed={props.preview ? undefined : props.selectedId === n.id}
          aria-label={props.preview ? undefined : `${summary}${sub ? `, ${sub}` : ""}. Open details.`}
          data-testid="flow-node"
          data-node={n.id}
          onKeyDown={(ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              activate();
            }
          }}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(null)}
        >
          <circle className="fnode__halo" r={n.r + 12} />
          <circle className="fnode__ring" r={n.r + 7} />
          <circle className="fnode__select" r={n.r + 9} />
          <circle className="fnode__disc" r={n.r} />
          <Icon className="fnode__icon" x={-sz / 2} y={-sz / 2} width={sz} height={sz} strokeWidth={1.7} aria-hidden="true" />
          {hasLeft && <circle className="fnode__port" cx={-n.r} cy={0} r={3.5} />}
          {hasRight && <circle className="fnode__port" cx={n.r} cy={0} r={3.5} />}
          {n.kind === "response" && <circle className="fnode__port" cx={0} cy={-n.r} r={3.5} />}
          {n.kind === "gateway" && flow.byId.has("response") && <circle className="fnode__port" cx={0} cy={n.r} r={3.5} />}
        </g>
        <g aria-hidden="true">
          {n.count > 0 && n.kind !== "response" && (
            <g className="fnode__badge" transform={`translate(${n.r * 0.74} ${-n.r * 0.74})`}>
              <circle r={9.5} />
              <text y={3.6} textAnchor="middle">
                {n.count > 999 ? "999+" : n.count}
              </text>
            </g>
          )}
          {n.ai && n.kind !== "ai" && (
            <g className="fnode__tag fnode__tag--ai" transform={`translate(${-n.r * 0.74} ${-n.r * 0.74})`}>
              <circle r={9.5} />
              <text y={3.2} textAnchor="middle">
                AI
              </text>
            </g>
          )}
          {isSuspect && (
            <g className="fnode__tag fnode__tag--you" transform={`translate(${-n.r * 0.74} ${n.r * 0.74})`}>
              <circle r={9.5} />
              <Flag x={-5} y={-5} width={10} height={10} strokeWidth={2.4} />
            </g>
          )}
          <text className={`fnode__label ${mono ? "is-mono" : ""}`} y={n.r + 15} textAnchor="middle">
            {n.label}
          </text>
          {sub && (
            <text className="fnode__sub" y={n.r + 28} textAnchor="middle">
              {sub}
            </text>
          )}
        </g>
      </g>
    );
  };

  const edgesTraffic = flow.edges.filter((e) => e.kind === "traffic");
  const edgesOther = flow.edges.filter((e) => e.kind !== "traffic");

  return (
    <div className={`flow__stage ${props.preview ? "is-preview" : ""}`}>
      <svg
        viewBox={props.preview?.viewBox ?? `0 0 ${FLOW_W} ${FLOW_H}`}
        role={props.preview ? undefined : "group"}
        aria-hidden={props.preview ? true : undefined}
        aria-label={props.preview ? undefined : "Live workflow: requests travel from source address to session, through the API gateway, to a route or to Refused. Tab to a node and press Enter for details."}
        onClick={props.onBackground}
      >
        <defs>
          <pattern id="flow-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fffefc" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#dc2626" strokeWidth="1.6" opacity="0.55" />
          </pattern>
        </defs>
        {flow.stages.map((s) => (
          <text key={s.label} className="flow__col" x={s.x} y={20} textAnchor="middle">
            {s.label}
          </text>
        ))}
        {edgesTraffic.map(renderEdge)}
        {edgesOther.map(renderEdge)}
        {packets.map((p) => (
          <PacketDot key={p.id} packet={p} />
        ))}
        {flow.nodes.map(renderNode)}
      </svg>
      {hover && (
        <div className="flow__tip" aria-hidden="true">
          <strong>{hover.label}</strong>
          <span>{hover.kind === "ai" ? `AI adversary · ${aiState ?? "thinking"}` : `${hover.count} request${hover.count === 1 ? "" : "s"}`}</span>
          <em>Click for details</em>
        </div>
      )}
    </div>
  );
}
