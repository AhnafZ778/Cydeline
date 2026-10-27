import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Shield,
  Sparkles,
  RotateCcw,
  Pause,
  Play,
} from "lucide-react";
import { TopNav, SideNav, Footer, useTitle } from "../console/Chrome";
import { type PracticePage } from "../../lib/route";
import { InspectorDrawer } from "../logs/InspectorDrawer";
import { toRows } from "../../lib/format";
import { api, draftKey, invalidateSession, terminal, type Scenario, type Snapshot } from "./types";
import { RunProvider, useRun, runHref } from "./RunContext";
import { LiveMonitoring } from "./LiveMonitoring";
import { LiveLogs } from "./LiveLogs";
import { LiveCases } from "./LiveCases";
import { LiveTools } from "./LiveTools";
import { ConsoleModal as Modal } from "./ConsoleModal";
import { Assets, Business, Debrief } from "./LiveSocApp";
import { replayRows, clock, title } from "./logic";
import { AssistantPanel } from "./AssistantPanel";
import { LearnerDesk } from "./TrainingDesk";
import { ProgressView } from "./ProgressView";
import { CompanyBriefing, LearningReferences } from "./LearningViews";
import { ExerciseCapture } from "./ExerciseCapture";
const ObserverView = lazy(() => import("./ObserverView").then(m => ({default: m.ObserverView})));
const InstructorShell = lazy(() => import("./InstructorShell").then(m => ({default: m.InstructorShell})));
const SELECTED = "soc-selected-run";
const TOOLS = [
  "monitoring",
  "logs",
  "cases",
  "endpoint",
  "email",
  "intel",
  "sandbox",
  "learn",
];
export function UnifiedConsole({ hash }: { hash: string }) {
  const parts = hash.replace(/^#\/?/, "").split("/");
  const explicit =
    parts[0] === "live" && parts[1]?.startsWith("run_") ? parts[1] : null;
  const [selected, setSelected] = useState(() =>
    sessionStorage.getItem(SELECTED),
  );
  useEffect(() => {
    if (explicit) {
      sessionStorage.setItem(SELECTED, explicit);
      setSelected(explicit);
    }
  }, [explicit]);
  useEffect(() => {
    const clear = () => {
      invalidateSession();
      sessionStorage.removeItem(SELECTED);
      setSelected(null);
      if (window.location.hash.includes("/run_")) window.location.hash = "#/";
    };
    const storage = (e: StorageEvent) => {
      if (e.key === "soc-identity-revision") clear();
    };
    window.addEventListener("soc-identity-changed", clear);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("soc-identity-changed", clear);
      window.removeEventListener("storage", storage);
    };
  }, []);
  const rid = explicit ?? selected;
  useEffect(() => {
    if (parts[0] === "practice") {
      window.location.replace(
        rid
          ? runHref(
              rid,
              TOOLS.includes(parts[1])
                ? parts.slice(1).join("/")
                : "monitoring",
            )
          : "#/",
      );
    } else if (explicit && ["case", "workstation"].includes(parts[2])) {
      window.location.replace(
        runHref(explicit, parts[2] === "case" ? "cases/case_main" : "sandbox"),
      );
    }
  }, [hash, rid]);
  let page = explicit
    ? (parts[2] ?? "monitoring")
    : parts[0] === "live" &&
        ["progress", "profile", "instructor"].includes(parts[1])
      ? parts[1]
      : "library";
  if (parts[0] === "practice" && rid) page = parts[1] ?? "monitoring";
  if (parts[0] === "live" && parts[1] === "observer") return <Suspense fallback={<p role="status">Opening observation room…</p>}><ObserverView key={parts[2] ?? "list"} runId={parts[2]} /></Suspense>;
  if (page === "instructor") return <Suspense fallback={<p role="status">Opening instructor workspace…</p>}><InstructorShell /></Suspense>;
  return (
    <RunProvider key={rid ?? "library"} rid={rid}>
      <Shell
        page={page}
        caseId={explicit && parts[2] === "cases" ? parts[3] : undefined}
        selected={rid}
      />
    </RunProvider>
  );
}
function Shell({
  page,
  caseId,
  selected,
}: {
  page: string;
  caseId?: string;
  selected: string | null;
}) {
  const m = useRun(),
    s = m.snapshot;
  const [inspect, setInspect] = useState<string | null>(null),
    [confirmEnd, setConfirmEnd] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const ended = !!s && terminal(s.state);
  const rows = useMemo(
    () => (m.replay ? replayRows(m.replay.events) : toRows(m.events)),
    [m.events, m.replay],
  );
  const row = rows.find((r) => r.id === inspect);
  useEffect(() => setInspect(null), [selected]);
  useTitle(
    (page === "monitoring"
      ? "Live Monitoring"
      : page === "library"
        ? "Mission Library"
        : title(page)) + " · Northstar",
  );
  const pin = (id: string) =>
    s && !ended
      ? m.act(
          "workspace",
          {
            revision: s.workspace.revision,
            evidence_ids: s.workspace.evidence_ids.includes(id)
              ? s.workspace.evidence_ids.filter((x) => x !== id)
              : [...s.workspace.evidence_ids, id],
          },
          "PATCH",
        )
      : Promise.resolve(undefined);
  useEffect(() => {
    if (!inspect) return;
    const key = (e: KeyboardEvent) => {
      if (
        e.key === "p" &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        void pin(inspect);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [inspect, s]);
  return (
    <div inert={immersive || undefined} className={"soc live-soc unified-soc" + (immersive ? " workspace-immersive" : "")}>
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
        <SideNav
          page={TOOLS.includes(page) ? (page as PracticePage) : undefined}
          activeHref={page === "library" ? "#/" : "#/live/" + page}
          runId={selected}
        >
          {s && <a href={runHref(s.run_id, "briefing")} aria-current={page === "briefing" ? "page" : undefined}><Shield className="icon" /><span>Company briefing</span></a>}
          {s &&
            (
              [
                ["assets", "Assets & Access", Shield],
                ["business", "Business Activity", Activity],
                ["assistant", "Evidence Assistant", Sparkles],
              ] as const
            ).map(([id, label, Icon]) => (
              <a
                key={String(id)}
                href={runHref(s.run_id, String(id))}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon className="icon" />
                <span>{String(label)}</span>
              </a>
            ))}
          {s && ended && (
            <a
              href={runHref(s.run_id, "debrief")}
              aria-current={page === "debrief" ? "page" : undefined}
            >
              <RotateCcw className="icon" />
              <span>Debrief &amp; replay</span>
            </a>
          )}
        </SideNav>
        <div className="soc__stage">
          <main id="main" tabIndex={-1}>
            {s && page !== "library" && (
              <div
                className="live-toolbar"
                role="region"
                aria-label="Live range status"
              >
                <span className="live-badge">{s.scenario.title}</span>
                <span className="live-badge">
                  {s.mode === "assessment"
                    ? "Assessment"
                    : s.assistance === "coached"
                      ? "Coached practice"
                      : "Independent practice"}
                </span>
                <span className="live-badge">{m.connection}</span>
                <span className="mono live-clock" aria-label="Time remaining">
                  {clock(s.remaining_sec)}
                </span>
                {s.state === "created" ? (
                  <button
                    className="btn"
                    disabled={m.busy}
                    onClick={() => void m.act("start")}
                  >
                    Start exercise
                  </button>
                ) : (
                  !ended && (
                    <>
                      <button
                        className="btn btn--sm"
                        aria-label={
                          s.paused ? "Resume exercise" : "Pause exercise"
                        }
                        disabled={
                          m.busy || s.mode === "assessment" || s.ai_unavailable || s.awaiting_begin
                        }
                        onClick={() => void m.act("pause")}
                      >
                        {s.paused ? (
                          <Play className="icon" />
                        ) : (
                          <Pause className="icon" />
                        )}
                      </button>
                      <button
                        className="btn btn--sm"
                        onClick={() => setConfirmEnd(true)}
                      >
                        End shift
                      </button>
                    </>
                  )
                )}
                {ended && (
                  <a
                    className="btn btn--sm"
                    href={runHref(s.run_id, "debrief")}
                  >
                    Open debrief
                  </a>
                )}
                {s.paused && (
                  <span className="live-badge warn">Exercise paused</span>
                )}
              </div>
            )}
            {m.error && page !== "library" && (
              <p className="live-error" role="alert">
                {m.error}
                <button
                  className="btn btn--sm"
                  onClick={() =>
                    void m.refresh().catch((e) => m.setError(e.message))
                  }
                >
                  Reconnect
                </button>
              </p>
            )}
            {s?.ai_unavailable && !ended && (
              <section className="live-error" role="alert">
                <strong>AI unavailable — Retry</strong>
                <span>
                  The exercise clock is system-paused. No substitute attack was
                  executed.
                </span>
                <button
                  className="btn"
                  disabled={m.busy || s.model_status === "thinking"}
                  onClick={() => void m.act("ai/retry")}
                >
                  {m.busy ? "Retrying pending turn…" : "Retry AI"}
                </button>
              </section>
            )}
            {s && !ended && TOOLS.includes(page) && <ExerciseCapture runId={s.run_id} />}
            {s?.awaiting_begin && !ended && page !== "library" && <section className="soc__panel learning-begin" aria-label="Investigation ready">
              <h2>Ready to investigate?</h2>
              <p>The clock and adversary are paused. <a href={runHref(s.run_id, "briefing")}>Revisit the company briefing</a> whenever you need it.</p>
              <button className="btn btn--primary" disabled={m.busy} onClick={() => void m.act("begin")}>Begin investigation</button>
            </section>}
            {page === "library" ? (
              <Landing />
            ) : page === "progress" ? (
              <ProgressView />
            ) : page === "profile" ? (
              <LearnerDesk />
            ) : !s ? (
              <section className="soc__panel">
                <h1>Connecting to your exercise…</h1>
                <p>
                  Your case remains saved.{" "}
                  <a href="#/">Return to Mission Library</a>
                </p>
              </section>
            ) : (
              <div key={s.run_id}>
                {page === "monitoring" ? (
                  <>
                    <LiveMonitoring />
                  </>
                ) : page === "briefing" ? (
                  <><h1>Company briefing</h1><CompanyBriefing briefing={s.scenario.briefing} expanded /></>
                ) : page === "learn" ? (
                  <><h1>Learning desk</h1><LearningReferences exercises /></>
                ) : page === "logs" ? (
                  <LiveLogs onInspect={setInspect} />
                ) : page === "cases" ? (
                  <LiveCases caseId={caseId} onInspect={setInspect} />
                ) : page === "assets" ? (
                  <>
                    <h1>Assets &amp; Access</h1>
                    <Assets
                      events={m.events}
                      snapshot={s}
                      onInspect={setInspect}
                    />
                  </>
                ) : page === "business" ? (
                  <>
                    <h1>Business Activity</h1>
                    <Business snapshot={s} />
                  </>
                ) : page === "assistant" ? (
                  <AssistantPanel
                    snapshot={s}
                    events={m.events}
                    onInspect={setInspect}
                  />
                ) : page === "debrief" ? (
                  ended ? (
                    m.replay ? (
                      <Debrief
                        replay={m.replay}
                        snapshot={s}
                        onInspect={setInspect}
                        onBranch={async (id) => {
                          const b = await m.act<Snapshot>("branches", {
                            checkpoint_id: id,
                          });
                          if (b)
                            window.location.hash = runHref(b.run_id, "cases");
                        }}
                      />
                    ) : (
                      <p role="status">Loading recorded replay…</p>
                    )
                  ) : (
                    <p>Final feedback is available after the exercise ends.</p>
                  )
                ) : (
                  <LiveTools page={page} onFocusChange={setImmersive} />
                )}
                {s.workspace.messages.length > 0 && (
                  <details className="soc__panel">
                    <summary>
                      Shift messages ({s.workspace.messages.length})
                    </summary>
                    {s.workspace.messages.map((msg) => (
                      <p key={msg.id}>
                        <b>{msg.from}</b>: {msg.text}
                      </p>
                    ))}
                  </details>
                )}
              </div>
            )}
          </main>
          <Footer />
        </div>
      </div>
      {row && s && (
        <InspectorDrawer
          row={row}
          allRows={rows}
          pinned={s.workspace.evidence_ids.includes(row.id)}
          onClose={() => setInspect(null)}
          onPin={() => void pin(row.id)}
          onSelect={setInspect}
          onAddTerm={(term) => {
            sessionStorage.setItem(
              draftKey(s.run_id, "logs-mode"),
              JSON.stringify("pro"),
            );
            sessionStorage.setItem(
              draftKey(s.run_id, "logs-pro"),
              JSON.stringify(term.key + ":" + term.value),
            );
            sessionStorage.setItem(
              draftKey(s.run_id, "logs-appliedPro"),
              JSON.stringify(term.key + ":" + term.value),
            );
            setInspect(null);
            window.location.hash = runHref(s.run_id, "logs");
          }}
          readOnly={ended}
        />
      )}
      {confirmEnd && s && (
        <Modal title="End this shift?" onClose={() => setConfirmEnd(false)}>
          <p>
            Finish using the current target results, or abort the exercise. The
            saved record remains available.
          </p>
          <div className="soc__modal-actions">
            <button
              className="btn"
              data-autofocus
              onClick={() => setConfirmEnd(false)}
            >
              Keep investigating
            </button>
            <button
              className="btn btn--primary"
              disabled={m.busy}
              onClick={() =>
                void m.act<Snapshot>("finish").then((r) => {
                  if (r) {
                    setConfirmEnd(false);
                    window.location.hash = runHref(s.run_id, "debrief");
                  }
                })
              }
            >
              Finish &amp; evaluate
            </button>
            <button
              className="btn btn--danger"
              disabled={m.busy}
              onClick={() =>
                void m.act<Snapshot>("abort").then((r) => {
                  if (r) {
                    setConfirmEnd(false);
                    window.location.hash = runHref(s.run_id, "debrief");
                  }
                })
              }
            >
              Abort exercise
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
type History = {
  run_id: string;
  scenario_id: string;
  state: string;
  outcome: string | null;
};
function Landing() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]),
    [history, setHistory] = useState<History[]>([]),
    [health, setHealth] = useState<{
      model: { available: boolean; name: string };
    } | null>(null),
    [error, setError] = useState<string | null>(null),
    [chosen, setChosen] = useState<Scenario | null>(null),
    [mode, setMode] = useState("practice"),
    [assist, setAssist] = useState("coached"),
    [variant, setVariant] = useState("baseline"),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [sc, r, h] = await Promise.all([
        api<{ scenarios: Scenario[] }>("/scenarios"),
        api<{ runs: History[] }>("/runs"),
        api<{ model: { available: boolean; name: string } }>("/health"),
      ]);
      setScenarios(sc.scenarios);
      setHistory(r.runs);
      setHealth(h);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, []);
  const active = history.find((r) => !terminal(r.state));
  async function resume(r: History) {
    setBusy(true);
    try {
      if (r.state === "created")
        await api("/runs/" + r.run_id + "/start", "POST");
      window.location.hash = runHref(r.run_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function launch() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const runs = await api<{ runs: History[] }>("/runs");
      const existing = runs.runs.find((r) => !terminal(r.state));
      if (existing) {
        setHistory(runs.runs);
        setChosen(null);
        return;
      }
      const created = await api<Snapshot>("/runs", "POST", {
        scenario_id: chosen.scenario_id,
        scenario_version: chosen.version,
        mode,
        assistance: mode === "assessment" ? "blind" : assist,
        variant_id: variant,
      });
      setHistory((h) => [
        {
          run_id: created.run_id,
          scenario_id: created.scenario_id,
          state: "created",
          outcome: null,
        },
        ...h,
      ]);
      await api("/runs/" + created.run_id + "/start", "POST");
      window.location.hash = runHref(created.run_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const cards = [
    ["stolen-session", "v1", "The Stolen Session"],
    ["northstar-breach", "v2", "The Reporting Blind Spot"],
  ];
  return (
    <>
      <div className="live-heading">
        <div>
          <span className="eyebrow">Northstar Analytics · Training range</span>
          <h1>Choose your investigation</h1>
          <p>
            Investigate live activity. Respond to an AI adversary. Keep the
            company working.
          </p>
        </div>
        <span className="live-badge">
          Fictional company · isolated training
        </span>
      </div>
      {error && (
        <p className="live-error" role="alert">
          {error}
        </p>
      )}
      {active && (
        <section className="soc__panel soc-resume">
          <h2>Exercise already running</h2>
          <p>
            {scenarios.find((s) => s.scenario_id === active.scenario_id)
              ?.title ?? active.scenario_id}{" "}
            is saved. Resume it before starting another company.
          </p>
          <button
            className="btn btn--primary"
            disabled={busy}
            onClick={() => void resume(active)}
          >
            Resume exercise
          </button>
        </section>
      )}
      <div className="live-scenario-grid soc-scenario-cards">
        {cards.map(([id, version, label]) => {
          const sc = scenarios.find(
            (s) => s.scenario_id === id && s.version === version,
          );
          return (
            <article className="live-scenario" key={id}>
              <div className="live-scenario__meta">
                <span className="live-badge">
                  {sc?.difficulty ??
                    (id === "stolen-session" ? "Introductory" : "Standard")}
                </span>
                <span>
                  {sc
                    ? Math.round(sc.duration_sec / 60)
                    : id === "stolen-session"
                      ? 3
                      : 12}{" "}
                  min
                </span>
              </div>
              <h2>{label}</h2>
              <p>
                {sc?.summary ??
                  (id === "stolen-session"
                    ? "Investigate compromised browser access in a short identity incident."
                    : "Investigate browser access and a reporting service across a longer incident.")}
              </p>
              <p
                className={
                  "live-badge " + (health?.model.available ? "good" : "warn")
                }
              >
                {health?.model.available
                  ? "AI ready · " + health.model.name
                  : "AI unavailable"}
              </p>
              <button
                className="btn btn--primary"
                disabled={busy || !sc || !!active}
                onClick={() => {
                  setMode("practice");
                  setAssist("coached");
                  setVariant("baseline");
                  setChosen(sc!);
                }}
              >
                Start scenario
              </button>
            </article>
          );
        })}
      </div>
      {!health?.model.available && (
        <p role="status">
          AI must be ready before an exercise can start.{" "}
          <button className="btn btn--sm" onClick={() => void load()}>
            Retry AI readiness
          </button>
        </p>
      )}
      {history.some((r) => terminal(r.state)) && (
        <section className="soc__panel">
          <h2>Recent exercises</h2>
          <div className="live-history">
            {history
              .filter((r) => terminal(r.state))
              .map((r) => (
                <a key={r.run_id} href={runHref(r.run_id, "debrief")}>
                  <span>
                    {scenarios.find((sc) => sc.scenario_id === r.scenario_id)
                      ?.title ?? r.scenario_id}
                  </span>
                  <span className="live-badge">
                    {title(r.outcome ?? r.state)}
                  </span>
                </a>
              ))}
          </div>
        </section>
      )}
      {chosen && (
        <Modal title={"Start " + chosen.title} briefing onClose={() => { if (!busy) setChosen(null); }} footer={<>
          {error && <p role="alert">{error}</p>}
          <button className="btn" disabled={busy} onClick={() => setChosen(null)}>Cancel</button>
          <button className="btn btn--primary" data-testid="live-start" disabled={busy || !health?.model.available} onClick={() => void launch()}>{busy ? "Preparing company…" : "Start scenario"}</button>
        </>}>
          <CompanyBriefing briefing={chosen.briefing} expanded />
          <div className="live-launch">
            {!!chosen.variants?.length && <><label htmlFor="launch-variant">Company variation</label>
              <select id="launch-variant" value={variant} onChange={e => setVariant(e.target.value)}>
                {chosen.variants.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select></>}
            <label htmlFor="launch-mode">Training mode</label>
            <select
              id="launch-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="practice">Practice</option>
              <option value="assessment">Assessment</option>
            </select>
            {mode === "practice" && (
              <>
                <label htmlFor="launch-assistance">Assistance</label>
                <select
                  id="launch-assistance"
                  value={assist}
                  onChange={(e) => setAssist(e.target.value)}
                >
                  <option value="coached">Coached practice</option>
                  <option value="independent">Independent practice</option>
                </select>
              </>
            )}
            <p>
              {mode === "assessment"
                ? "Assessment uses blind investigation and cannot be manually paused."
                : assist === "coached" ? "Coached practice starts paused. Read the briefing and choose Begin investigation when you are ready." : "Independent practice begins immediately. Manual pause remains available."}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
