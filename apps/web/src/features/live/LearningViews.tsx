import { useEffect, useState } from "react";
import { api, type Briefing, type Replay, type Snapshot } from "./types";

export function CompanyBriefing({ briefing: b }: { briefing?: Briefing }) {
  if (!b) return null;
  return <details className="soc__panel learning-briefing">
    <summary>Company briefing and response policy</summary>
    <h3>Your role</h3><p>{b.role}</p><p>{b.authority}</p>
    <h3>Normal work</h3><ul>{b.normal_work.map(x => <li key={x}>{x}</li>)}</ul>
    <h3>Evidence and its limits</h3><p>{b.evidence_limits}</p>
    <h3>When to escalate</h3><p>{b.escalation_policy}</p>
    <h3>What recovery means</h3><p>{b.recovery_policy}</p>
    <h3>Assessment rubric</h3><p>{b.assessment}</p>
  </details>;
}

type Exercise = { id: string; title: string; prompt: string; choices: string[]; answer: number; explanation: string };
type Material = { references: { id: string; title: string; text: string }[]; exercises: Exercise[] };
export function LearningReferences({ exercises = false }: { exercises?: boolean }) {
  const [material, setMaterial] = useState<Material | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void api<Material>("/learning").then(r => { if (active) { setMaterial(r); setError(""); } })
      .catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [retry]);
  return <section className="soc__panel learning-references" aria-label="Learning references">
    <h2>{exercises ? "Short learning exercises" : "Authored reference material"}</h2>
    <p>{exercises ? "Optional examples to practice a concept. These are separate from live company evidence and do not affect your exercise score." : "These references remain available when the local coach is unavailable, including during assessment."}</p>
    {error && <p role="alert">{error} <button className="btn" onClick={() => setRetry(x => x + 1)}>Reconnect references</button></p>}
    {!material && !error && <p role="status">Loading learning material…</p>}
    {material?.references.map(r => <details key={r.id}><summary>{r.title}</summary><p>{r.text}</p></details>)}
    {exercises && material?.exercises.map(e => <MicroExercise key={e.id} exercise={e} />)}
  </section>;
}
function MicroExercise({ exercise: e }: { exercise: Exercise }) {
  const [choice, setChoice] = useState<number | null>(null), [checked, setChecked] = useState(false);
  return <form className="learning-exercise" onSubmit={event => { event.preventDefault(); setChecked(true); }}>
    <fieldset><legend>{e.title}</legend><p>{e.prompt}</p>
      {e.choices.map((c, i) => <label key={c}><input type="radio" name={e.id} checked={choice === i} onChange={() => { setChoice(i); setChecked(false); }} /> {c}</label>)}
    </fieldset>
    <button className="btn" disabled={choice === null}>Check my reasoning</button>
    {checked && <p role="status">{choice === e.answer ? "That reasoning is supported. " : "Review the distinction. "}{e.explanation}</p>}
  </form>;
}

export function LearningDebrief({ replay: r, onInspect }: { replay: Replay; onInspect: (id: string) => void }) {
  const learning = r.learning;
  const [next, setNext] = useState("independent"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  if (!learning) return null;
  async function another() {
    setBusy(true); setError("");
    try {
      const created = await api<Snapshot>("/runs/" + r.run_id + "/variations", "POST", {
        mode: next === "assessment" ? "assessment" : "practice", assistance: next === "assessment" ? "blind" : next,
      });
      window.location.hash = "#/live/" + created.run_id + "/monitoring";
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const evidence = (ids: string[]) => <div className="live-tags">{ids.map(id => <button className="live-filter mono" key={id} onClick={() => onInspect(id)}>Evidence {id.slice(-8)}</button>)}</div>;
  return <section className="soc__panel learning-briefing" aria-label="Learning debrief">
    <h2>What your decisions changed</h2>
    <p>{r.variant?.label ?? "Original company configuration"} · Seed {r.seed ?? "not recorded"}. Replay uses the recorded trace.</p>
    {learning.consequences.map(c => <article key={c.action_id}>
      <h3>{c.action.replaceAll("_", " ")} · <span className="mono">{c.target_handle}</span></h3>
      <details><summary>Evidence available before this response</summary>{evidence(c.available_evidence_ids)}</details>
      <p>Evidence cited at that point</p>{evidence(c.cited_evidence_ids)}
      {c.event_id && <button className="live-filter" onClick={() => onInspect(c.event_id!)}>Open response audit</button>}
      <details><summary>Measured target change</summary><pre>{JSON.stringify(c.measured_change, null, 2)}</pre></details>
      {c.next_attempt_event_id ? <p>Next recorded attacker attempt: {c.next_attempt_outcome ?? "recorded"}. <button className="live-filter" onClick={() => onInspect(c.next_attempt_event_id!)}>Inspect attempt</button></p> : <p>{c.uncertainty}</p>}
    </article>)}
    {!learning.consequences.length && <p>No defender response was recorded in this attempt.</p>}
    <h3>Legitimate work</h3><ul>{learning.business.map(b => <li key={b.workflow_id}>{b.user_id}: {b.passed ? "available" : "interrupted"} · HTTP {b.http_status}</li>)}</ul>
    <p>{learning.recommendation_reason} <a href={"#/live/" + r.run_id + "/learn"}>Open learning exercises</a></p>
    <p>{learning.notice}</p>
    <label htmlFor="next-variation-mode">Next attempt</label>
    <select id="next-variation-mode" value={next} onChange={e => setNext(e.target.value)}>
      <option value="independent">Independent practice</option><option value="coached">Coached practice</option><option value="assessment">Timed assessment</option>
    </select>{" "}<button className="btn btn--primary" disabled={busy} onClick={() => void another()}>{busy ? "Preparing company…" : "Try another variation"}</button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
