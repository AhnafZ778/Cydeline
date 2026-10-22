import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Flag, Lightbulb, PanelLeft, PanelLeftClose } from "lucide-react";
import { BRIEF, CONCEPTS, FOCUS } from "../../content/guide";
import { ObjectiveState, PhaseKey } from "../../lib/phase";
import { Pivot } from "../../lib/query";

type Tab = "brief" | "objectives" | "concepts";

export function GuidePanel(props: {
  phase: PhaseKey;
  objectives: ObjectiveState[];
  collapsed: boolean;
  onToggle: () => void;
  onJump: (j: { pivot?: Pivot; query?: string }) => void;
}) {
  const [tab, setTab] = useState<Tab>("objectives");
  const [openConcept, setOpenConcept] = useState<string | null>(null);
  const focus = FOCUS[props.phase];
  const currentIdx = props.objectives.findIndex((o) => !o.done);

  return (
    <aside className="guide" aria-label="Mission guide">
      <button
        className="btn btn--ghost btn--icon guide__collapse"
        onClick={props.onToggle}
        aria-label={props.collapsed ? "Expand guide" : "Collapse guide"}
        aria-expanded={!props.collapsed}
      >
        {props.collapsed ? <PanelLeft className="icon" /> : <PanelLeftClose className="icon" />}
      </button>

      <section className="objective" data-tour="objective" aria-live="polite">
        <div className="eyebrow">
          <Flag className="icon" style={{ width: 14, height: 14 }} /> Current objective
        </div>
        <h2>{focus.title}</h2>
        <p className="objective__why">{focus.why}</p>
        <div className="objective__think">
          <Lightbulb className="icon" />
          <span>{focus.think}</span>
        </div>
      </section>

      <div className="tabs" role="tablist" aria-label="Guide sections">
        {(["brief", "objectives", "concepts"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === "brief" ? "Brief" : t === "objectives" ? "Objectives" : "Concepts"}
          </button>
        ))}
      </div>

      {tab === "objectives" && (
        <ul className="checklist">
          {props.objectives.map((o, i) => (
            <li key={o.id} className={`check ${o.done ? "is-done" : ""} ${i === currentIdx ? "is-current" : ""}`}>
              <span className="check__box" aria-hidden="true">
                {o.done && <Check className="icon" style={{ width: 13, height: 13, strokeWidth: 3 }} />}
              </span>
              <span>
                {o.label}
                <span className="sr-only">{o.done ? " (done)" : i === currentIdx ? " (current)" : ""}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === "brief" && (
        <div className="brief">
          <dl className="ticket" style={{ marginBottom: "var(--s-4)" }}>
            {BRIEF.ticket.map(([k, v]) => (
              <div className="ticket__row" key={k}>
                <dt>{k}</dt>
                <dd className={k === "Ticket" || k === "Protect" || k === "Keep working" ? "mono" : ""}>{v}</dd>
              </div>
            ))}
          </dl>
          {BRIEF.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}

      {tab === "concepts" && (
        <div className="concepts">
          {CONCEPTS.map((c) => {
            const open = openConcept === c.id;
            return (
              <div className="concept" key={c.id}>
                <button aria-expanded={open} onClick={() => setOpenConcept(open ? null : c.id)}>
                  {c.title}
                  {open ? <ChevronUp className="icon" /> : <ChevronDown className="icon" />}
                </button>
                {open && (
                  <div className="concept__body">
                    <p>{c.body}</p>
                    {c.jump && (
                      <button className="btn btn--sm concept__link" onClick={() => props.onJump(c.jump!)}>
                        {c.jump.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
