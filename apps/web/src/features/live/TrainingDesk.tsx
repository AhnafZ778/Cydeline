import { useEffect, useState } from "react";
import { api, terminal, type Snapshot, type Scenario } from "./types";
import { openWorkspaceMode } from "./ModeSwitch";
import { CompanyBriefing } from "./LearningViews";
import { ConsoleModal } from "./ConsoleModal";
type Profile = { id: string; name: string; role?: string; local_demo?: boolean };
type Cohort = { id: string; name: string; member_ids: string[] };
type Assignment = {
  id: string;
  title: string;
  scenario_id: string;
  scenario_version: string;
  mode: string;
  assistance: string;
  cohort_id: string;
  attempts?: { run_id: string; state: string; outcome: string | null }[];
};
type Dashboard = {
  profiles: Profile[];
  cohorts: Cohort[];
  assignments: Assignment[];
  runs: Snapshot[];
};
const href = (id: string) => "#/live/" + id + "/monitoring";
function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p className="live-error" role="alert">
      {error}
    </p>
  ) : null;
}
export function LearnerDesk() {
  const [session, setSession] = useState<Profile | null>(null),
    [code, setCode] = useState(""),
    [error, setError] = useState<string | null>(null),
    [assignments, setAssignments] = useState<Assignment[]>([]),
    [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<{assignment: Assignment; scenario: Scenario} | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  async function load() {
    const [s, a] = await Promise.all([
      api<Profile>("/session"),
      api<{ assignments: Assignment[] }>("/assignments"),
    ]);
    setSession(s);
    setAssignments(a.assignments);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function login() {
    setBusy(true);
    try {
      await api("/session", "POST", { code });
      setCode("");
      await load();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function start(id: string) {
    setBusy(true);
    setLaunchError(null);
    try {
      const s = await api<Snapshot>("/assignments/" + id + "/start", "POST");
      window.location.hash = href(s.run_id);
    } catch (e) {
      setLaunchError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function prepare(assignment: Assignment) {
    setBusy(true); setError(null); setLaunchError(null);
    try {
      const catalog = await api<{scenarios: Scenario[]}>("/scenarios");
      const scenario = catalog.scenarios.find(s => s.scenario_id === assignment.scenario_id && s.version === assignment.scenario_version);
      if (!scenario?.briefing) throw new Error("The assigned company briefing is unavailable. Reconnect and try again before starting.");
      setChosen({assignment, scenario});
    } catch(e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <>
      <h1>Your training desk</h1>
      <ErrorText error={error} />
      <section className="card live-pad">
        <h2>{session?.name ?? "Learner profile"}</h2>
        <details><summary>{session?.local_demo ? "Join assigned training (optional)" : "Open an assigned profile"}</summary><p>
          Use the access code supplied by your instructor to return to your
          assigned work and recorded attempts.
        </p>
        <form
          className="live-form-row"
          onSubmit={(e) => {
            e.preventDefault();
            void login();
          }}
        >
          <label htmlFor="learner-code">Learner access code</label>
          <input
            id="learner-code"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button className="btn btn--primary" disabled={busy}>
            Open profile
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() =>
              void api("/session/logout", "POST")
                .then(load)
                .catch((e) => setError(e.message))
            }
          >
            Sign out
          </button>
        </form>
        </details>
        {session?.local_demo && <p>Local training is ready. No access code is needed to start a mission or switch to the instructor workspace.</p>}
      </section>
      <section className="card live-pad">
        <h2>Assigned exercises</h2>
        {!assignments.length && (
          <p>
            No exercises assigned to this profile. You can also choose a mission
            from the library.
          </p>
        )}
        {assignments.map((a) => (
          <article className="live-assignment" key={a.id}>
            <h3>{a.title}</h3>
            <p>
              {a.scenario_id} · {a.scenario_version} · {a.mode} · {a.assistance}
            </p>
            {a.attempts?.map((r) => (
              <a className="live-attempt" key={r.run_id} href={href(r.run_id)}>
                {r.run_id}
                <strong>{r.outcome ?? r.state}</strong>
              </a>
            ))}
            <button
              className="btn"
              disabled={
                busy || (a.mode === "assessment" && !!a.attempts?.length)
              }
              onClick={() => void prepare(a)}
            >
              {a.attempts?.length ? "Practice again" : "Start assignment"}
            </button>
          </article>
        ))}
      </section>
      {chosen && <ConsoleModal title={"Start " + chosen.assignment.title} briefing onClose={() => { if (!busy) setChosen(null); }} footer={<>
        <ErrorText error={launchError} />
        <button className="btn" disabled={busy} onClick={() => setChosen(null)}>Cancel</button><button className="btn btn--primary" disabled={busy} onClick={() => void start(chosen.assignment.id)}>{busy ? "Starting…" : "Start assigned exercise"}</button>
      </>}>
        <CompanyBriefing briefing={chosen.scenario.briefing} expanded />
        <p>{chosen.scenario.title} · {chosen.assignment.mode} · {chosen.assignment.assistance}. These conditions are set by your instructor.</p>
      </ConsoleModal>}
    </>
  );
}
export function InstructorDesk() {
  const [localDemo, setLocalDemo] = useState(false);
  const [pin, setPin] = useState(""),
    [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState<string | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [cohortName, setCohortName] = useState(""),
    [members, setMembers] = useState<string[]>([]),
    [cohort, setCohort] = useState(""),
    [scenario, setScenario] = useState("stolen-session"),
    [scenarios, setScenarios] = useState<Scenario[]>([]),
    [assignmentTitle, setAssignmentTitle] = useState(""),
    [mode, setMode] = useState("practice"),
    [assistance, setAssistance] = useState("coached"),
    [runId, setRunId] = useState(""),
    [message, setMessage] = useState(""),
    [sender, setSender] = useState("Shift lead"),
    [busy, setBusy] = useState(false);
  async function load() {
    const [d, s] = await Promise.all([
      api<Dashboard>("/instructor"),
      api<{ scenarios: Scenario[] }>("/scenarios"),
    ]);
    setData(d);
    setScenarios(s.scenarios);
  }
  useEffect(() => {
    void api<Profile>("/session").then(s => setLocalDemo(!!s.local_demo)).catch(() => {});
    void load().catch(() => {});
  }, []);
  async function command(
    path: string,
    p: unknown,
    after?: (result: unknown) => void,
  ) {
    setBusy(true);
    setError(null);
    try {
      const result = await api(path, "POST", p);
      after?.(result);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const learners =
    data?.profiles.filter(
      (p) => p.name !== "Instructor" && p.name !== "Local learner",
    ) ?? [];
  return (
    <>
      <h1>Instructor desk</h1>
      <p>Manage training here. Open Live observation to follow the trainee and the AI side by side.</p>
      <ErrorText error={error} />
      {!data && localDemo ? <section className="soc__panel"><h2>Local instructor workspace</h2><p>Open management and live observation without an access code.</p><button className="btn btn--primary" disabled={busy} onClick={() => { setBusy(true); void openWorkspaceMode("instructor", true).catch(e => { setError(e.message); setBusy(false); }); }}>Enter instructor mode</button></section> : !data ? (
        <form
          className="card live-pad live-login"
          onSubmit={(e) => {
            e.preventDefault();
            void command("/session", { code: pin });
          }}
        >
          <h2>Open your instructor workspace</h2>
          <label htmlFor="instructor-code">Instructor access code</label>
          <input
            id="instructor-code"
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
          />
          <button className="btn btn--primary" disabled={busy}>
            Unlock
          </button>
        </form>
      ) : (
        <>
          <div className="live-kpis">
            <article className="card live-pad">
              <span>Learners</span>
              <h2>{learners.length}</h2>
            </article>
            <article className="card live-pad">
              <span>Cohorts</span>
              <h2>{data.cohorts.length}</h2>
            </article>
            <article className="card live-pad">
              <span>Recorded shifts</span>
              <h2>{data.runs.length}</h2>
            </article>
          </div>
          <details className="instructor-management"><summary>Learners &amp; cohorts</summary><div className="live-case-grid">
            <section className="card live-pad">
              <h2>Add a learner</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void command("/instructor/profiles", { name }, (r) => {
                    setCode((r as { access_code: string }).access_code);
                    setName("");
                  });
                }}
              >
                <label htmlFor="new-learner-name">Learner name</label>
                <input
                  id="new-learner-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <button className="btn" disabled={busy}>
                  Create access code
                </button>
              </form>
              {code && (
                <p role="status">
                  Share this learner access code:{" "}
                  <strong className="mono">{code}</strong>
                </p>
              )}
              <h3>Registered learners</h3>
              {learners.map((p) => (
                <p key={p.id}>{p.name}</p>
              ))}
            </section>
            <section className="card live-pad">
              <h2>Create a cohort</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void command(
                    "/instructor/cohorts",
                    { name: cohortName, member_ids: members },
                    () => {
                      setCohortName("");
                      setMembers([]);
                    },
                  );
                }}
              >
                <label htmlFor="cohort-name">Cohort name</label>
                <input
                  id="cohort-name"
                  value={cohortName}
                  onChange={(e) => setCohortName(e.target.value)}
                  required
                />
                <fieldset>
                  <legend>Learners</legend>
                  {learners.map((p) => (
                    <label className="live-check" key={p.id}>
                      <input
                        type="checkbox"
                        checked={members.includes(p.id)}
                        onChange={(e) =>
                          setMembers(
                            e.target.checked
                              ? [...members, p.id]
                              : members.filter((id) => id !== p.id),
                          )
                        }
                      />
                      {p.name}
                    </label>
                  ))}
                </fieldset>
                <button className="btn" disabled={busy || !members.length}>
                  Save cohort
                </button>
              </form>
              {data.cohorts.map((c) => (
                <p key={c.id}>
                  {c.name} · {c.member_ids.length} learners
                </p>
              ))}
            </section>
          </div>
          </details>
          <details className="instructor-management"><summary>Assignments</summary><section className="card live-pad">
            <h2>Assign an exercise</h2>
            <form
              className="live-form-row"
              onSubmit={(e) => {
                e.preventDefault();
                const sc = scenarios.find((s) => s.scenario_id === scenario);
                if (sc)
                  void command(
                    "/instructor/assignments",
                    {
                      title: assignmentTitle,
                      cohort_id: cohort,
                      scenario_id: sc.scenario_id,
                      scenario_version: sc.version,
                      mode,
                      assistance,
                    },
                    () => setAssignmentTitle(""),
                  );
              }}
            >
              <label htmlFor="assignment-title">Assignment title</label>
              <input
                id="assignment-title"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                required
              />
              <label htmlFor="assignment-cohort">Cohort</label>
              <select
                id="assignment-cohort"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                required
              >
                <option value="">Choose cohort</option>
                {data.cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <label htmlFor="assignment-scenario">Scenario</label>
              <select
                id="assignment-scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                {scenarios.map((s) => (
                  <option value={s.scenario_id} key={s.scenario_id}>
                    {s.title} · {s.version}
                  </option>
                ))}
              </select>
              <label htmlFor="assignment-mode">Mode</label>
              <select
                id="assignment-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="practice">Practice</option>
                <option value="assessment">Assessment</option>
              </select>
              <label htmlFor="assignment-assistance">Assistance</label>
              <select
                id="assignment-assistance"
                value={mode === "assessment" ? "blind" : assistance}
                disabled={mode === "assessment"}
                onChange={(e) => setAssistance(e.target.value)}
              >
                <option value="coached">Coached</option>
                <option value="independent">Independent</option>
                <option value="blind">Blind</option>
              </select>
              <button className="btn btn--primary" disabled={busy || !cohort}>
                Publish assignment
              </button>
            </form>
            <p className="live-muted">
              Scenario version and conditions are fixed when assigned.
              Assessments permit one recorded attempt per learner.
            </p>
            {data.assignments.map((a) => (
              <p key={a.id}>
                <strong>{a.title}</strong> · {a.scenario_id}{" "}
                {a.scenario_version} · {a.mode} ·{" "}
                {data.cohorts.find((c) => c.id === a.cohort_id)?.name}
              </p>
            ))}
          </section>
          </details>
          <details className="instructor-management"><summary>Shift communication</summary><section className="card live-pad">
            <h2>Live shift communication</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void command(
                  "/instructor/runs/" + runId + "/injects",
                  { sender, message },
                  () => setMessage(""),
                );
              }}
            >
              <label htmlFor="inject-run">Active shift</label>
              <select
                id="inject-run"
                value={runId}
                onChange={(e) => setRunId(e.target.value)}
                required
              >
                <option value="">Choose active shift</option>
                {data.runs
                  .filter((r) => !terminal(r.state))
                  .map((r) => (
                    <option key={r.run_id} value={r.run_id}>
                      {r.scenario.title} · {r.run_id}
                    </option>
                  ))}
              </select>
              <label htmlFor="inject-sender">From</label>
              <select
                id="inject-sender"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              >
                {["Shift lead", "Operations desk", "Employee support"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
              <label htmlFor="inject-message">Message</label>
              <textarea
                id="inject-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                required
              />
              <button className="btn" disabled={busy || !runId}>
                Send recorded inject
              </button>
            </form>
          </section>
          </details>
          <section className="card live-pad">
            <h2>Exercises and after-action review</h2>
            {data.runs.map((r) => (
              <a
                className="live-attempt"
                key={r.run_id}
                href={
                  (terminal(r.state) ? "#/live/" : "#/live/observer/") +
                  r.run_id +
                  (terminal(r.state) ? "/debrief" : "")
                }
              >
                <strong>{r.scenario.title}</strong>
                <span>
                  {r.mode} · {r.assistance}
                </span>
                <span>{r.outcome ?? r.state}</span>
              </a>
            ))}
          </section>
        </>
      )}
    </>
  );
}
