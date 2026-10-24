import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api, type ProgressData } from "./types";
import { title } from "./logic";

const CONDITIONS: [string, string][] = [
  ["practice-coached", "Coached practice"],
  ["practice-independent", "Independent practice"],
  ["assessment", "Assessment"],
];
const DIMENSIONS = [
  "recognition",
  "containment",
  "verification",
  "continuity",
  "proportionality",
  "timeliness",
];
const href = (rid: string) => "#/live/" + rid + "/debrief";

export function ProgressView() {
  const [data, setData] = useState<ProgressData | null>(null),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<ProgressData>("/progress")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);
  const counted = data?.attempts.filter((a) => a.counts_toward_progress) ?? [];
  const excluded =
    data?.attempts.filter((a) => !a.counts_toward_progress) ?? [];
  return (
    <>
      <h1>Skills built through practice</h1>
      <p>Each result links to the evidence and conditions of that attempt.</p>
      {error && (
        <div className="live-error" role="alert">
          {error}
        </div>
      )}
      {!data && !error && <p role="status">Loading your recorded attempts…</p>}
      {data && (
        <>
          <p className="live-muted" data-testid="progress-policy">
            {data.policy} {data.counted} counted · {data.excluded} not counted.
          </p>
          {!data.counted && (
            <section className="card live-pad">
              <h2>No counted attempts yet</h2>
              <p>
                Finish a shift to build your evidence-linked profile. Skill
                percentages appear only after a counted attempt, so none are
                shown here.
              </p>
            </section>
          )}
          {CONDITIONS.filter(([key]) => data.competency[key]).map(
            ([key, label]) => {
              const c = data.competency[key];
              return (
                <section
                  className="card live-pad"
                  key={key}
                  aria-labelledby={"cond-" + key}
                >
                  <div className="live-section-head">
                    <h2 id={"cond-" + key}>{label}</h2>
                    <span className="live-badge">
                      {c.attempts} attempt{c.attempts === 1 ? "" : "s"} · mean{" "}
                      {c.mean_score}/100
                    </span>
                  </div>
                  <div className="live-skills">
                    {DIMENSIONS.map((dim) => {
                      const d = c.dimensions[dim];
                      return (
                        <div key={dim} className="live-skill">
                          <span>{title(dim)}</span>
                          <strong className="mono">
                            {d?.average_pct == null ? "—" : d.average_pct + "%"}
                          </strong>
                          <meter
                            min={0}
                            max={100}
                            value={d?.average_pct ?? 0}
                            aria-label={title(dim) + " average across " + label}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="live-muted">
                    Averages never include other conditions, branches, early
                    exits, technical failures or runs with model fallback.
                  </p>
                </section>
              );
            },
          )}
          {data.by_scenario.length > 0 && (
            <section className="card live-pad">
              <h2>By mission</h2>
              <div className="live-table-wrap">
                <table className="soc-table">
                  <thead>
                    <tr>
                      <th>Mission</th>
                      <th>Counted attempts</th>
                      <th>Mean score</th>
                      <th>Outcomes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_scenario.map((s) => (
                      <tr key={s.scenario_id + s.scenario_version}>
                        <td>
                          {title(s.scenario_id)}{" "}
                          <span className="mono">{s.scenario_version}</span>
                        </td>
                        <td className="mono">{s.attempts}</td>
                        <td className="mono">{s.mean_score}</td>
                        <td>
                          {Object.entries(s.outcomes)
                            .map(([o, n]) => `${title(o)} × ${n}`)
                            .join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {data.adversary.attempts > 0 && (
            <section className="card live-pad" aria-labelledby="adv-perf">
              <h2 id="adv-perf">AI adversary performance</h2>
              <p className="live-muted">
                Shown separately from your skills. It describes the local model
                on this host and these missions only.
              </p>
              <div className="live-kpis">
                <div className="card live-kpi">
                  <span>Reached the protected document</span>
                  <strong className="mono">
                    {data.adversary.objective_reached} /{" "}
                    {data.adversary.attempts}
                  </strong>
                </div>
                <div className="card live-kpi">
                  <span>Median decision latency</span>
                  <strong className="mono">
                    {data.adversary.median_decision_latency_ms == null
                      ? "—"
                      : data.adversary.median_decision_latency_ms + " ms"}
                  </strong>
                </div>
                <div className="card live-kpi">
                  <span>Runs set aside for model fallback</span>
                  <strong className="mono">
                    {data.adversary.excluded_for_model_fallback}
                  </strong>
                </div>
              </div>
            </section>
          )}
          <section className="card live-pad">
            <h2>Recorded attempts</h2>
            {!counted.length && (
              <p className="live-muted">No counted attempts.</p>
            )}
            {counted.map((a) => (
              <a className="live-attempt" key={a.run_id} href={href(a.run_id)}>
                <span>{title(a.scenario_id)}</span>
                <span className="live-badge">
                  {a.condition.replace("practice-", "practice · ")}
                </span>
                <strong>{a.score.score_total}/100</strong>
                <ArrowRight size={16} />
              </a>
            ))}
            {excluded.length > 0 && (
              <>
                <h3>Not counted toward your skills</h3>
                {excluded.map((a) => (
                  <a
                    className="live-attempt"
                    key={a.run_id}
                    href={href(a.run_id)}
                  >
                    <span>{title(a.scenario_id)}</span>
                    <span className="live-badge warn">
                      {a.branch
                        ? "Practice branch"
                        : title(a.outcome ?? a.state)}
                    </span>
                    <span className="live-muted">{a.exclusion_reason}</span>
                    <ArrowRight size={16} />
                  </a>
                ))}
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
