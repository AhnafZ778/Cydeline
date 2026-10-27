import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Shield,
  Radar,
  ScrollText,
  FolderOpen,
  Monitor,
  Activity,
  ArrowRight,
  Pin,
  Search,
  Check,
  TriangleAlert,
  Pause,
  Play,
  RotateCcw,
  Download,
  Sparkles,
} from "lucide-react";
import {
  api,
  terminal,
  type Event,
  type Snapshot,
  type Scenario,
  type Replay,
} from "./types";
import { LearnerDesk, InstructorDesk } from "./TrainingDesk";
import { AnalystTools } from "./AnalystTools";
import { AssistantPanel } from "./AssistantPanel";
import { ProgressView } from "./ProgressView";
import { LearningDebrief } from "./LearningViews";
import {
  clock,
  containmentMeasure,
  replayRows,
  resolveCitation,
  scoreTimeline,
  title,
} from "./logic";
import { useLiveRun } from "./useLiveRun";
import { InspectorDrawer } from "../logs/InspectorDrawer";
import { SideNav, TopNav } from "../console/Chrome";
import { toRows } from "../../lib/format";

const pages = [
  ["monitoring", "Live monitoring", Radar],
  ["logs", "Live evidence", ScrollText],
  ["case", "Live response", FolderOpen],
  ["assistant", "Evidence assistant", Sparkles],
  ["assets", "Assets & access", Shield],
  ["business", "Business Activity", Activity],
  ["workstation", "Analyst Workstation", Monitor],
] as const;
const href = (rid: string, page = "monitoring") => "#/live/" + rid + "/" + page;
function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"live-badge " + tone}>{children}</span>;
}
function ErrorBox({ message }: { message: string | null }) {
  return message ? (
    <div className="live-error" role="alert">
      <TriangleAlert size={16} />
      {message}
    </div>
  ) : null;
}

