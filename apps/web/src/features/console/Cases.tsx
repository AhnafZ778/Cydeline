import { useState } from "react";
import { ALERTS, type PracticeAlert } from "../../content/console";
import { practiceHref } from "../../lib/route";
import { soc, useSoc } from "../../lib/socStore";
import type { SocState } from "../../lib/socLogic";
import { PlaybookModal } from "./Playbook";
import { Sev } from "./Monitoring";

const TABS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
] as const;

type CaseFilter = (typeof TABS)[number]["id"];

export function CaseList() {
  const state = useSoc();
  const [filter, setFilter] = useState<CaseFilter>("all");
  const [query, setQuery] = useState("");
  const [dir, setDir] = useState<1 | -1>(1);
  const owned = ALERTS.filter((alert) => {
    if (!state.cases[alert.id]) return false;
    if (state.role === "analyst" && alert.role === "responder") return false;
    return true;
  });
  const counts: Record<CaseFilter, number> = {
    all: owned.length,
    open: owned.filter((alert) => state.channel[alert.id] !== "closed").length,
    closed: owned.filter((alert) => state.channel[alert.id] === "closed").length,
  };
  const needle = query.trim().toLowerCase();
  const rows = owned.filter((alert) => {
    const closed = state.channel[alert.id] === "closed";
    if (filter === "open" && closed) return false;
    if (filter === "closed" && !closed) return false;
    if (!needle) return true;
    return `${alert.rule} ${alert.eventId} ${alert.summary}`.toLowerCase().includes(needle);
  });
  const index = TABS.findIndex((tab) => tab.id === filter);

  const pick = (next: CaseFilter) => {
    const to = TABS.findIndex((tab) => tab.id === next);
    if (to === index) return;
    setDir(to > index ? 1 : -1);
    setFilter(next);
  };

  return (
    <section className="cm" aria-label="Case management">
      <header className="cm__head">
        <div>
          <h1>Case management</h1>
          <p>Cases you have opened from an alert.</p>
        </div>
        <input aria-label="Search cases" placeholder="Search cases" value={query} onChange={(event) => setQuery(event.target.value)} />
      </header>
      <div className="cm__tabs" role="tablist" aria-label="Case status">
        <span className="cm__thumb" data-i={index} aria-hidden="true" />
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className={filter === tab.id ? "is-on" : ""}
            onClick={() => pick(tab.id)}
          >
            {tab.label}
            <span className="mono">{counts[tab.id]}</span>
          </button>
        ))}
      </div>
      <div className="cm__stage">
        <div key={filter} className={`cm__sheet ${dir > 0 ? "is-next" : "is-prev"}`} role="tabpanel">
          <table className="soc-table cm__table">
            <thead>
              <tr><th>EventID</th><th>Incident</th><th>Severity</th><th>Type</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {rows.map((alert) => (
                <CaseRow key={alert.id} alert={alert} state={state} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="cm__empty">
                    {owned.length === 0 ? "No cases yet. Create one from the Investigation channel." : "Nothing in this tab."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CaseRow(props: { alert: PracticeAlert; state: SocState }) {
  const { alert, state } = props;
  const file = state.cases[alert.id];
  if (!file) return null;
  const closed = state.channel[alert.id] === "closed";
  const href = practiceHref("cases", alert.id);
  return (
    <tr className="cm__row" onClick={() => { window.location.hash = href; }}>
      <td className="mono"><a href={href}>{alert.eventId}</a></td>
      <td>{alert.rule}</td>
      <td><Sev value={alert.severity} /></td>
      <td>{alert.type}</td>
      <td><Status closed={closed} finished={file.finished} /></td>
      <td className="mono">{file.created.slice(0, 10)}</td>
    </tr>
  );
}

function Status(props: { closed: boolean; finished: boolean }) {
  const label = props.closed ? "Closed" : props.finished ? "Playbook finished" : "Open";
  const tone = props.closed ? "is-closed" : props.finished ? "is-done" : "is-open";
  return <span className={`cm__status ${tone}`}>{label}</span>;
}

export function Incident(props: { caseId: string }) {
  const state = useSoc();
  const alert = ALERTS.find((item) => item.id === props.caseId);
  const file = state.cases[props.caseId];
  const [play, setPlay] = useState(false);
  if (!alert || !file) {
    return (
      <section className="soc__panel">
        <h1>Incident</h1>
        <p>That case is not open. <a href="#/practice/cases">Back to cases</a></p>
      </section>
    );
  }
  return (
    <section className="cm cm--detail" aria-label="Incident details">
      <header className="cm__head">
        <div>
          <a className="cm__back" href="#/practice/cases">‹ Cases</a>
          <h1>Incident details</h1>
        </div>
        <button type="button" className="btn btn--primary" data-testid="start-playbook" onClick={() => setPlay(true)}>
          {file.finished ? "Review playbook" : "Start Playbook"}
        </button>
      </header>
      <dl className="cm__facts">
        <div><dt>Incident name</dt><dd>EventID: {alert.eventId} — {alert.rule}</dd></div>
        <div><dt>Description</dt><dd>{alert.summary}</dd></div>
        <div><dt>Incident type</dt><dd>{alert.type}</dd></div>
        <div><dt>Severity</dt><dd><Sev value={alert.severity} /></dd></div>
        <div><dt>Created</dt><dd className="mono">{file.created.slice(0, 16).replace("T", " ")}</dd></div>
      </dl>
      {file.artifacts.length > 0 && (
        <table className="soc-table">
          <thead><tr><th>Value</th><th>Comment</th><th>Type</th></tr></thead>
          <tbody>
            {file.artifacts.map((artifact) => (
              <tr key={artifact.id}><td className="mono">{artifact.value}</td><td>{artifact.comment}</td><td>{artifact.type}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      {file.finished && <p className="ok">Playbook finished. Close the alert from Monitoring to see the score.</p>}
      {play && <PlaybookModal alert={alert} file={file} onClose={() => setPlay(false)} />}
      <p><button type="button" className="btn btn--sm" onClick={() => soc.rate(alert.id)} aria-pressed={file.rated}>Rate this case</button></p>
    </section>
  );
}
