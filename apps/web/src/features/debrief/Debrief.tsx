import { useMemo, useState } from "react";
import { BookOpen, Check, Lightbulb, RotateCcw, Shield, TriangleAlert } from "lucide-react";
import { AttackStudy } from "./AttackStudy";
import type { Mission } from "../../app/useMission";
import { CONCEPTS } from "../../content/guide";
import { DIM_CONCEPT, buildDotMatrix, buildTimeline, logLine } from "../../lib/debrief";
import { toLogRow } from "../../lib/format";
import { DebriefResponse, Outcome } from "../../types/contracts";

function Gauge({ score }: { score: number }) {
  const r = 120;
  const len = Math.PI * r;
  const off = len * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="gauge">
      <svg viewBox="0 0 300 160" role="img" aria-label={`Score ${score} out of 100`}>
        <defs>
          <linearGradient id="gauge-g" x1="0" x2="1">
            <stop offset="0" stopColor="#fb923c" />
            <stop offset="1" stopColor="#c2410c" />
          </linearGradient>
        </defs>
        <path d="M30 140 A120 120 0 0 1 270 140" fill="none" stroke="#f6e6d6" strokeWidth="18" strokeLinecap="round" />
        <path d="M30 140 A120 120 0 0 1 270 140" fill="none" stroke="url(#gauge-g)" strokeWidth="18" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={off} />
      </svg>
      <div className="gauge__value">
        {score}
        <small>out of 100</small>
      </div>
    </div>
  );
}

const HERO: Record<Outcome, { tone: "" | "hero--bad" | "hero--warn"; chip: string; chipTone: string; headline: string }> = {
  defended_and_recovered: { tone: "", chip: "Defended and recovered", chipTone: "chip--teal", headline: "You stopped it before the vault was read." },
  contained_but_disrupted: { tone: "hero--warn", chip: "Contained, but work was disrupted", chipTone: "chip--amber", headline: "You stopped it, but it cost real work." },
  attacker_objective_reached: { tone: "hero--bad", chip: "Adversary reached its goal", chipTone: "chip--coral", headline: "The adversary read the protected document." },
  timed_out_unresolved: { tone: "hero--warn", chip: "Time ran out", chipTone: "chip--amber", headline: "The incident was still open when time ran out." },
  aborted: { tone: "hero--warn", chip: "Run ended early", chipTone: "chip--amber", headline: "This run was ended before it finished." },
  technical_failure: { tone: "hero--bad", chip: "Technical failure", chipTone: "chip--coral", headline: "The run hit a technical problem." },
};

