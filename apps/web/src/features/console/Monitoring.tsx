import { useState, type ReactNode } from "react";
import { Check, ChevronsRight, RotateCcw, Star, UserPlus, X } from "lucide-react";
import { ALERTS, type PracticeAlert } from "../../content/console";
import { practiceHref } from "../../lib/route";
import { channelIds } from "../../lib/socLogic";
import { soc, useSoc } from "../../lib/socStore";
import type { Verdict } from "../../lib/consoleGrade";

const TABS = [
  { id: "main", label: "Main channel" },
  { id: "investigation", label: "Investigation channel" },
  { id: "closed", label: "Closed alerts" },
] as const;

export function Monitoring() {
  const state = useSoc();
  const [channel, setChannel] = useState<(typeof TABS)[number]["id"]>("main");
  const [openId, setOpenId] = useState<string | null>("NS-4412");
  const [createFor, setCreateFor] = useState<PracticeAlert | null>(null);
  const [closeFor, setCloseFor] = useState<PracticeAlert | null>(null);
  const [takeFor, setTakeFor] = useState<PracticeAlert | null>(null);
  const ids = channelIds(state, channel, state.role, ALERTS);
  const rows = ids.map((id) => ALERTS.find((alert) => alert.id === id)).filter((alert): alert is PracticeAlert => !!alert);

  return (
    <section className="soc__panel" aria-label="Monitoring">
      <div className="soc-tabs" role="tablist" aria-label="Channels">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={channel === tab.id}
            data-testid={`channel-${tab.id}`}
            className={`soc-tab ${channel === tab.id ? "is-on" : ""} ${tab.id === "closed" ? "is-closed" : ""}`}
            onClick={() => setChannel(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="soc__scroll">
        <table className="soc-table">
          <thead>
            <tr>
              <th></th>
              <th>{channel === "closed" ? "Severity" : "Severity"}</th>
              <th>{channel === "closed" ? "Date closed" : "Date"}</th>
              <th>Rule name</th>
              <th>EventID</th>
              <th>Type</th>
              <th>{channel === "closed" ? "Result" : "Action"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((alert) => {
              const expanded = openId === alert.id;
              const file = state.cases[alert.id];
              return (
                <Row
                  key={alert.id}
                  alert={alert}
                  expanded={expanded}
                  channel={channel}
                  perfect={file?.grade?.perfect ?? false}
                  onToggle={() => setOpenId(expanded ? null : alert.id)}
                  onTake={() => setTakeFor(alert)}
                  onCreate={() => (file ? (window.location.hash = practiceHref("cases", alert.id)) : setCreateFor(alert))}
                  onClose={() => setCloseFor(alert)}
                />
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="soc__empty">Nothing in this channel.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {takeFor && (
        <Modal title="Are you sure?" pop onClose={() => setTakeFor(null)}>
          <p>Take ownership of {takeFor.eventId}? This moves the alert to the Investigation channel.</p>
          <div className="soc__modal-actions">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="take-confirm"
              onClick={() => {
                soc.take(takeFor.id);
                setTakeFor(null);
              }}
            >
              Yes
            </button>
            <button type="button" className="btn btn--danger" onClick={() => setTakeFor(null)}>No</button>
          </div>
        </Modal>
      )}
      {createFor && (
        <Modal title={`Create case for EventID: ${createFor.eventId}`} onClose={() => setCreateFor(null)}>
          <p className="soc__checkring" aria-hidden="true"><Check /></p>
          <p>Click the button and create the case.</p>
          <div className="soc__modal-actions">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="create-continue"
              onClick={() => {
                soc.create(createFor.id);
                const id = createFor.id;
                setCreateFor(null);
                window.location.hash = practiceHref("cases", id);
              }}
            >
              Continue
            </button>
            <button type="button" className="btn btn--danger" onClick={() => setCreateFor(null)}>Cancel</button>
          </div>
        </Modal>
      )}
      {closeFor && <CloseModal alert={closeFor} onClose={() => setCloseFor(null)} />}
    </section>
  );
}

function Row(props: {
  alert: PracticeAlert;
  expanded: boolean;
  channel: (typeof TABS)[number]["id"];
  perfect: boolean;
  onToggle: () => void;
  onTake: () => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const { alert } = props;
  const file = useSoc().cases[alert.id];
  return (
    <>
      <tr className={props.expanded ? "is-open" : ""} data-testid={`alert-${alert.id}`}>
        <td>
          <button type="button" className="soc-icon" aria-expanded={props.expanded} aria-label={`${props.expanded ? "Collapse" : "Expand"} ${alert.rule}`} onClick={props.onToggle}>
            <span className={`chev ${props.expanded ? "is-open" : ""}`} aria-hidden="true">›</span>
          </button>
        </td>
        <td><Sev value={alert.severity} /></td>
        <td className="mono">{alert.when}</td>
        <td>
          {alert.writeup ? <Star className="icon soc-star" aria-label="Official write-up" /> : null}
          {alert.rule}
        </td>
        <td className="mono">{alert.eventId}</td>
        <td>{alert.type}</td>
        <td className="soc-actions">
          {props.channel === "main" && (
            <button type="button" className="soc-icon" title="Take ownership" aria-label={`Take ownership of ${alert.eventId}`} data-testid={`take-${alert.id}`} onClick={props.onTake}>
              <UserPlus className="icon" />
            </button>
          )}
          {props.channel === "investigation" && (
            <>
              <button type="button" className="soc-icon" title={file ? "Open case" : "Create case"} aria-label={file ? `Open case ${alert.eventId}` : `Create case ${alert.eventId}`} data-testid={`case-${alert.id}`} onClick={props.onCreate}>
                <ChevronsRight className="icon" />
              </button>
              <button type="button" className="soc-icon" title="Close alert" aria-label={`Close alert ${alert.eventId}`} data-testid={`close-${alert.id}`} onClick={props.onClose}>
                <Check className="icon" />
              </button>
            </>
          )}
          {props.channel === "closed" && file?.grade && (
            <>
              <span role="img" className={props.perfect ? "ok" : "bad"} title={props.perfect ? "Correct answer" : "Incorrect answer"} data-testid={`result-${alert.id}`} aria-label={props.perfect ? "Correct answer" : "Incorrect answer"}>
                {props.perfect ? <Check className="icon" /> : <X className="icon" />}
              </span>
              <button type="button" className="soc-icon" title="Retry" aria-label={`Retry ${alert.eventId}`} onClick={() => soc.retry(alert.id)}>
                <RotateCcw className="icon" />
              </button>
            </>
          )}
        </td>
      </tr>
      {props.expanded && (
        <tr className="soc-detail-row">
          <td colSpan={7}>
            <dl className="soc-fields">
              {alert.fields.map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd className="mono">{field.value}</dd>
                </div>
              ))}
            </dl>
            {props.channel === "closed" && file?.grade && <Report alert={alert} />}
          </td>
        </tr>
      )}
    </>
  );
}

function Report(props: { alert: PracticeAlert }) {
  const file = useSoc().cases[props.alert.id];
  if (!file?.grade) return null;
  const [verdict, ...rest] = file.grade.lines;
  return (
    <div className="soc-report" data-testid={`report-${props.alert.id}`}>
      <p><span>Answer</span> <b className={verdict.ok ? "ok" : "bad"}>{verdict.label} (+{verdict.points} Point)</b></p>
      <p>Playbook answers</p>
      <ul>
        {rest.map((line) => (
          <li key={line.id} className={line.ok ? "ok" : "bad"}>{line.label} (+{line.points} Point)</li>
        ))}
      </ul>
      <p><span>Analyst note</span> {file.closeNote || file.note || "—"}</p>
      <p>
        <span>Official write-up</span>{" "}
        {file.writeupSeen ? props.alert.writeup : <button type="button" className="btn btn--sm" onClick={() => soc.seeWriteup(props.alert.id)}>Show</button>}
      </p>
      <p className="soc-report__links">
        <button type="button" className="soc-icon" aria-pressed={file.rated} aria-label="Rate this case" onClick={() => soc.rate(props.alert.id)}><Star className="icon" /></button>
        <button type="button" className="btn btn--sm" disabled title="Local practice">Write-ups</button>
        <button type="button" className="btn btn--sm" disabled title="Local practice">Discussion</button>
      </p>
    </div>
  );
}

function CloseModal(props: { alert: PracticeAlert; onClose: () => void }) {
  const [verdict, setVerdict] = useState<Verdict>("true_positive");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Close Alert" onClose={props.onClose}>
      <label className="soc-field">
        <span>Event ID</span>
        <input className="mono" readOnly value={props.alert.eventId} />
      </label>
      <fieldset className="soc-field">
        <legend className="sr-only">Verdict</legend>
        <label><input type="radio" name="verdict" checked={verdict === "true_positive"} onChange={() => setVerdict("true_positive")} /> True Positive</label>
        <label><input type="radio" name="verdict" checked={verdict === "false_positive"} onChange={() => setVerdict("false_positive")} /> False Positive</label>
      </fieldset>
      <label className="soc-field">
        <span>Note</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Message" rows={4} />
      </label>
      <div className="soc__modal-actions">
        <button
          type="button"
          className="btn btn--primary"
          data-testid="close-submit"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void soc.close(props.alert.id, verdict, note).then(() => props.onClose());
          }}
        >
          Close Alert
        </button>
      </div>
    </Modal>
  );
}

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; pop?: boolean }) {
  return (
    <div className={`soc-scrim ${props.pop ? "is-pop" : ""}`} role="presentation" onMouseDown={props.onClose}>
      <div
        className={`soc-modal ${props.wide ? "is-wide" : ""} ${props.pop ? "is-pop" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="soc-icon soc-modal__x" aria-label="Close" onClick={props.onClose}><X className="icon" /></button>
        {props.pop && <ConfirmTick />}
        <h2>{props.title}</h2>
        {props.children}
      </div>
    </div>
  );
}

function ConfirmTick() {
  return (
    <svg className="sure-tick" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="26" />
      <path d="M22 37.5 L32.5 48 L51 26.5" />
    </svg>
  );
}

export function Sev(props: { value: string }) {
  const tone = props.value.toLowerCase();
  return (
    <span className={`sev sev--${tone}`}>
      <i aria-hidden="true" />
      {props.value}
    </span>
  );
}
