import { useMemo } from "react";
import { ArrowRight, Bot, Eye, ListChecks, Scale, Shield, TriangleAlert } from "lucide-react";
import { BRIEF } from "../../content/guide";
import { demoRows } from "../../content/demo";
import { FlowCanvas } from "../flow/FlowCanvas";
import { deriveFlow } from "../../lib/flow";

export function Landing(props: { starting: boolean; error: string | null; isSim: boolean; onStart: () => void; onConsole: () => void }) {
  const rows = useMemo(() => demoRows(), []);
  const flow = useMemo(() => deriveFlow({ rows, protectedId: "doc_finance_07", ai: null, response: null }), [rows]);
  return (
    <div className="app" style={{ minHeight: "100vh" }}>
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">
            <Shield className="icon" />
          </span>
          <span className="brand__text">Sentinel Loop</span>
        </div>
        <div className="topbar__right">
          <span className="chip chip--amber">{props.isSim ? "Simulation" : "Live range"} · fictional company</span>
        </div>
      </header>
      <main className="landing" id="main">
        <div className="landing__inner">
          <div>
            <span className="chip chip--brand">Mission 01 · Beginner · about 10 min</span>
            <h1>The Stolen Session</h1>
            <p className="landing__lede">
              An AI adversary is working against Northstar Analytics right now. Read the logs, find the one session that doesn't belong, and shut it down without breaking anyone else's day.
            </p>
            <dl className="ticket landing__ticket">
              {BRIEF.ticket.map(([k, v]) => (
                <div className="ticket__row" key={k}>
                  <dt>{k}</dt>
                  <dd className={k === "Ticket" || k === "Protect" || k === "Keep working" ? "mono" : ""}>{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="learn-list">
              <li>
                <span className="icon-wrap">
                  <ListChecks className="icon" />
                </span>
                Read an access log and spot what is out of pattern
              </li>
              <li>
                <span className="icon-wrap">
                  <Eye className="icon" />
                </span>
                Connect requests by session, source address and request ID
              </li>
              <li>
                <span className="icon-wrap">
                  <Scale className="icon" />
                </span>
                Contain with the smallest action that works, then prove it worked
              </li>
            </ul>
            {props.error && (
              <div className="form-error" role="alert" style={{ marginBottom: 16, maxWidth: 520 }}>
                <TriangleAlert className="icon" />
                <span>{props.error}</span>
              </div>
            )}
            <div className="landing__cta">
              <button className="btn btn--primary btn--lg" onClick={props.onStart} disabled={props.starting} data-testid="start-shift">
                {props.starting ? "Starting shift..." : "Start shift"} <ArrowRight className="icon" />
              </button>
              <button className="btn btn--lg" onClick={props.onConsole} disabled={props.starting} data-testid="open-console">
                SOC console
              </button>
              <div className="loop-strip" aria-label="The loop: Observe, Investigate, Declare, Contain, Verify">
                Observe<i>›</i>Investigate<i>›</i>Declare<i>›</i>Contain<i>›</i>Verify
              </div>
            </div>
          </div>
          <div className="landing__aside">
            <section className="card preview" aria-label="Preview of the after-action attack map">
              <div className="preview__map">
                <FlowCanvas
                  flow={flow}
                  rows={[]}
                  nowMs={0}
                  suspect={null}
                  revokedSessions={[]}
                  affectedIds={[]}
                  selectedId={null}
                  ai={null}
                  protectedId="doc_finance_07"
                  onNode={() => undefined}
                  onBackground={() => undefined}
                  preview={{ viewBox: "170 4 740 372" }}
                />
              </div>
              <div className="preview__foot">After the shift, the debrief draws this. It shows which path your response cut, and which route the AI tried next.</div>
            </section>
            <section className="card opponent-card">
              <span className="opponent-card__avatar">
                <Bot className="icon" />
              </span>
              <div>
                <strong>AI adversary · ready</strong>
                <span>{props.isSim ? "Scripted simulation · same loop, deterministic moves" : "Runs locally, decides each move live"}</span>
              </div>
            </section>
            <div className="facts-row">
              <span className="chip chip--teal">
                <span className="dot" />
                Practice mode · pause anytime
              </span>
              <span className="chip">Sandboxed · no real systems</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
