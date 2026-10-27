import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { useRun, useDraft, runHref } from "./RunContext";
import {
  api,
  terminal,
  type IncidentCase,
  type Snapshot,
  type Artifact,
} from "./types";
import { ConsoleModal as Modal, Severity } from "./ConsoleModal";
import { Worksheet } from "./Worksheet";
const STEPS = [
  "evidence",
  "scope",
  "declaration",
  "containment",
  "recovery",
  "reporting",
] as const;
const LABELS = [
  "Collect evidence",
  "Determine scope",
  "Declare incident",
  "Contain access",
  "Verify recovery",
  "Report findings",
];

export function LiveCases({
  caseId,
  onInspect,
}: {
  caseId?: string;
  onInspect: (id: string) => void;
}) {
  const m = useRun(),
    s = m.snapshot!;
  const [filter, setFilter] = useDraft(s.run_id, "case-filter", "all"),
    [query, setQuery] = useDraft(s.run_id, "case-search", "");
  const [play, setPlay] = useState(false);
  const cases = s.workspace.cases.filter((c) => c.opened !== false);
  const c = cases.find((c) => c.id === caseId);
  const ended = terminal(s.state);
  const [draft, setDraft] = useDraft(s.run_id, "case-text", {
    note: cases[0]?.note || s.workspace.note,
    scope: cases[0]?.scope ?? "",
    report: cases[0]?.report ?? "",
    base_revision: cases[0]?.revision ?? 0,
  });
  const shownDraft = ended ? { note: c?.note ?? "", scope: c?.scope ?? "", report: c?.submitted_report?.text ?? c?.report ?? "", base_revision: c?.revision ?? 0 } : draft;
  const save = (extra: Record<string, unknown> = {}) =>
    c
      ? m.act<Snapshot>(
          "cases/" + c.id,
          { revision: draft.base_revision ?? 0, note: draft.note, scope: draft.scope, report: draft.report, ...extra },
          "PATCH",
        ).then(result => {
          const saved = result?.workspace.cases.find(item => item.id === c.id);
          if (saved) setDraft(current => ({ ...current, base_revision: saved.revision }));
          return result;
        })
      : Promise.resolve(undefined);
  if (!caseId)
    return (
      <section className="cm" aria-label="Case management">
        <header className="cm__head">
          <div>
            <h1>Case Management</h1>
            <p>Cases you have opened from an alert.</p>
          </div>
          <input
            aria-label="Search cases"
            placeholder="Search cases"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </header>
        <div className="cm__tabs" role="tablist" aria-label="Case status">
          <span
            className="cm__thumb"
            data-i={["all", "open", "closed"].indexOf(filter)}
            aria-hidden="true"
          />
          {["all", "open", "closed"].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={t === filter}
              className={filter === t ? "is-on" : ""}
              onClick={() => setFilter(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
              <span className="mono">
                {cases.filter((c) => t === "all" || c.status === t).length}
              </span>
            </button>
          ))}
        </div>
        <div className="cm__stage soc__scroll">
          <div className="cm__sheet">
            <table className="soc-table cm__table">
              <thead>
                <tr>
                  <th>EventID</th>
                  <th>Incident</th>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {cases
                  .filter(
                    (c) =>
                      (filter === "all" || c.status === filter) &&
                      (c.title + " " + c.id)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((c) => (
                    <tr className="cm__row" key={c.id}>
                      <td className="mono">
                        <a href={runHref(s.run_id, "cases/" + c.id)}>{c.id}</a>
                      </td>
                      <td>{c.title}</td>
                      <td>
                        <Severity value="medium" />
                      </td>
                      <td>Identity access</td>
                      <td>
                        <span
                          className={
                            "cm__status " +
                            (c.status === "closed" ? "is-closed" : "is-open")
                          }
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="mono">
                        {c.created_at?.slice(0, 10) ?? "Earlier exercise"}
                      </td>
                    </tr>
                  ))}
                {!cases.length && (
                  <tr>
                    <td colSpan={6} className="cm__empty">
                      No cases yet. Create one from the Investigation Channel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  if (!c)
    return (
      <section className="soc__panel">
        <h1>Incident Details</h1>
        <p>
          This case is unavailable in the selected exercise.{" "}
          <a href={runHref(s.run_id, "cases")}>Back to cases</a>
        </p>
      </section>
    );
  return (
    <section className="cm cm--detail" aria-label="Incident details">
      <header className="cm__head">
        <div>
          <a className="cm__back" href={runHref(s.run_id, "cases")}>
            ‹ Cases
          </a>
          <h1>Incident Details</h1>
        </div>
        <button
          className="btn btn--primary"
          data-testid="start-playbook"
          disabled={m.busy}
          onClick={() => {
            if (c.playbook_started || ended) setPlay(true);
            else
              void save({ start_playbook: true }).then(
                (r) => r && setPlay(true),
              );
          }}
        >
          {c.playbook_started ? "Review playbook" : "Start Playbook"}
        </button>
      </header>
      <dl className="cm__facts">
        <div>
          <dt>Incident name</dt>
          <dd>{c.title}</dd>
        </div>
        <div>
          <dt>Description</dt>
          <dd>{s.scenario.summary}</dd>
        </div>
        <div>
          <dt>Incident type</dt>
          <dd>Identity access · {s.scenario_version}</dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>
            <Severity value="medium" />
          </dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{c.owner ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt>Related alerts</dt>
          <dd className="mono">{c.alert_ids.join(", ") || "Earlier case"}</dd>
        </div>
      </dl>
      <div className="soc-case-notes">
        <label className="soc-field">
          <span>Investigation notes</span>
          <textarea
            rows={5}
            maxLength={20000}
            disabled={ended}
            value={shownDraft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </label>
        <button
          className="btn"
          disabled={ended || m.busy}
          onClick={() => void save()}
        >
          Save notes
        </button>
        <button
          className="btn btn--ghost"
          disabled={ended || m.busy}
          onClick={() =>
            setDraft({ note: c.note, scope: c.scope, report: c.report, base_revision: c.revision })
          }
        >
          Load saved case
        </button>
        <p className="live-muted">
          {ended ? "Recorded server case. Local drafts are separate from the submitted report." : "Drafts stay in this tab until saved."} Case revision {c.revision}.
        </p>
        {s.workspace.note && s.workspace.note !== c.note && (
          <details data-private>
            <summary>Earlier investigation notebook</summary>
            <pre>{s.workspace.note}</pre>
          </details>
        )}
      </div>
      <Worksheet onInspect={onInspect} />
      <h2>Artifacts</h2>
      <div className="soc__scroll">
        <table className="soc-table">
          <thead>
            <tr>
              <th>Value</th>
              <th>Evidence</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {c.artifacts.map((a, i) => (
              <tr key={i}>
                <td className="mono">{a.value}</td>
                <td>
                  {a.event_ids.map((id) => (
                    <button
                      key={id}
                      className="live-link"
                      onClick={() => onInspect(id)}
                    >
                      {id.slice(-8)}{" "}
                    </button>
                  ))}
                </td>
                <td>{a.type}</td>
              </tr>
            ))}
            {!c.artifacts.length && (
              <tr>
                <td colSpan={3}>
                  No artifacts recorded. Add evidence-linked artifacts in the
                  playbook.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p>
        {c.completed_steps.length} / {STEPS.length} playbook steps recorded.
      </p>
      <Handoff c={c} />
      {c.status === "closed" && !ended && (
        <>
          <p>
            Report saved. Close related alerts in Live Monitoring, then finish
            the exercise for server-calculated feedback.
          </p>
          <button
            className="btn btn--primary"
            disabled={m.busy}
            onClick={() =>
              void m
                .act<Snapshot>("finish")
                .then(
                  (r) =>
                    r && (window.location.hash = runHref(s.run_id, "debrief")),
                )
            }
          >
            Finish exercise &amp; view debrief
          </button>
        </>
      )}
      {ended && (
        <p>
          <a href={runHref(s.run_id, "debrief")}>
            Open final feedback, write-up and replay
          </a>
        </p>
      )}
      {play && (
        <Playbook
          c={c}
          draft={shownDraft}
          setDraft={setDraft}
          save={save}
          onInspect={onInspect}
          onClose={() => setPlay(false)}
        />
      )}
    </section>
  );
}
type TextDraft = { note: string; scope: string; report: string; base_revision: number };
function Playbook({
  c,
  draft,
  setDraft,
  save,
  onInspect,
  onClose,
}: {
  c: IncidentCase;
  draft: TextDraft;
  setDraft: (x: TextDraft) => void;
  save: (x?: Record<string, unknown>) => Promise<Snapshot | undefined>;
  onInspect: (id: string) => void;
  onClose: () => void;
}) {
  const m = useRun(),
    s = m.snapshot!,
    ended = terminal(s.state);
  const [index, setIndex] = useDraft(s.run_id, "playbook-index", 0);
  const step = STEPS[index];
  const bodies =
    s.scenario_version === "v1"
      ? [
          "Compare released browser access events, source addresses and user agents. Pin evidence that supports your hypothesis.",
          "Explain which browser access and accounts you investigated, and what remains uncertain.",
          "Declare the incident using observed access and pinned evidence.",
          "Choose a response for the observed access. Account-wide actions can disrupt employees.",
          "Confirm access denial and legitimate employee work with separate target checks.",
          "Record the evidence, scope, actions, recovery results and unresolved questions.",
        ]
      : [
          "Compare released browser and reporting-service access. Pin evidence for each path you investigate.",
          "Describe the browser and reporting-service scope. Explain which observed access paths still require investigation.",
          "Declare the incident with observed identities and evidence across the relevant access paths.",
          "Assess browser sessions and service credentials independently. A response on one path may leave another usable.",
          "Verify all suspicious access paths and normal employee workflows against the target.",
          "Report each investigated path, response receipt, recovery result and remaining uncertainty.",
        ];
  return (
    <Modal title={LABELS[index]} wide onClose={onClose}>
      <div className="play">
        <nav className="soc-playbook-steps" aria-label="Playbook steps">
          {STEPS.map((key, i) => (
            <button
              className={index === i ? "is-on" : ""}
              key={key}
              aria-current={index === i ? "step" : undefined}
              onClick={() => setIndex(i)}
            >
              {i + 1}. {LABELS[i]}
              {c.completed_steps.includes(key) ? " ✓" : ""}
            </button>
          ))}
        </nav>
        <p>{bodies[index]}</p>
        {step === "evidence" && (
          <>
            <p>
              <a href={runHref(s.run_id, "logs")}>Open Log Management</a>
            </p>
            <ul>
              {s.workspace.evidence_ids.map((id) => (
                <li key={id}>
                  <button
                    className="live-link mono"
                    onClick={() => onInspect(id)}
                  >
                    {id}
                  </button>
                </li>
              ))}
            </ul>
            <Artifacts c={c} />
          </>
        )}
        {step === "scope" && (
          <label className="soc-field">
            <span>Scope and working hypothesis</span>
            <textarea
              rows={5}
              disabled={ended}
              value={draft.scope}
              maxLength={4000}
              onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
            />
          </label>
        )}
        {["declaration", "containment", "recovery"].includes(step) && (
          <ResponseControls stage={step} />
        )}
        {step === "reporting" && (
          <label className="soc-field">
            <span>Investigation report</span>
            <textarea
              rows={7}
              maxLength={8000}
              disabled={ended}
              value={draft.report}
              onChange={(e) => setDraft({ ...draft, report: e.target.value })}
            />
          </label>
        )}
        {m.error && <p role="alert">{m.error}</p>}
        {c.completed_steps.includes(step) && (
          <p role="status">Step recorded by the server.</p>
        )}
        <div className="soc__modal-actions">
          <button
            className="btn btn--primary"
            disabled={ended || m.busy}
            data-testid="playbook-next"
            onClick={() =>
              void save({ complete_step: step }).then((r) => {
                if (r) {
                  if (index < STEPS.length - 1) setIndex(index + 1);
                  else onClose();
                }
              })
            }
          >
            {index === STEPS.length - 1
              ? "Save report & finish playbook"
              : "Record step & next"}
          </button>
        </div>
      </div>
      <div className="play__foot">
        <button
          aria-label="Back"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          <ArrowLeft className="icon" />
        </button>
        <span>
          {index + 1} / {STEPS.length}
        </span>
        <button
          aria-label="Forward"
          disabled={index === STEPS.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          <ArrowRight className="icon" />
        </button>
      </div>
    </Modal>
  );
}
function Artifacts({ c }: { c: IncidentCase }) {
  const m = useRun(),
    s = m.snapshot!;
  const [draft, setDraft] = useDraft(s.run_id, "artifact", {
    value: "",
    type: "IP Address" as Artifact["type"],
  });
  const ended = terminal(s.state);
  return (
    <div className="arts">
      <div className="soc__scroll">
        <table className="soc-table">
          <thead>
            <tr>
              <th>Value</th>
              <th>Type</th>
              <th>Evidence</th>
              <th>Remove</th>
            </tr>
          </thead>
          <tbody>
            {c.artifacts.map((a, i) => (
              <tr key={i}>
                <td className="mono">{a.value}</td>
                <td>{a.type}</td>
                <td>{a.event_ids.length} released events</td>
                <td>
                  <button
                    className="soc-icon"
                    aria-label={"Remove " + a.value}
                    disabled={ended || m.busy}
                    onClick={() =>
                      void m.act(
                        "cases/" + c.id,
                        {
                          revision: c.revision,
                          artifacts: c.artifacts.filter((_, n) => n !== i),
                        },
                        "PATCH",
                      )
                    }
                  >
                    <Trash2 className="icon" />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input
                  aria-label="Artifact value"
                  disabled={ended}
                  value={draft.value}
                  onChange={(e) =>
                    setDraft({ ...draft, value: e.target.value })
                  }
                />
              </td>
              <td>
                <select
                  aria-label="Artifact type"
                  disabled={ended}
                  value={draft.type}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      type: e.target.value as Artifact["type"],
                    })
                  }
                >
                  {[
                    "IP Address",
                    "URL",
                    "Domain",
                    "Access Handle",
                    "Other",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td>Uses {s.workspace.evidence_ids.length} pinned events</td>
              <td>
                <button
                  className="soc-icon"
                  aria-label="Add artifact row"
                  disabled={
                    ended ||
                    m.busy ||
                    !draft.value.trim() ||
                    !s.workspace.evidence_ids.length
                  }
                  onClick={() =>
                    void m
                      .act(
                        "cases/" + c.id,
                        {
                          revision: c.revision,
                          artifacts: [
                            ...c.artifacts,
                            { ...draft, event_ids: s.workspace.evidence_ids },
                          ],
                        },
                        "PATCH",
                      )
                      .then((r) => r && setDraft({ ...draft, value: "" }))
                  }
                >
                  <Plus className="icon" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ResponseControls({ stage }: { stage: string }) {
  const m = useRun(),
    s = m.snapshot!,
    ended = terminal(s.state);
  const [d, setD] = useDraft(s.run_id, "declaration", {
    actor: s.declaration?.suspected_actor ?? "",
    suspect: s.declaration?.suspected_session ?? "",
    rationale: s.declaration?.rationale ?? "",
  });
  const [response, setResponse] = useDraft(s.run_id, "response", {
    action: "revoke_session",
    target: "",
    key: crypto.randomUUID(),
  });
  const [confirm, setConfirm] = useState(false);
  const targetEvents = m.events.filter((e) => e.source === "target-access");
  const actors = [...new Set(targetEvents.map((e) => e.actor_id))],
    handles = [
      ...new Set(
        targetEvents
          .map((e) => e.session_handle)
          .filter((x): x is string => !!x),
      ),
    ];
  async function apply() {
    const r = await m.act("defender-actions", {
      action: response.action,
      target_handle: response.target,
      idempotency_key: response.key,
    });
    if (r) setResponse({ ...response, key: crypto.randomUUID() });
    setConfirm(false);
  }
  if (stage === "declaration")
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void m.act("declare", {
            suspected_actor: d.actor,
            suspected_session: d.suspect,
            rationale: d.rationale,
            event_ids: s.workspace.evidence_ids,
          });
        }}
      >
        <label className="soc-field">
          <span>Suspected account</span>
          <select
            value={d.actor}
            disabled={ended}
            onChange={(e) => setD({ ...d, actor: e.target.value })}
          >
            <option value="">Choose observed account</option>
            {actors.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="soc-field">
          <span>Suspected access</span>
          <select
            value={d.suspect}
            disabled={ended}
            onChange={(e) => setD({ ...d, suspect: e.target.value })}
          >
            <option value="">Choose observed access</option>
            {handles.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="soc-field">
          <span>Reason for declaration</span>
          <textarea
            value={d.rationale}
            disabled={ended}
            onChange={(e) => setD({ ...d, rationale: e.target.value })}
          />
        </label>
        <p>{s.workspace.evidence_ids.length} pinned evidence items.</p>
        <button
          className="btn btn--primary"
          disabled={
            ended ||
            m.busy ||
            !d.actor ||
            !d.suspect ||
            !d.rationale.trim() ||
            !s.workspace.evidence_ids.length
          }
        >
          Declare incident
        </button>
        {s.declaration && (
          <p role="status">
            Declaration recorded: {s.declaration.suspected_actor} ·{" "}
            {s.declaration.suspected_session}
          </p>
        )}
      </form>
    );
  if (stage === "containment")
    return (
      <>
        <label className="soc-field">
          <span>Response</span>
          <select
            disabled={ended}
            value={response.action}
            onChange={(e) =>
              setResponse({
                action: e.target.value,
                target: "",
                key: crypto.randomUUID(),
              })
            }
          >
            <option value="revoke_session">Revoke browser session</option>
            {s.scenario_version === "v2" && (
              <option value="revoke_api_credential">
                Revoke API credential
              </option>
            )}
            <option value="require_reauthentication">
              Require account reauthentication
            </option>
            <option value="temporarily_disable_account">
              Temporarily disable account
            </option>
            <option value="restore_account">Restore account</option>
          </select>
        </label>
        <label className="soc-field">
          <span>Response target</span>
          <select
            disabled={ended}
            value={response.target}
            onChange={(e) =>
              setResponse({
                ...response,
                target: e.target.value,
                key: crypto.randomUUID(),
              })
            }
          >
            <option value="">Choose observed target</option>
            {(response.action.startsWith("revoke") ? handles : actors).map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </label>
        <p>
          {response.action === "temporarily_disable_account"
            ? "Account-wide: stops employee access until restored. Existing access is invalidated."
            : response.action === "require_reauthentication"
              ? "Account-wide: invalidates existing sessions and requires authentication."
              : response.action === "restore_account"
                ? "Restores legitimate employee access. Revoked credentials remain revoked."
                : "Changes only the selected access handle. Other access can remain usable."}
        </p>
        <button
          className="btn btn--primary"
          disabled={ended || m.busy || !s.declaration || !response.target}
          onClick={() =>
            [
              "temporarily_disable_account",
              "require_reauthentication",
            ].includes(response.action)
              ? setConfirm(true)
              : void apply()
          }
        >
          Apply response
        </button>
        {s.applied_actions.map((a) => (
          <p className="live-receipt" key={a.action_id}>
            {a.action} · {a.target_handle} · target confirmed{" "}
            <span className="mono">{a.target_audit_id}</span>
          </p>
        ))}
        {confirm && (
          <Modal
            title="Confirm account-wide response"
            onClose={() => setConfirm(false)}
          >
            <p>
              This may interrupt legitimate employee work. Apply{" "}
              {response.action} to {response.target}?
            </p>
            <button
              className="btn"
              data-autofocus
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn--danger"
              disabled={m.busy}
              onClick={() => void apply()}
            >
              Confirm response
            </button>
          </Modal>
        )}
      </>
    );
  return (
    <>
      <button
        className="btn"
        disabled={ended || m.busy || !s.declaration}
        onClick={() => void m.act("verify?continue_investigation=true")}
      >
        Run checks
      </button>
      {s.verification?.checks.map((c) => (
        <p key={c.check_id}>
          <b className={c.passed ? "ok" : "bad"}>
            {c.passed ? "Passed" : "Not recovered"}
          </b>{" "}
          —{" "}
          {c.verification === "verify_suspicious_session_denied"
            ? "Suspicious access denied"
            : "Legitimate employee work"}{" "}
          · <span className="mono">{c.target_audit_id}</span>
        </p>
      ))}
      {!s.verification && <p>No recovery checks recorded yet.</p>}
    </>
  );
}
function Handoff({ c }: { c: IncidentCase }) {
  const m = useRun(),
    s = m.snapshot!;
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [d, setD] = useDraft(s.run_id, "handoff", {
    recipient: "",
    hypothesis: "",
    next: "",
  });
  useEffect(() => {
    void api<{ people: typeof people }>("/people")
      .then((r) => setPeople(r.people))
      .catch(() => {});
  }, []);
  return (
    <details className="soc-case-notes" data-private>
      <summary>Case handoff and earlier notes ({c.notes.length})</summary>
      {c.notes.map((n, i) => (
        <p key={i}>
          {n.from}: {n.hypothesis} → {n.next_step}
        </p>
      ))}
      <label className="soc-field">
        <span>Receiving analyst</span>
        <select
          value={d.recipient}
          disabled={terminal(s.state)}
          onChange={(e) => setD({ ...d, recipient: e.target.value })}
        >
          <option value="">Choose registered analyst</option>
          {people.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="soc-field">
        <span>Working hypothesis</span>
        <textarea
          value={d.hypothesis}
          disabled={terminal(s.state)}
          onChange={(e) => setD({ ...d, hypothesis: e.target.value })}
        />
      </label>
      <label className="soc-field">
        <span>Next step</span>
        <input
          value={d.next}
          disabled={terminal(s.state)}
          onChange={(e) => setD({ ...d, next: e.target.value })}
        />
      </label>
      <button
        className="btn"
        disabled={
          terminal(s.state) ||
          m.busy ||
          !d.recipient ||
          !d.hypothesis.trim() ||
          !d.next.trim()
        }
        onClick={() =>
          void m.act("handoff", {
            recipient_id: d.recipient,
            owner: people.find((p) => p.id === d.recipient)?.name,
            role: "response",
            hypothesis: d.hypothesis,
            next_step: d.next,
          })
        }
      >
        Hand off with evidence
      </button>
    </details>
  );
}