export function Debrief({ m }: { m: Mission }) {
  const bundle = m.bundle;
  const [openCite, setOpenCite] = useState<string | null>(null);
  const [openConcept, setOpenConcept] = useState<string | null>(null);

  const events = bundle?.replay.events ?? [];
  const debrief: DebriefResponse | null = bundle?.debrief ?? null;
  const byId = useMemo(() => new Map(events.map((e) => [e.event_id, e])), [events]);
  const timeline = useMemo(() => (debrief ? buildTimeline(m.snapshot, events, debrief) : []), [m.snapshot, events, debrief]);
  const dots = useMemo(() => buildDotMatrix(events), [events]);
  const showed = useMemo(
    () =>
      events
        .filter((e) => e.summary && (e.source === "target-access" || e.source === "target-auth") && e.agent_meta)
        .sort((a, b) => a.sequence - b.sequence)
        .slice(0, 5),
    [events]
  );
  if (!debrief) return null;
  const hero = HERO[debrief.terminal_outcome] ?? HERO.timed_out_unresolved;
  const prov = debrief.model_provenance;
  const simulated = prov.model_id.startsWith("sim-");

  const weak = debrief.dimensions.filter((d) => d.awarded_points / d.max_points < 0.7);
  const conceptIds = Array.from(new Set(weak.map((d) => DIM_CONCEPT[d.id]).filter(Boolean))).slice(0, 3);
  const concepts = CONCEPTS.filter((c) => conceptIds.includes(c.id));

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">
            <Shield className="icon" />
          </span>
          <span className="brand__text">Sentinel Loop</span>
        </div>
        <div className="mission-name">
          <strong>The Stolen Session</strong>
          <span>Debrief</span>
        </div>
        <div className="topbar__right">{m.isSim && <span className="chip chip--amber">Simulation</span>}</div>
      </header>
      <main className="debrief" id="main">
        <div className="debrief__inner">
          <div className="debrief__bar">
            <div>
              <span className="eyebrow">Debrief · SOC-0142</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={m.backToWorkbench}>
                Back to logs
              </button>
              <button className="btn btn--primary" onClick={m.reset} data-testid="try-again">
                <RotateCcw className="icon" /> Try again
              </button>
            </div>
          </div>

          <section className={`card hero ${hero.tone}`} aria-label="Result">
            <Gauge score={debrief.total_score} />
            <div>
              <span className={`chip ${hero.chipTone}`}>
                {hero.tone ? <TriangleAlert className="icon" /> : <Check className="icon" />} {hero.chip}
              </span>
              <h1 data-testid="debrief-headline">{hero.headline}</h1>
              <p>{debrief.outcome_gate_explanation}</p>
            </div>
          </section>

          {m.snapshot && <AttackStudy events={events} snapshot={m.snapshot} />}

          <div className="debrief__cols">
            <section className="card pad">
              <div className="card__title" style={{ marginBottom: 16 }}>
                How you scored
              </div>
              <ul className="rubric">
                {debrief.dimensions.map((d) => {
                  const ratio = d.awarded_points / d.max_points;
                  return (
                    <li className="rubric__row" key={d.id}>
                      <div className="rubric__top">
                        <span>{d.label}</span>
                        <span className="rubric__pts">
                          {d.awarded_points} / {d.max_points}
                        </span>
                      </div>
                      <div className="bar" role="img" aria-label={`${d.label}: ${d.awarded_points} of ${d.max_points}`}>
                        <i className={ratio < 0.7 ? "is-low" : ""} style={{ width: `${ratio * 100}%` }} />
                      </div>
                      <div className="rubric__why">{d.explanation}</div>
                      {d.cited_ids.length > 0 && (
                        <div className="cites">
                          {d.cited_ids.map((id) => {
                            const ev = byId.get(id);
                            return ev ? (
                              <button key={id} className="cite" aria-expanded={openCite === `${d.id}:${id}`} onClick={() => setOpenCite(openCite === `${d.id}:${id}` ? null : `${d.id}:${id}`)}>
                                {ev.correlation_id}
                              </button>
                            ) : (
                              <span key={id} className="cite" style={{ cursor: "default" }}>
                                {id}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {d.cited_ids.map((id) => {
                        const ev = byId.get(id);
                        if (!ev || openCite !== `${d.id}:${id}`) return null;
                        return (
                          <div className="showed__line" key={id} style={{ marginTop: 8 }}>
                            {logLine(toLogRow(ev))}
                          </div>
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card pad">
              <div className="card__title" style={{ marginBottom: 16 }}>
                What you did
              </div>
              <ol className="timeline">
                {timeline.map((t, i) => (
                  <li className={t.tone} key={`${t.ms}-${i}`}>
                    <time>{t.time}</time>
                    <div>
                      <strong>{t.headline}</strong>
                      <span>{t.sub}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <div className="debrief__cols">
            <section className="card pad">
              <div className="card__title" style={{ marginBottom: 4 }}>
                What the logs showed
              </div>
              <p className="muted" style={{ marginBottom: 12, fontSize: "var(--fs-13)" }}>
                Revealed now that the run is over. These are the lines to look for next time.
              </p>
              <div className="showed">
                {showed.length === 0 && <p className="muted">No annotated lines for this run.</p>}
                {showed.map((e) => (
                  <div className="showed__item" key={e.event_id}>
                    <span className="showed__line">{logLine(toLogRow(e))}</span>
                    <div className="showed__note">
                      <Lightbulb className="icon" />
                      {e.summary}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card pad">
              <div className="card__title" style={{ marginBottom: 4 }}>
                The adversary's playbook
              </div>
              <p className="muted" style={{ marginBottom: 12, fontSize: "var(--fs-13)" }}>
                Each dot is one AI move. Red dots were refused.
              </p>
              <div className="dotmatrix" role="img" aria-label="Adversary moves by type">
                {dots.map((row) => (
                  <div className="dotmatrix__row" key={row.label}>
                    <span>{row.label}</span>
                    <div className="dots">
                      {row.cells.map((c, i) => (
                        <i key={i} className={c.state} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <dl className="provenance" style={{ marginTop: 16 }}>
                <div>
                  <dt>Model decisions</dt>
                  <dd>{prov.total_decisions}</dd>
                </div>
                <div>
                  <dt>Fallback used</dt>
                  <dd>{prov.fallback_count}</dd>
                </div>
                <div>
                  <dt>Median latency</dt>
                  <dd>{prov.median_latency_ms} ms</dd>
                </div>
              </dl>
              {simulated && (
                <p className="muted" style={{ marginTop: 12, fontSize: "var(--fs-12)" }}>
                  <TriangleAlert className="icon" style={{ width: 13, height: 13, verticalAlign: "-2px", color: "var(--amber)" }} /> Simulated adversary ({prov.model_id}). Connect the control plane to run the local model.
                </p>
              )}
            </section>
          </div>

          <section className="card pad">
            <div className="card__title" style={{ marginBottom: 4 }}>
              Next step
            </div>
            <p style={{ color: "var(--ink-2)", marginBottom: concepts.length ? 16 : 0 }}>{debrief.recommended_next_step}</p>
            {concepts.length > 0 && (
              <div className="concepts" aria-label="Concepts to review">
                {concepts.map((c) => {
                  const open = openConcept === c.id;
                  return (
                    <div className="concept" key={c.id}>
                      <button aria-expanded={open} onClick={() => setOpenConcept(open ? null : c.id)}>
                        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          <BookOpen className="icon" /> Review: {c.title}
                        </span>
                      </button>
                      {open && (
                        <div className="concept__body">
                          <p>{c.body}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