export function LiveSocApp({ hash }: { hash: string }) {
  const parts = hash.replace(/^#\/?/, "").split("/");
  const rid = parts[1]?.startsWith("run_") ? parts[1] : null;
  const page = rid ? (parts[2] ?? "monitoring") : (parts[1] ?? "library");
  const m = useLiveRun(rid);
  const [scenarios, setScenarios] = useState<Scenario[]>([]),
    [history, setHistory] = useState<
      {
        run_id: string;
        scenario_id: string;
        state: string;
        outcome: string | null;
      }[]
    >([]),
    [health, setHealth] = useState<{
      model: { available: boolean; name: string };
    } | null>(null),
    [selected, setSelected] = useState("stolen-session"),
    [mode, setMode] = useState("practice"),
    [assist, setAssist] = useState("coached"),
    [launchError, setLaunchError] = useState<string | null>(null),
    [starting, setStarting] = useState(false),
    [inspect, setInspect] = useState<string | null>(null),
    [confirmEnd, setConfirmEnd] = useState(false);
  useEffect(() => {
    void Promise.all([
      api<{ scenarios: Scenario[] }>("/scenarios"),
      api<{ runs: typeof history }>("/runs"),
      api<typeof health>("/health"),
    ])
      .then(([s, r, h]) => {
        setScenarios(s.scenarios);
        setHistory(r.runs);
        setHealth(h);
      })
      .catch((e) => setLaunchError(e.message));
  }, [rid]);
  const s = m.snapshot;
  const ended = !!s && terminal(s.state);
  // Replay includes model-only events that were never learner-visible, so every
  // recorded event in a debrief can be opened in the inspector.
  const rows = useMemo(
    () => (m.replay ? replayRows(m.replay.events) : toRows(m.events)),
    [m.events, m.replay],
  );
  async function launch() {
    setStarting(true);
    setLaunchError(null);
    try {
      const created = await api<Snapshot>("/runs", "POST", {
        scenario_id: selected,
        mode,
        assistance: assist,
      });
      await api("/runs/" + created.run_id + "/start", "POST");
      window.location.hash = href(created.run_id);
    } catch (e) {
      setLaunchError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }
  return (
    <div className="soc live-soc">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <TopNav />
      <div className="soc__body">
        <SideNav activeHref={!rid ? (page === "library" ? "#/live" : "#/live/" + page) : undefined}>
          {rid && (
            pages
              .filter(
                ([key]) => key !== "assistant" || s?.mode !== "assessment",
              )
              .map(([key, label, Icon]) => (
                <a
                  key={key}
                  href={href(rid, key)}
                  aria-current={page === key ? "page" : undefined}
                >
                  <Icon className="icon" />
                  <span>{label}</span>
                </a>
              ))
          )}
          {s && ended && (
            <a
              href={href(s.run_id, "debrief")}
              aria-current={page === "debrief" ? "page" : undefined}
            >
              <RotateCcw className="icon" />
              <span>Debrief & replay</span>
            </a>
          )}
        </SideNav>
        <main id="main" tabIndex={-1} className="live-main">
          <div className="live-toolbar" role="region" aria-label="Live range status">
            {s ? (
              <div className="live-run-status">
                <Badge tone={m.connection === "live" ? "good" : "warn"}>
                  {m.connection}
                </Badge>
                <Badge>
                  {s.mode === "assessment"
                    ? "Assessment"
                    : s.assistance === "coached"
                      ? "Coached practice"
                      : "Independent practice"}
                </Badge>
                <span className="mono live-clock" aria-label="Time remaining">
                  {clock(s.remaining_sec)}
                </span>
                {!ended && (
                  <>
                    <button
                      className="btn btn--sm"
                      disabled={m.busy || s.mode === "assessment"}
                      aria-label={s.paused ? "Resume exercise" : "Pause exercise"}
                      onClick={() => void m.act("pause")}
                    >
                      {s.paused ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                    <button
                      className="btn btn--sm"
                      onClick={() => setConfirmEnd(true)}
                    >
                      End shift
                    </button>
                  </>
                )}
              </div>
            ) : (
              <Badge tone={health?.model.available ? "good" : "warn"}>
                {health?.model.available ? "Local AI ready" : "Live range"}
              </Badge>
            )}
          </div>
          <ErrorBox message={m.error ?? launchError} />
          {!rid && page === "progress" ? (
            <ProgressView />
          ) : !rid && page === "profile" ? (
            <LearnerDesk />
          ) : !rid && page === "instructor" ? (
            <InstructorDesk />
          ) : !rid ? (
            <>
              <div className="live-heading">
                <div>
                  <span className="eyebrow">
                    Northstar Analytics · Training range
                  </span>
                  <h1>Your next shift starts here.</h1>
                  <p>
                    Investigate live activity. Stop unauthorized access. Keep
                    the company working.
                  </p>
                </div>
                <Badge>Fictional company · isolated training</Badge>
              </div>
              <div className="live-scenario-grid">
                {scenarios.map((sc) => (
                  <button
                    key={sc.scenario_id}
                    className={
                      "live-scenario " +
                      (selected === sc.scenario_id ? "selected" : "")
                    }
                    aria-pressed={selected === sc.scenario_id}
                    onClick={() => setSelected(sc.scenario_id)}
                  >
                    <div className="live-scenario__meta">
                      <Badge>{sc.difficulty}</Badge>
                      <span>{Math.round(sc.duration_sec / 60)} min</span>
                    </div>
                    <h2>{sc.title}</h2>
                    <p>{sc.summary}</p>
                    <div className="live-tags">
                      {sc.skills.map((skill) => (
                        <span key={skill}>{title(skill)}</span>
                      ))}
                    </div>
                    <span className="live-scenario__selected">
                      {selected === sc.scenario_id
                        ? "Selected mission"
                        : "Choose mission"}{" "}
                      <ArrowRight size={16} />
                    </span>
                  </button>
                ))}
              </div>
              <section className="card live-brief">
                <div>
                  <h2>Prepare your shift</h2>
                  <p>
                    Northstar uses document access and reporting services. Your
                    response changes actual access and employee workflows.
                  </p>
                  <p className="live-muted">
                    AI selects reviewed actions through a local model. Network
                    identities and company data are training fixtures. Model
                    delays do not count against your response time.
                  </p>
                </div>
                <div className="live-launch">
                  <label htmlFor="live-field-1">Training mode</label>
                  <select
                    id="live-field-1"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                  >
                    <option value="practice">Practice</option>
                    <option value="assessment">Assessment</option>
                  </select>
                  {mode === "practice" && (
                    <>
                      <label htmlFor="live-field-2">Assistance</label>
                      <select
                        id="live-field-2"
                        value={assist}
                        onChange={(e) => setAssist(e.target.value)}
                      >
                        <option value="coached">
                          Coached · optional adversary lens
                        </option>
                        <option value="independent">
                          Independent · no adversary lens
                        </option>
                      </select>
                    </>
                  )}
                  <button
                    className="btn btn--primary"
                    disabled={
                      starting || !scenarios.length || !health?.model.available
                    }
                    onClick={() => void launch()}
                    data-testid="live-start"
                  >
                    {starting ? "Preparing company…" : "Start shift"}
                    <ArrowRight size={16} />
                  </button>
                  {health && !health.model.available && (
                    <p role="status">
                      The configured local model is unavailable. Reconnect when
                      the range is ready.
                    </p>
                  )}
                </div>
              </section>
              {history.length > 0 && (
                <section className="card live-pad">
                  <h2>Recent shifts</h2>
                  <div className="live-history">
                    {history.map((r) => (
                      <a
                        key={r.run_id}
                        href={href(
                          r.run_id,
                          terminal(r.state) ? "debrief" : "monitoring",
                        )}
                      >
                        <span>
                          {scenarios.find(
                            (sc) => sc.scenario_id === r.scenario_id,
                          )?.title ?? r.scenario_id}
                        </span>
                        <Badge>{title(r.outcome ?? r.state)}</Badge>
                        <ArrowRight size={16} />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : !s ? (
            <section className="card live-pad">
              <h1>Reconnecting to your shift…</h1>
              <p>Your case and evidence are saved with the exercise.</p>
            </section>
          ) : (
            <>
              <div className="live-heading">
                <div>
                  <span className="eyebrow">
                    {s.scenario.title} ·{" "}
                    {s.branch_from ? "Practice branch" : title(s.state)}
                  </span>
                  <h1>
                    {page === "debrief"
                      ? "Your shift, explained"
                      : (pages.find((p) => p[0] === page)?.[1] ??
                        "SOC workspace")}
                  </h1>
                </div>
                <div className="live-tags">
                  <Badge>
                    {s.workspace.evidence_ids.length} evidence pinned
                  </Badge>
                  {s.paused && <Badge tone="warn">Exercise paused</Badge>}
                  {s.branch_from && <Badge>Assisted retry</Badge>}
                  {ended && page !== "debrief" && (
                    <a className="btn btn--primary" href={href(rid, "debrief")}>
                      Open debrief
                    </a>
                  )}
                </div>
              </div>
              {page === "debrief" ? (
                m.replay ? (
                  <Debrief
                    replay={m.replay}
                    snapshot={s}
                    onInspect={setInspect}
                    onBranch={async (id) => {
                      const b = await m.act<Snapshot>("branches", {
                        checkpoint_id: id,
                      });
                      if (b) window.location.hash = href(b.run_id, "case");
                    }}
                  />
                ) : (
                  <p role="status">Loading recorded debrief…</p>
                )
              ) : page === "monitoring" ? (
                <>
                  <div className="live-kpis">
                    <Kpi label="Released events" value={m.events.length} />
                    <Kpi
                      label="Open alerts"
                      value={
                        s.workspace.alerts.filter((a) => a.status !== "closed")
                          .length
                      }
                    />
                    <Kpi
                      label="Employee workflows"
                      value={
                        s.business.filter((b) => b.passed).length +
                        "/" +
                        s.business.length
                      }
                    />
                    <Kpi
                      label="Interruption"
                      value={clock(s.disrupted_seconds)}
                    />
                  </div>
                  <section className="card live-pad">
                    <div className="live-section-head">
                      <h2>Alert queue</h2>
                      <a className="btn" href={href(rid, "case")}>
                        Open investigation <ArrowRight size={16} />
                      </a>
                    </div>
                    {!s.workspace.alerts.length ? (
                      <div className="live-empty">
                        <Radar size={28} />
                        <h3>Watching company activity</h3>
                        <p>
                          Review baseline access while detections evaluate
                          incoming events.
                        </p>
                        <a href={href(rid, "logs")}>Investigate logs</a>
                      </div>
                    ) : (
                      <div className="live-table-wrap">
                        <table className="soc-table">
                          <thead>
                            <tr>
                              <th>Detection</th>
                              <th>Access</th>
                              <th>Status</th>
                              <th>Response window</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.workspace.alerts.map((a) => (
                              <tr key={a.id}>
                                <td>
                                  <strong>{a.title}</strong>
                                  <small>
                                    {a.event_ids.length} related events
                                  </small>
                                </td>
                                <td className="mono">{a.session_handle}</td>
                                <td>
                                  <Badge>{a.status}</Badge>
                                </td>
                                <td className="mono">
                                  {clock(
                                    Math.max(
                                      0,
                                      a.sla_sec -
                                        (s.virtual_clock_sec - a.created_sec),
                                    ),
                                  )}
                                </td>
                                <td>
                                  <a
                                    href={href(rid, "case")}
                                    className="btn btn--sm"
                                    onClick={() => {
                                      if (!ended)
                                        void m.act("alerts/" + a.id, {
                                          status: "investigating",
                                        });
                                    }}
                                  >
                                    Investigate
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                  <Messages snapshot={s} />
                  <EvidenceTable
                    events={m.events}
                    snapshot={s}
                    onInspect={setInspect}
                    act={m.act}
                    compact
                  />
                </>
              ) : page === "logs" ? (
                <EvidenceTable
                  events={m.events}
                  snapshot={s}
                  onInspect={setInspect}
                  act={m.act}
                />
              ) : page === "case" ? (
                <CaseWorkspace
                  key={rid}
                  snapshot={s}
                  events={m.events}
                  act={m.act}
                  onInspect={setInspect}
                  busy={m.busy}
                />
              ) : page === "assistant" ? (
                <AssistantPanel
                  key={rid}
                  snapshot={s}
                  events={m.events}
                  onInspect={setInspect}
                />
              ) : page === "business" ? (
                <Business snapshot={s} />
              ) : page === "assets" ? (
                <Assets events={m.events} snapshot={s} onInspect={setInspect} />
              ) : page === "workstation" ? (
                <AnalystTools snapshot={s} />
              ) : null}
            </>
          )}
        </main>
      </div>
      {inspect && rows.find((r) => r.id === inspect) && (
        <InspectorDrawer
          row={rows.find((r) => r.id === inspect)!}
          allRows={rows}
          pinned={s?.workspace.evidence_ids.includes(inspect) ?? false}
          onClose={() => setInspect(null)}
          onPin={() => {
            if (s && !ended)
              void m.act(
                "workspace",
                {
                  revision: s.workspace.revision,
                  evidence_ids: s.workspace.evidence_ids.includes(inspect)
                    ? s.workspace.evidence_ids.filter((i) => i !== inspect)
                    : [...s.workspace.evidence_ids, inspect],
                },
                "PATCH",
              );
          }}
          onSelect={setInspect}
          onAddTerm={() => {
            setInspect(null);
            if (rid) window.location.hash = href(rid, "logs");
          }}
        />
      )}
      {confirmEnd && (
        <Confirm
          title="End this shift?"
          text="The company will stop advancing and your current evidence, response, and recovery checks will be recorded."
          onCancel={() => setConfirmEnd(false)}
          onConfirm={() => {
            setConfirmEnd(false);
            void m.act("finish").then(() => {
              if (rid) window.location.hash = href(rid, "debrief");
            });
          }}
        />
      )}
      <div className="sr-only" aria-live="polite">
        {m.connection === "reconnecting"
          ? "Connection interrupted. Reconnecting to your saved shift."
          : ""}
      </div>
    </div>
  );
}
function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card live-kpi">
      <span>{label}</span>
      <strong className="mono">{value}</strong>
    </div>
  );
}
function Messages({ snapshot: s }: { snapshot: Snapshot }) {
  return s.workspace.messages.length ? (
    <section className="card live-pad">
      <h2>Shift messages</h2>
      {s.workspace.messages.map((m) => (
        <div className="live-message" key={m.id}>
          <strong>{m.from}</strong>
          <span>{m.text}</span>
          <time className="mono">{clock(m.at_sec)}</time>
        </div>
      ))}
    </section>
  ) : null;
}
type Act = <T>(
  path: string,
  body?: unknown,
  method?: string,
) => Promise<T | undefined>;
function EvidenceTable({
  events,
  snapshot: s,
  onInspect,
  act,
  compact = false,
}: {
  events: Event[];
  snapshot: Snapshot;
  onInspect: (id: string) => void;
  act: Act;
  compact?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [result, setResult] = useState<Event[] | null>(null),
    [error, setError] = useState<string | null>(null),
    [frozen, setFrozen] = useState<number | null>(null),
    [saving, setSaving] = useState(false);
  const visible =
    frozen === null ? events : events.filter((e) => e.sequence <= frozen);
  const list = (result ?? visible).filter(
    (e) => !frozen || e.sequence <= frozen,
  );
  const shown = compact ? list.slice(-12) : list;
  async function search(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await api<{ events: Event[] }>(
        "/runs/" + s.run_id + "/queries",
        "POST",
        { query },
      );
      setResult(r.events);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function pin(id: string) {
    setSaving(true);
    try {
      await act(
        "workspace",
        {
          revision: s.workspace.revision,
          evidence_ids: s.workspace.evidence_ids.includes(id)
            ? s.workspace.evidence_ids.filter((x) => x !== id)
            : [...s.workspace.evidence_ids, id],
        },
        "PATCH",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="card live-pad">
      <div className="live-section-head">
        <h2>{compact ? "Recent company activity" : "Access logs"}</h2>
        <button
          className="btn btn--sm"
          aria-pressed={frozen !== null}
          onClick={() =>
            setFrozen((f) =>
              f === null ? (events.at(-1)?.sequence ?? 0) : null,
            )
          }
        >
          {frozen === null ? "Freeze display" : "Resume display"}
          {frozen !== null && " · " + (events.length - visible.length) + " new"}
        </button>
      </div>
      {!compact && (
        <form className="live-query" onSubmit={search}>
          <Search size={17} />
          <label className="sr-only" htmlFor="live-query">
            Search company logs
          </label>
          <input
            id="live-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="session:sess_A status:401"
          />
          <button className="btn" type="submit">
            Search
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => {
              setQuery("");
              setResult(null);
            }}
          >
            Clear
          </button>
          <button
            className="btn"
            type="button"
            disabled={!query || terminal(s.state)}
            onClick={() =>
              void act(
                "workspace",
                {
                  revision: s.workspace.revision,
                  saved_queries: [
                    ...s.workspace.saved_queries,
                    { name: query, query },
                  ],
                },
                "PATCH",
              )
            }
          >
            Save search
          </button>
        </form>
      )}
      {!compact && (
        <>
          <p className="live-muted">
            Northstar filters: user, session, ip, path, status, type, outcome.
            Free text searches released event fields.
          </p>
          <div className="live-tags">
            {s.workspace.saved_queries.map((q, i) => (
              <button
                className="live-filter"
                key={i}
                onClick={() => setQuery(q.query)}
              >
                {q.name}
              </button>
            ))}
          </div>
        </>
      )}
      <ErrorBox message={error} />
      <div className="live-table-wrap">
        <table className="soc-table live-events">
          <thead>
            <tr>
              <th>Evidence</th>
              <th>Time</th>
              <th>User</th>
              <th>Session / access</th>
              <th>Source</th>
              <th>Request</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr
                key={e.event_id}
                className={
                  s.workspace.evidence_ids.includes(e.event_id) ? "pinned" : ""
                }
              >
                <td>
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={saving || terminal(s.state)}
                    aria-label={
                      (s.workspace.evidence_ids.includes(e.event_id)
                        ? "Unpin"
                        : "Pin") +
                      " event " +
                      e.sequence
                    }
                    aria-pressed={s.workspace.evidence_ids.includes(e.event_id)}
                    onClick={() => void pin(e.event_id)}
                  >
                    <Pin size={14} />
                  </button>
                </td>
                <td>
                  <button
                    className="live-link mono"
                    onClick={() => onInspect(e.event_id)}
                  >
                    {clock(e.virtual_clock_sec)}
                  </button>
                </td>
                <td>{e.actor_id}</td>
                <td>
                  <button
                    className="live-link mono"
                    onClick={() => {
                      setQuery("session:" + e.session_handle);
                      onInspect(e.event_id);
                    }}
                  >
                    {e.session_handle ?? "—"}
                  </button>
                </td>
                <td className="mono">{e.network?.src_ip ?? e.source}</td>
                <td>
                  <button
                    className="live-link mono"
                    onClick={() => onInspect(e.event_id)}
                  >
                    {e.network
                      ? e.network.http_method + " " + e.network.path
                      : e.event_type}
                  </button>
                </td>
                <td>
                  <Badge
                    tone={
                      e.outcome === "denied"
                        ? "warn"
                        : e.outcome === "allowed"
                          ? "good"
                          : ""
                    }
                  >
                    {e.network?.status_code ?? e.outcome ?? "recorded"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="live-empty">No events match this view.</p>
        )}
      </div>
      {frozen !== null && (
        <p className="live-muted">
          Only this display is frozen. The exercise continues.
        </p>
      )}
    </section>
  );
}
function CaseWorkspace({
  snapshot: s,
  events,
  act,
  onInspect,
  busy,
}: {
  snapshot: Snapshot;
  events: Event[];
  act: Act;
  onInspect: (id: string) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState(
      () => sessionStorage.getItem("live-note-" + s.run_id) ?? s.workspace.note,
    ),
    [hypothesis, setHypothesis] = useState(s.workspace.hypothesis),
    [dirty, setDirty] = useState(
      () => sessionStorage.getItem("live-note-" + s.run_id) !== null,
    ),
    [saved, setSaved] = useState("Saved"),
    [suspect, setSuspect] = useState(s.declaration?.suspected_session ?? ""),
    [actor, setActor] = useState(s.declaration?.suspected_actor ?? ""),
    [rationale, setRationale] = useState(""),
    [action, setAction] = useState("revoke_session"),
    [target, setTarget] = useState(""),
    [confirm, setConfirm] = useState(false),
    [timelineNote, setTimelineNote] = useState(""),
    [hint, setHint] = useState(""),
    [handoffOwner, setHandoffOwner] = useState(""),
    [people, setPeople] = useState<{ id: string; name: string }[]>([]),
    [handoffNext, setHandoffNext] = useState("");
  const latest = useRef(s);
  latest.current = s;
  const key = useRef<string | null>(null);
  const ended = terminal(s.state);
  useEffect(() => {
    if (!dirty || ended) return;
    const timer = setTimeout(() => {
      const text = note,
        hypo = hypothesis;
      setSaved("Saving…");
      void act<Snapshot>(
        "workspace",
        {
          revision: latest.current.workspace.revision,
          note: text,
          hypothesis: hypo,
        },
        "PATCH",
      ).then((r) => {
        if (r) {
          setSaved("Saved");
          setDirty(false);
          sessionStorage.removeItem("live-note-" + s.run_id);
        } else setSaved("Draft retained · save again to retry");
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [note, hypothesis, dirty, ended, act, s.run_id]);
  useEffect(() => {
    void api<{ people: { id: string; name: string }[] }>("/people")
      .then((r) => setPeople(r.people))
      .catch(() => {});
  }, []);
  const handles = [
    ...new Set(
      events
        .filter((e) => e.source === "target-access")
        .map((e) => e.session_handle)
        .filter((x): x is string => !!x),
    ),
  ];
  const actors = [
    ...new Set(
      events.filter((e) => e.source === "target-access").map((e) => e.actor_id),
    ),
  ];
  const evidence = events.filter((e) =>
    s.workspace.evidence_ids.includes(e.event_id),
  );
  async function response() {
    const targetHandle =
      target ||
      (action.startsWith("revoke")
        ? s.declaration?.suspected_session
        : s.declaration?.suspected_actor);
    key.current ??= crypto.randomUUID();
    const r = await act("defender-actions", {
      action,
      target_handle: targetHandle,
      idempotency_key: key.current,
    });
    if (r) key.current = null;
    setConfirm(false);
  }
  return (
    <>
      <div className="live-case-grid">
        <section className="card live-pad">
          <div className="live-section-head">
            <h2>Investigation notebook</h2>
            <span className="live-muted" role="status">
              {saved}
            </span>
          </div>
          <label htmlFor="live-hypothesis">Working hypothesis</label>
          <textarea
            id="live-hypothesis"
            value={hypothesis}
            disabled={ended}
            onChange={(e) => {
              setHypothesis(e.target.value);
              setDirty(true);
              setSaved("Unsaved draft");
            }}
            placeholder="What happened, and what evidence would test it?"
          />
          <label htmlFor="live-case-notes">Case notes</label>
          <textarea
            id="live-case-notes"
            className="live-notes"
            value={note}
            disabled={ended}
            onChange={(e) => {
              setNote(e.target.value);
              setDirty(true);
              setSaved("Unsaved draft");
              sessionStorage.setItem("live-note-" + s.run_id, e.target.value);
            }}
            placeholder="Record observations, alternatives, and the scope you have checked."
          />
          <div className="live-section-head">
            <h3>Pinned evidence</h3>
            <a href={href(s.run_id, "logs")}>Investigate logs</a>
          </div>
          {!evidence.length ? (
            <p className="live-muted">
              Pin relevant events from the logs to support your incident
              declaration.
            </p>
          ) : (
            evidence.map((e) => (
              <button
                className="live-evidence"
                key={e.event_id}
                onClick={() => onInspect(e.event_id)}
              >
                <Pin size={14} />
                <span className="mono">
                  {clock(e.virtual_clock_sec)} · {e.actor_id} ·{" "}
                  {e.session_handle}
                </span>
                <span>{e.network?.path ?? e.event_type}</span>
              </button>
            ))
          )}
          <label htmlFor="live-field-3">Timeline annotation</label>
          <input
            id="live-field-3"
            value={timelineNote}
            disabled={ended}
            onChange={(e) => setTimelineNote(e.target.value)}
            placeholder="Explain what this event establishes"
          />
          <div className="live-tags">
            {evidence.map((e) => (
              <button
                className="btn btn--sm"
                key={e.event_id}
                disabled={ended || !timelineNote}
                onClick={() => {
                  void act(
                    "workspace",
                    {
                      revision: s.workspace.revision,
                      timeline: [
                        ...s.workspace.timeline,
                        { event_id: e.event_id, note: timelineNote },
                      ],
                    },
                    "PATCH",
                  );
                  setTimelineNote("");
                }}
              >
                Add {clock(e.virtual_clock_sec)}
              </button>
            ))}
          </div>
          <ol className="live-timeline">
            {s.workspace.timeline.map((t, i) => (
              <li key={i}>
                <button
                  onClick={() => onInspect(t.event_id)}
                  className="live-link"
                >
                  {t.note}
                </button>
              </li>
            ))}
          </ol>
        </section>
        <section className="card live-pad">
          <h2>Declare and respond</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act("declare", {
                suspected_actor: actor,
                suspected_session: suspect,
                rationale,
                event_ids: s.workspace.evidence_ids,
              });
            }}
          >
            <label htmlFor="live-field-4">Suspected account</label>
            <select
              id="live-field-4"
              value={actor}
              disabled={ended}
              onChange={(e) => setActor(e.target.value)}
            >
              <option value="">Choose observed account</option>
              {actors.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <label htmlFor="live-field-5">Suspected access</label>
            <select
              id="live-field-5"
              value={suspect}
              disabled={ended}
              onChange={(e) => setSuspect(e.target.value)}
            >
              <option value="">Choose observed access</option>
              {handles.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <label htmlFor="live-field-6">Reason for declaration</label>
            <textarea
              id="live-field-6"
              value={rationale}
              disabled={ended}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Connect your evidence to the suspected activity"
            />
            <button
              className="btn btn--primary"
              disabled={
                ended ||
                busy ||
                !actor ||
                !suspect ||
                !rationale ||
                !evidence.length
              }
            >
              Declare incident
            </button>
          </form>
          {s.declaration && (
            <div className="live-response">
              <Badge tone="good">Declaration recorded</Badge>
              <p className="mono">
                {s.declaration.suspected_actor} ·{" "}
                {s.declaration.suspected_session}
              </p>
              <label htmlFor="live-field-7">Response</label>
              <select
                id="live-field-7"
                value={action}
                disabled={ended}
                onChange={(e) => {
                  setAction(e.target.value);
                  setTarget("");
                  key.current = null;
                }}
              >
                <option value="revoke_session">Revoke browser session</option>
                {s.scenario_version !== "v1" && (
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
              <label htmlFor="live-field-8">Response target</label>
              <select
                id="live-field-8"
                value={target}
                disabled={ended}
                onChange={(e) => {
                  setTarget(e.target.value);
                  key.current = null;
                }}
              >
                <option value="">
                  {action.startsWith("revoke")
                    ? s.declaration.suspected_session
                    : s.declaration.suspected_actor}
                </option>
                {(action.startsWith("revoke") ? handles : actors).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <p className="live-muted">
                {action === "temporarily_disable_account"
                  ? "Account-wide: employee work may stop. Existing access will be invalidated."
                  : action === "restore_account"
                    ? "Fresh legitimate access can resume. Revoked access stays revoked."
                    : action === "require_reauthentication"
                      ? "Account-wide: existing sessions must authenticate again."
                      : "Applies to the selected access handle. Other access remains unchanged."}
              </p>
              <button
                className="btn btn--primary"
                disabled={ended || busy}
                onClick={() =>
                  action === "temporarily_disable_account" ||
                  action === "require_reauthentication"
                    ? setConfirm(true)
                    : void response()
                }
              >
                Apply response
              </button>
              {s.applied_actions.map((a) => (
                <p className="live-receipt" key={a.action_id}>
                  <Check size={14} />
                  {title(a.action)} ·{" "}
                  <span className="mono">{a.target_handle}</span>
                </p>
              ))}
            </div>
          )}
          <div className="live-response">
            <div className="live-section-head">
              <h3>Recovery verification</h3>
              <button
                className="btn"
                disabled={ended || busy || !s.declaration}
                onClick={() => void act("verify")}
              >
                Run checks
              </button>
            </div>
            {s.verification?.checks.map((c) => (
              <div className="live-check" key={c.check_id}>
                <Badge tone={c.passed ? "good" : "warn"}>
                  {c.passed ? "Passed" : "Not recovered"}
                </Badge>
                <span>
                  {c.verification === "verify_suspicious_session_denied"
                    ? "Suspicious access denied"
                    : "Legitimate employee work"}
                </span>
              </div>
            ))}
            {!s.verification && (
              <p className="live-muted">
                Verify access denial and legitimate work independently after
                responding.
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="card live-pad">
        <div className="live-section-head">
          <h2>Case handoff</h2>
          <Badge>{s.workspace.cases[0]?.owner ?? "Unassigned"}</Badge>
        </div>
        <div className="live-form-row">
          <label htmlFor="live-field-9">Receiving analyst</label>
          <select
            id="live-field-9"
            value={handoffOwner}
            disabled={ended}
            onChange={(e) => setHandoffOwner(e.target.value)}
          >
            <option value="">Choose registered analyst</option>
            {people.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label htmlFor="live-field-10">Unresolved question / next step</label>
          <input
            id="live-field-10"
            value={handoffNext}
            disabled={ended}
            onChange={(e) => setHandoffNext(e.target.value)}
          />
          <button
            className="btn"
            disabled={ended || !handoffOwner || !handoffNext || !hypothesis}
            onClick={() =>
              void act("handoff", {
                owner:
                  people.find((p) => p.id === handoffOwner)?.name ??
                  handoffOwner,
                recipient_id: handoffOwner,
                role: "response",
                hypothesis,
                next_step: handoffNext,
              })
            }
          >
            Hand off with evidence
          </button>
        </div>
        {s.workspace.cases[0]?.notes.map((n, i) => (
          <p key={i}>
            {n.from}: {n.hypothesis} → {n.next_step}
          </p>
        ))}
      </section>
      {s.mode === "practice" && !ended && (
        <section className="card live-pad">
          <div className="live-section-head">
            <h2>Optional coaching</h2>
            <button
              className="btn"
              onClick={() =>
                void act<{ hint: string }>("hints").then(
                  (r) => r && setHint(r.hint),
                )
              }
            >
              Request next hint
            </button>
          </div>
          {hint && <p>{hint}</p>}
          <p className="live-muted">
            Assistance is recorded with your attempt.
          </p>
        </section>
      )}
      <Messages snapshot={s} />
      {confirm && (
        <Confirm
          title="Confirm account-wide response"
          text="This changes all access for the selected account and may interrupt legitimate work. Your choice will be recorded."
          onCancel={() => setConfirm(false)}
          onConfirm={() => void response()}
        />
      )}
    </>
  );
}
export function Business({ snapshot: s }: { snapshot: Snapshot }) {
  return (
    <section className="card live-pad">
      <h2>Keep Northstar working</h2>
      <p>
        These statuses come from fresh authenticated document requests. A
        security response can stop unauthorized access while interrupting an
        employee.
      </p>
      <div className="live-business">
        {s.business.map((b) => (
          <article key={b.workflow_id}>
            <div
              className={"live-business__icon " + (b.passed ? "good" : "warn")}
            >
              <Activity size={23} />
            </div>
            <h3>{title(b.user_id)} · daily work</h3>
            <Badge tone={b.passed ? "good" : "warn"}>
              {b.passed ? "Working" : "Interrupted"}
            </Badge>
            <p className="mono">HTTP {b.http_status}</p>
          </article>
        ))}
      </div>
      <p>
        Total observed interruption:{" "}
        <strong className="mono">{clock(s.disrupted_seconds)}</strong>
      </p>
      <Messages snapshot={s} />
    </section>
  );
}
export function Assets({
  events,
  onInspect,
}: {
  events: Event[];
  snapshot: Snapshot;
  onInspect: (id: string) => void;
}) {
  const handles = [
    ...new Set(
      events.map((e) => e.session_handle).filter((x): x is string => !!x),
    ),
  ];
  return (
    <section className="card live-pad">
      <h2>Observed identities and access</h2>
      <p className="live-muted">
        Inventory is built from released activity. Unobserved attacker
        attribution is not shown.
      </p>
      <div className="live-table-wrap">
        <table className="soc-table">
          <thead>
            <tr>
              <th>Access handle</th>
              <th>Account</th>
              <th>Sources</th>
              <th>Latest observed result</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {handles.map((h) => {
              const related = events.filter((e) => e.session_handle === h),
                last = related.at(-1)!;
              return (
                <tr key={h}>
                  <td className="mono">{h}</td>
                  <td>{last.actor_id}</td>
                  <td className="mono">
                    {[
                      ...new Set(
                        related.map((e) => e.network?.src_ip).filter(Boolean),
                      ),
                    ].join(", ")}
                  </td>
                  <td>{last.outcome ?? "Recorded"}</td>
                  <td>
                    <button
                      className="btn btn--sm"
                      onClick={() => onInspect(last.event_id)}
                    >
                      Inspect {related.length} events
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function Debrief({
  replay: r,
  snapshot: s,
  onInspect,
  onBranch,
}: {
  replay: Replay;
  snapshot: Snapshot;
  onInspect: (id: string) => void;
  onBranch: (id: string) => Promise<void>;
}) {
  const [at, setAt] = useState(r.events.length - 1);
  const current = r.events[at];
  const [forking, setForking] = useState(false);
  const score = r.debrief;
  return (
    <>
      <section className="card live-result">
        <div
          className="live-result__score"
          style={{
            background:
              "conic-gradient(var(--accent) " +
              score.score_total +
              "%, var(--surface-3) 0)",
          }}
        >
          <strong>{score.score_total}</strong>
          <span>out of 100</span>
        </div>
        <div>
          <Badge
            tone={score.outcome === "defended_and_recovered" ? "good" : "warn"}
          >
            {title(score.outcome)}
          </Badge>
          <h2>
            {score.outcome === "defended_and_recovered"
              ? "Threat stopped. Company recovered."
              : score.outcome === "contained_but_disrupted"
                ? "Access stopped. Employee work was disrupted."
                : score.outcome === "attacker_objective_reached"
                  ? "The protected information was read."
                  : "Review how the shift ended."}
          </h2>
          <p>
            {s.mode === "assessment"
              ? "Blind assessment"
              : s.assistance === "coached"
                ? "Coached practice"
                : "Independent practice"}{" "}
            · {r.workspace.hints_used.length} hints or assistant questions ·{" "}
            {clock(score.disrupted_seconds)} interruption
          </p>
          <a className="btn" href={"/api/runs/" + s.run_id + "/export"}>
            <Download size={15} />
            Download evidence package
          </a>
          {terminal(s.state) && <a className="btn" href={"#/live/observer/" + s.run_id}>Review recorded AI activity</a>}
        </div>
      </section>
      <MeasuredTimeline replay={r} onInspect={onInspect} />
      <LearningDebrief replay={r} onInspect={onInspect} />
      <div className="live-case-grid">
        <section className="card live-pad">
          <h2>Why you received this result</h2>
          {score.breakdown.map((d) => (
            <div className="live-score-row" key={d.dimension}>
              <div>
                <strong>{title(d.dimension)}</strong>
                <span>
                  {d.awarded} / {d.max_points}
                </span>
              </div>
              <progress
                max={d.max_points}
                value={d.awarded}
                aria-label={title(d.dimension)}
              />
              <p>{d.explanation}</p>
              <div className="live-tags">
                {d.evidence_ids.map((id) => {
                  const c = resolveCitation(id, r);
                  return c.eventId ? (
                    <button
                      className="live-filter"
                      key={id}
                      title={"Open the recorded " + c.kind + " " + id}
                      onClick={() => onInspect(c.eventId!)}
                    >
                      {c.label}
                    </button>
                  ) : (
                    <span
                      className="live-filter live-filter--static"
                      key={id}
                      title={id}
                    >
                      {c.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
        <section className="card live-pad">
          <h2>Replay the decisions</h2>
          <label htmlFor="live-field-11">Recorded event</label>
          <input
            id="live-field-11"
            type="range"
            min="0"
            max={Math.max(0, r.events.length - 1)}
            value={at}
            onChange={(e) => setAt(Number(e.target.value))}
          />
          {current && (
            <div className="live-replay-event">
              <Badge>{clock(current.virtual_clock_sec)}</Badge>
              <h3>{title(current.event_type)}</h3>
              <p className="mono">
                {current.actor_id} · {current.session_handle ?? "—"}
              </p>
              <p className="mono">
                {current.network?.path ??
                  current.resource_id ??
                  "Control event"}{" "}
                · {current.outcome ?? "recorded"}
              </p>
              {current.agent_meta && (
                <p>
                  AI chose {title(current.agent_meta.proposal.action)} using{" "}
                  {current.agent_meta.proposal.session_handle ??
                    "no access handle"}
                  .
                </p>
              )}
              <button
                className="btn"
                onClick={() => onInspect(current.event_id)}
              >
                Inspect recorded event
              </button>
            </div>
          )}
          <h3>Practice from a decision point</h3>
          <p className="live-muted">
            Creates a separate assisted run. The original trace stays unchanged.
          </p>
          {r.checkpoints.map((cp) => (
            <button
              className="live-evidence"
              key={cp.id}
              disabled={forking}
              onClick={() => {
                setForking(true);
                void onBranch(cp.id).finally(() => setForking(false));
              }}
            >
              <RotateCcw size={15} />
              {cp.label}
              <ArrowRight size={15} />
            </button>
          ))}
          <h3>Model provenance</h3>
          <p>
            {score.model_provenance.model_id} ·{" "}
            {score.model_provenance.total_decisions} decisions ·{" "}
            {score.model_provenance.fallback_count} fallbacks
          </p>
          <p className="live-muted">
            Median decision latency{" "}
            {Math.round(score.model_provenance.median_latency_ms)} ms. Replay
            uses recorded events and does not call the model.
          </p>
        </section>
      </div>
      <section className="card live-pad">
        <h2>How access moved</h2>
        <div className="live-route-map">
          {[
            ...new Set(
              r.events
                .filter((e) => e.agent_meta)
                .map((e) => e.session_handle)
                .filter(Boolean),
            ),
          ].map((h) => {
            const es = r.events.filter(
              (e) => e.session_handle === h && e.agent_meta,
            );
            return (
              <div className="live-route" key={h}>
                <Badge tone="ai">AI decision</Badge>
                <ArrowRight size={18} />
                <strong className="mono">{h}</strong>
                <ArrowRight size={18} />
                <Badge>
                  {es.some(
                    (e) =>
                      e.event_type === "document.access" &&
                      e.outcome === "allowed",
                  )
                    ? "Protected read observed"
                    : es.some((e) => e.outcome === "denied")
                      ? "Access denied"
                      : "Discovery / status"}
                </Badge>
                <span>{es.length} recorded requests</span>
              </div>
            );
          })}
        </div>
        <p className="live-muted">
          Only executed requests with direct decision links appear here.
          Proposed or rejected actions do not become attack paths.
        </p>
      </section>
    </>
  );
}
function MeasuredTimeline({
  replay,
  onInspect,
}: {
  replay: Replay;
  onInspect: (id: string) => void;
}) {
  const { markers, span } = scoreTimeline(replay);
  const measure = containmentMeasure(replay.debrief);
  const eventFor = (key: string) =>
    key === "signal"
      ? replay.debrief.first_suspicious_event_id
      : key === "declare"
        ? replay.events.find((e) => e.event_type === "declaration.submitted")
            ?.event_id
        : undefined;
  return (
    <section className="card live-pad" aria-labelledby="live-measured">
      <h2 id="live-measured">Measured timeline</h2>
      <p className="live-muted">
        Positions come from recorded scenario time. Model thinking time is not
        counted.
      </p>
      <ol className="live-measured">
        {markers.map((mk) => {
          const target = eventFor(mk.key);
          const label = (
            <>
              <span className="mono">{clock(mk.at)}</span> {mk.label}
            </>
          );
          return (
            <li key={mk.key} className={"live-measured__mark " + mk.tone}>
              {target ? (
                <button className="live-link" onClick={() => onInspect(target)}>
                  {label}
                </button>
              ) : (
                <span>{label}</span>
              )}
              <span className="live-measured__track" aria-hidden="true">
                <i style={{ left: (mk.at / span) * 100 + "%" }} />
              </span>
            </li>
          );
        })}
      </ol>
      {measure ? (
        <div
          className="live-contain"
          role="group"
          aria-label="Containment time"
        >
          <div>
            <strong>
              {measure.within
                ? "Within the target window"
                : "Outside the target window"}
            </strong>
            <span className="mono">
              {Math.round(measure.delta)}s to effective containment · target{" "}
              {measure.target}s
            </span>
          </div>
          <meter
            min={0}
            max={measure.target * 4}
            low={measure.target}
            optimum={0}
            value={Math.min(measure.delta, measure.target * 4)}
            aria-label="Seconds from first released signal to effective containment"
          />
        </div>
      ) : (
        <p className="live-muted">
          Effective containment was not measured on this shift.
        </p>
      )}
    </section>
  );
}
function Confirm({
  title: heading,
  text,
  onCancel,
  onConfirm,
}: {
  title: string;
  text: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      className="live-dialog"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      aria-labelledby="live-dialog-title"
    >
      <h2 id="live-dialog-title">{heading}</h2>
      <p>{text}</p>
      <div className="live-tags">
        <button autoFocus className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn--primary" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </dialog>
  );
}
