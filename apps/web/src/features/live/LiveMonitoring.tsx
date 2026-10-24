import { Fragment, useState } from "react";
import { Check, ChevronsRight, UserPlus } from "lucide-react";
import { useRun, useDraft, runHref } from "./RunContext";
import { ConsoleModal as Modal, Severity } from "./ConsoleModal";
import { terminal, type Alert, type Snapshot } from "./types";

const CHANNELS = [
  ["new", "Main Channel"],
  ["investigating", "Investigation Channel"],
  ["closed", "Closed Alerts"],
] as const;
export function LiveMonitoring() {
  const m = useRun(),
    s = m.snapshot!;
  const [channel, setChannel] = useDraft(s.run_id, "channel", "new");
  const [open, setOpen] = useDraft<string | null>(
    s.run_id,
    "alert-expanded",
    null,
  );
  const [take, setTake] = useState<Alert | null>(null),
    [create, setCreate] = useState<Alert | null>(null),
    [close, setClose] = useState<Alert | null>(null);
  const ended = terminal(s.state);
  const rows = s.workspace.alerts.filter((a) => a.status === channel);
  async function own(a: Alert) {
    const result = await m.act("alerts/" + a.id, {
      status: "investigating",
      revision: a.revision ?? 0,
    });
    if (result) {
      setTake(null);
      setChannel("investigating");
    }
  }
  async function makeCase(a: Alert) {
    const key = "soc-case-key:" + s.run_id + ":" + a.id;
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    const result = await m.act<Snapshot>("cases", {
      alert_id: a.id,
      idempotency_key: id,
    });
    if (result) {
      setCreate(null);
      window.location.hash = runHref(s.run_id, "cases/case_main");
    }
  }
  return (
    <>
      <h1>Live Monitoring</h1>
      <section className="soc__panel" aria-label="Live Monitoring">
        <div className="soc-tabs" role="tablist" aria-label="Channels">
          {CHANNELS.map(([id, label]) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={channel === id}
              data-testid={
                "channel-" +
                {
                  new: "main",
                  investigating: "investigation",
                  closed: "closed",
                }[id]
              }
              className={
                "soc-tab " +
                (channel === id ? "is-on " : "") +
                (id === "closed" ? "is-closed" : "")
              }
              onClick={() => setChannel(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="soc__scroll">
          <table className="soc-table">
            <thead>
              <tr>
                <th aria-label="Details" />
                <th>Severity</th>
                <th>{channel === "closed" ? "Date closed" : "Date"}</th>
                <th>Rule name</th>
                <th>EventID</th>
                <th>Type</th>
                <th>{channel === "closed" ? "Result" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const detail = m.events.filter((e) =>
                  a.event_ids.includes(e.event_id),
                );
                const last = detail.at(-1);
                return (
                  <Fragment key={a.id}>
                    <tr
                      className={open === a.id ? "is-open" : ""}
                      data-testid={"alert-" + a.id}
                    >
                      <td>
                        <button
                          className="soc-icon"
                          aria-label={
                            (open === a.id ? "Collapse " : "Expand ") + a.title
                          }
                          aria-expanded={open === a.id}
                          onClick={() => setOpen(open === a.id ? null : a.id)}
                        >
                          <span
                            className={
                              "chev " + (open === a.id ? "is-open" : "")
                            }
                            aria-hidden="true"
                          >
                            ›
                          </span>
                        </button>
                      </td>
                      <td>
                        <Severity value={a.severity} />
                      </td>
                      <td className="mono">
                        {(channel === "closed" ? a.closed_at : a.created_at)
                          ?.slice(0, 19)
                          .replace("T", " ") ?? a.created_sec + "s"}
                      </td>
                      <td>{a.title}</td>
                      <td className="mono">{a.id}</td>
                      <td>Identity access</td>
                      <td className="soc-actions">
                        {channel === "new" && (
                          <button
                            className="soc-icon"
                            disabled={ended || m.busy}
                            title="Take ownership"
                            aria-label={"Take ownership of " + a.id}
                            onClick={() => setTake(a)}
                          >
                            <UserPlus className="icon" />
                          </button>
                        )}
                        {channel === "investigating" && (
                          <>
                            <button
                              className="soc-icon"
                              disabled={(!a.case_id && ended) || m.busy}
                              title={a.case_id ? "Open case" : "Create case"}
                              aria-label={
                                (a.case_id ? "Open case " : "Create case ") +
                                a.id
                              }
                              onClick={() =>
                                a.case_id
                                  ? (window.location.hash = runHref(
                                      s.run_id,
                                      "cases/" + a.case_id,
                                    ))
                                  : setCreate(a)
                              }
                            >
                              <ChevronsRight className="icon" />
                            </button>
                            <button
                              className="soc-icon"
                              disabled={ended || m.busy}
                              title="Close alert"
                              aria-label={"Close alert " + a.id}
                              onClick={() => setClose(a)}
                            >
                              <Check className="icon" />
                            </button>
                          </>
                        )}
                        {channel === "closed" && (
                          <span>{a.verdict?.replaceAll("_", " ")}</span>
                        )}
                      </td>
                    </tr>
                    {open === a.id && (
                      <tr className="soc-detail-row">
                        <td colSpan={7}>
                          <dl className="soc-fields">
                            {[
                              ["Rule", a.title],
                              ["Access handle", a.session_handle],
                              ["Owner", a.owner ?? "Unassigned"],
                              [
                                "Source address",
                                last?.network?.src_ip ?? "Unavailable",
                              ],
                              ["Destination address", "Unavailable"],
                              ["Related events", String(a.event_ids.length)],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <dt>{label}</dt>
                                <dd className="mono">{value}</dd>
                              </div>
                            ))}
                          </dl>
                          <p>
                            <a href={runHref(s.run_id, "logs")}>
                              Investigate released logs
                            </a>
                          </p>
                          {a.closure_comment && (
                            <p>
                              <b>Analyst comment:</b> {a.closure_comment}
                            </p>
                          )}
                          {channel === "closed" && (
                            <p>
                              {ended ? (
                                <a href={runHref(s.run_id, "debrief")}>
                                  Open final feedback and write-up
                                </a>
                              ) : (
                                "Final feedback is available after the exercise ends. Alert closure does not stop access."
                              )}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="soc__empty">
                    {ended
                      ? "No alerts in this channel."
                      : "No alerts in this channel. Detections appear as the company releases activity."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {take && (
        <Modal title="Are you sure?" pop onClose={() => setTake(null)}>
          <p>
            Take ownership of {take.id}? This moves the alert to the
            Investigation Channel.
          </p>
          <div className="soc__modal-actions">
            <button
              className="btn btn--primary"
              data-testid="take-confirm"
              disabled={m.busy}
              onClick={() => void own(take)}
            >
              Yes
            </button>
            <button className="btn btn--danger" onClick={() => setTake(null)}>
              No
            </button>
          </div>
          {m.error && <p role="alert">{m.error}</p>}
        </Modal>
      )}
      {create && (
        <Modal
          title={"Create case for EventID: " + create.id}
          onClose={() => setCreate(null)}
        >
          <p className="soc__checkring" aria-hidden="true">
            <Check />
          </p>
          <p>
            Create the exercise incident or link this alert to its existing
            case.
          </p>
          <div className="soc__modal-actions">
            <button
              className="btn btn--primary"
              data-testid="create-continue"
              disabled={m.busy}
              onClick={() => void makeCase(create)}
            >
              Continue
            </button>
            <button className="btn btn--danger" onClick={() => setCreate(null)}>
              Cancel
            </button>
          </div>
          {m.error && <p role="alert">{m.error}</p>}
        </Modal>
      )}
      {close && <CloseAlert alert={close} onClose={() => setClose(null)} />}
    </>
  );
}
function CloseAlert({
  alert: a,
  onClose,
}: {
  alert: Alert;
  onClose: () => void;
}) {
  const m = useRun(),
    s = m.snapshot!;
  const [draft, setDraft] = useDraft(s.run_id, "close-" + a.id, {
    verdict: "true_positive",
    note: "",
  });
  return (
    <Modal title="Close Alert" onClose={onClose}>
      <label className="soc-field">
        <span>Event ID</span>
        <input className="mono" readOnly value={a.id} />
      </label>
      <fieldset className="soc-field">
        <legend>Verdict</legend>
        {["true_positive", "false_positive"].map((v) => (
          <label key={v}>
            <input
              type="radio"
              name="verdict"
              checked={draft.verdict === v}
              onChange={() => setDraft({ ...draft, verdict: v })}
            />
            {v === "true_positive" ? "True Positive" : "False Positive"}
          </label>
        ))}
      </fieldset>
      <label className="soc-field">
        <span>Note</span>
        <textarea
          rows={4}
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
      </label>
      <p>
        Records your classification. The exercise and attacker continue until
        recovery is confirmed or the shift ends.
      </p>
      {m.error && <p role="alert">{m.error}</p>}
      <div className="soc__modal-actions">
        <button
          className="btn btn--primary"
          disabled={m.busy || !draft.note.trim()}
          data-testid="close-submit"
          onClick={() =>
            void m
              .act("alerts/" + a.id, {
                status: "closed",
                verdict: draft.verdict,
                comment: draft.note,
                revision: a.revision ?? 0,
              })
              .then((r) => r && onClose())
          }
        >
          Close Alert
        </button>
      </div>
    </Modal>
  );
}
