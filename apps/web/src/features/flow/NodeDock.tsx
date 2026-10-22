import { useEffect, useRef } from "react";
import { Filter, UserRoundSearch, X } from "lucide-react";
import { AgentDecisionMeta, DefenderActionReceipt } from "../../types/contracts";
import { LogRowView, statusClass } from "../../lib/format";
import { FlowNode } from "../../lib/flow";
import { NodeFacts } from "../../lib/nodeinfo";
import { NODE_LESSON } from "../../content/nodes";
import { AiState, describeMove, provenance } from "../../lib/adversary";
import { Term } from "../../lib/query";
import { ICONS } from "./icons";

export function filterTermFor(node: FlowNode): Term | null {
  if (node.filter) return { ...node.filter, negate: false };
  if (node.kind === "refused") return { key: "status", value: "4xx", negate: false };
  if (node.kind === "asset") return { key: "path", value: "/api/v1/vault*", negate: false };
  return null;
}

export function NodeDock(props: {
  node: FlowNode;
  facts: NodeFacts;
  aiState: AiState | null;
  decisions: AgentDecisionMeta[];
  receipt: DefenderActionReceipt | null;
  suspect: string | null;
  canMark: boolean;
  /** After-action study: hide live actions such as filtering the log console. */
  study?: boolean;
  onFilter: (t: Term) => void;
  onMark: (session: string) => void;
  onClearMark: () => void;
  onOpenRow: (id: string) => void;
  onClose: () => void;
}) {
  const { node, facts } = props;
  const lesson = NODE_LESSON[node.kind];
  const Icon = ICONS[node.icon];
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    head.current?.focus({ preventScroll: true });
  }, [node.id]);

  const term = filterTermFor(node);
  const session = node.kind === "session" ? node.filter?.value ?? null : null;
  const marked = !!session && props.suspect === session;
  const recent = facts.rows.slice(-5).reverse();

  return (
    <section className={`dock dock--${node.kind === "route" && node.vault ? "vault" : node.kind}`} aria-label={`Details for ${node.label}`} data-testid="node-dock">
      <header className="dock__head">
        <span className="dock__icon" aria-hidden="true">
          <Icon className="icon" />
        </span>
        <div className="dock__title">
          <span className="eyebrow">{lesson.stage}{lesson.kind !== node.label && lesson.kind !== lesson.stage ? ` · ${lesson.kind}` : ""}</span>
          <h3 ref={head} tabIndex={-1} className={node.kind === "ip" || node.kind === "session" || node.kind === "asset" ? "mono" : undefined}>
            {node.label}
            {node.sub && <small>{node.sub}</small>}
          </h3>
        </div>
        <div className="dock__actions">
          {term && !props.study && (
            <button className="btn btn--sm" onClick={() => props.onFilter(term)} data-testid="dock-filter">
              <Filter className="icon" /> Filter logs to this
            </button>
          )}
          {session && !marked && props.canMark && (
            <button className="btn btn--sm btn--primary" onClick={() => props.onMark(session)} data-testid="mark-suspect">
              <UserRoundSearch className="icon" /> Mark as suspect
            </button>
          )}
          {marked && props.canMark && (
            <button className="btn btn--ghost btn--sm" onClick={props.onClearMark}>
              Clear suspect
            </button>
          )}
          <button className="btn btn--ghost btn--icon btn--sm" aria-label="Close details" onClick={props.onClose}>
            <X className="icon" />
          </button>
        </div>
      </header>

      <div className="dock__body">
        <div className="dock__col">
          <div className="eyebrow section-label">What is this?</div>
          <p>{lesson.what}</p>
          <div className="eyebrow section-label">Ask yourself</div>
          <ul className="dock__ask">
            {lesson.ask.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>

        <div className="dock__col">
          {node.kind === "ai" ? (
            <>
              <div className="eyebrow section-label">Its moves{props.aiState ? ` · ${props.aiState === "acting" ? "acting now" : props.aiState}` : ""}</div>
              <ol className="moves">
                {props.decisions.length === 0 && <li className="muted">No move yet.</li>}
                {props.decisions.map((d) => {
                  const m = describeMove(d);
                  return (
                    <li key={d.step}>
                      <span className="n">{d.step}</span>
                      <span>
                        <strong>{m.pill}</strong> · {m.role}
                        <em>{m.say}</em>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {props.decisions.length > 0 && (
                <p className="muted dock__prov">
                  {props.study
                    ? "Revealed because the run is over. This is how the adversary moved, not a hint you had during the shift."
                    : `${provenance(props.decisions[props.decisions.length - 1])}. Practice mode only; the lens never affects your score.`}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="eyebrow section-label">From the logs</div>
              {facts.stats.length > 0 && (
                <dl className="dock__stats">
                  {facts.stats.map((s) => (
                    <div key={s.label}>
                      <dt>{s.label}</dt>
                      <dd className={s.tone ? `is-${s.tone}` : undefined}>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {node.kind === "response" && props.receipt && (
                <p className="dock__note">
                  <strong>{props.receipt.action.replace(/_/g, " ")}</strong> on <span className="mono">{props.receipt.target_handle}</span>. {props.receipt.message}
                </p>
              )}
              {facts.notes.length > 0 && (
                <ul className="dock__notes">
                  {facts.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
              {facts.stats.length === 0 && facts.notes.length === 0 && <p className="muted">Nothing has passed through yet.</p>}
            </>
          )}
        </div>

        <div className="dock__col">
          <div className="eyebrow section-label">{node.kind === "response" ? "Control events" : "Recent requests"}</div>
          {recent.length === 0 ? (
            <p className="muted">No lines yet.</p>
          ) : (
            <div className="dock__recent">
              {recent.map((r: LogRowView) => (
                <button key={r.id} onClick={() => props.onOpenRow(r.id)} title="Open this line in the inspector">
                  <span>{r.time.slice(0, 8)}</span>
                  <span className={`status ${statusClass(r.status)}`}>{r.status ?? "-"}</span>
                  <span className="dock__path">
                    {r.method} {r.path}
                  </span>
                  <span className="dock__ip">{r.ip ?? r.session}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
