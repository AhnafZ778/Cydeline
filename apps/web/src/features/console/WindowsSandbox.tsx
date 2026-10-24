import { useEffect, useState } from "react";
import { AnalystTools } from "../live/AnalystTools";
import { api, type Snapshot } from "../live/types";

type Run = Pick<Snapshot, "run_id" | "mode"> & { state: string };

export function WindowsSandbox() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let disposed = false;
    api<{ runs: Run[] }>("/runs").then((result) => {
      if (disposed) return;
      setRuns(result.runs);
      setSelected(result.runs[0]?.run_id ?? "");
    }).catch((e: Error) => { if (!disposed) setError(e.message); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, []);
  const run = runs.find((item) => item.run_id === selected);
  return <section className="soc__panel" aria-label="Sandbox">
    <header className="soc__panel-head"><h1>Sandbox</h1></header>
    <div className="soc__cards"><article className="soc__card">
      <h2>Windows workstation</h2>
      <p>Open a Windows virtual machine in your browser to investigate an exercise’s released evidence.</p>
      {loading ? <p role="status">Loading your exercises…</p> : error ? <p role="alert">{error}</p> : runs.length === 0 ?
        <p>Start a live mission first, then return here to connect to its Windows workstation.</p> :
        <label>Exercise <select aria-label="Windows exercise" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {runs.map((item) => <option key={item.run_id} value={item.run_id}>{item.run_id} · {item.state}</option>)}
        </select></label>}
      <p><a className="btn" href="#/live">Live missions</a></p>
    </article></div>
    {run && <AnalystTools key={run.run_id} snapshot={run} desktopOnly />}
  </section>;
}
