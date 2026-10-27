import { useState } from "react";
import { useRun, useDraft } from "./RunContext";
import { AnalystTools } from "./AnalystTools";
const EMPTY =
  "This identity scenario releases access logs, not endpoint, mail, malware or threat-feed records. Investigate the selected exercise in Log Management and Assets & Access.";
export function LiveTools({ page, onFocusChange }: { page: string; onFocusChange?: (focused: boolean) => void }) {
  const s = useRun().snapshot!;
  const [query, setQuery] = useDraft(s.run_id, page + "-search", "");
  const [tab, setTab] = useDraft(s.run_id, "endpoint-tab", "Processes");
  const [detailed, setDetailed] = useState(false);
  if (page === "sandbox")
    return (
      <>
        <AnalystTools snapshot={s} onFocusChange={onFocusChange} notice={s.ai_unavailable ? "AI unavailable · The exercise is paused. Minimize to retry." : s.awaiting_begin ? "Exercise paused · Minimize and choose Begin investigation when ready." : s.paused ? "Exercise paused · Minimize to resume the exercise." : undefined} />
      </>
    );
  if (page === "endpoint")
    return (
      <section className="ep" aria-label="Endpoint security">
        <header className="ep__head">
          <div>
            <h1>Endpoint Security</h1>
            <p>Hosts on the Northstar network.</p>
          </div>
          <input
            aria-label="Search hosts"
            placeholder="Search host, user, or address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </header>
        <div className="ep__body">
          <ul className="ep__hosts">
            <li className="ep__none">No endpoint inventory released.</li>
          </ul>
          <article className="ep__detail">
            <header className="ep__top">
              <div>
                <h2>No endpoint selected</h2>
                <p>Host and OS information unavailable.</p>
              </div>
              <div className="ep__actions">
                <button
                  className="btn btn--primary"
                  disabled
                  title="No endpoint response API for this exercise"
                >
                  Contain
                </button>
                <a className="btn" href={"#/live/" + s.run_id + "/sandbox"}>
                  Go to lab
                </a>
              </div>
            </header>
            <div
              className="ep__tabs"
              role="tablist"
              aria-label="Host telemetry"
            >
              {["Processes", "Files", "Network", "Browser history"].map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? "is-on" : ""}
                  onClick={() => setTab(t)}
                >
                  {t}
                  <span className="mono">0</span>
                </button>
              ))}
            </div>
            <div className="ep__stage">
              <div className="ep__sheet" role="tabpanel">
                <p className="soc__empty">
                  {EMPTY} Endpoint containment is unavailable here.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    );
  if (page === "email")
    return (
      <section className="soc__panel" aria-label="Email security">
        <header className="soc__panel-head">
          <h1>Email Security</h1>
          <input
            aria-label="Search mail"
            placeholder="Sender, recipient, subject"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="btn btn--sm"
            aria-pressed={detailed}
            onClick={() => setDetailed(!detailed)}
          >
            Detailed search
          </button>
        </header>
        {detailed && (
          <form className="soc__builder" onSubmit={(e) => e.preventDefault()}>
            <input aria-label="From" placeholder="From" />
            <input aria-label="To" placeholder="To" />
            <input aria-label="Subject" placeholder="Subject" />
            <label>
              <input type="checkbox" />
              Has attachment
            </label>
          </form>
        )}
        <div className="soc__scroll">
          <table className="soc-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Final action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="soc__empty">
                  {EMPTY} No mailbox deletion is available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  if (page === "learn")
    return (
      <section className="soc__panel">
        <h1>Learn</h1>
        <p>
          Take ownership of an alert, compare released logs and pin evidence.
          Create an incident case and follow its investigation playbook. Declare
          the incident before applying a response, then verify suspicious access
          and legitimate work separately.
        </p>
        <p>
          Closing an alert records your analysis. Finish the exercise to receive
          server-calculated feedback and review its recorded replay.
        </p>
      </section>
    );
  return (
    <section className="soc__panel" aria-label="Threat intel">
      <header className="soc__panel-head">
        <h1>Threat Intel</h1>
      </header>
      <div className="soc__tiles">
        {["phishing", "malware", "scan", "internal"].map((t) => (
          <button key={t} onClick={() => setQuery(t)}>
            <b className="mono">0</b>
            <span>{t}</span>
          </button>
        ))}
      </div>
      <input
        aria-label="Look up an indicator"
        placeholder="Domain, address, or hash"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="soc__scroll">
        <table className="soc-table">
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Type</th>
              <th>Tag</th>
              <th>Source</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="soc__empty">
                {EMPTY} No external reputation verdict is supplied.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
