import { useEffect, useRef, useState } from "react";
import { api, terminal, type WorksheetFields, type WorksheetRecord } from "./types";
import { useRun } from "./RunContext";

const FIELDS: [keyof WorksheetFields, string][] = [
  ["observation", "1. Observation"],
  ["hypothesis", "2. Working hypothesis"],
  ["supporting_evidence", "3. Supporting evidence"],
  ["contradicting_evidence", "3. Contradicting evidence"],
  ["scope_uncertainty", "4. Scope and remaining uncertainty"],
  ["action_impact", "5. Proposed action and business impact"],
  ["verification_handoff", "6. Verification and handoff"],
];
type Draft = { fields: WorksheetFields; evidence_ids: string[]; revision: number; save_id: string; dirty: boolean };
const validRecord = (r: unknown): r is WorksheetRecord => {
  if (!r || typeof r !== "object") return false;
  const v = r as WorksheetRecord;
  return Number.isInteger(v.revision) && v.revision >= 0 && !!v.fields && FIELDS.every(([name]) => typeof v.fields[name] === "string") && Array.isArray(v.evidence_ids) && v.evidence_ids.every(id => typeof id === "string");
};
const fromRecord = (r: WorksheetRecord): Draft => ({fields:r.fields, evidence_ids:r.evidence_ids, revision:r.revision, save_id:crypto.randomUUID(), dirty:false});

export function Worksheet({ onInspect }: { onInspect: (id: string) => void }) {
  const m = useRun(), s = m.snapshot!, ended = terminal(s.state);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<WorksheetRecord | null>(null);
  const [status, setStatus] = useState("Loading saved worksheet…");
  const [conflict, setConflict] = useState(false);
  const [retry, setRetry] = useState(0);
  const [offline, setOffline] = useState(false);
  const key = useRef(""), latest = useRef<Draft | null>(null), saving = useRef<string | null>(null), generation = useRef(0);
  const persist = (d: Draft) => {
    latest.current = d;
    setDraft(d);
    try { if (key.current) sessionStorage.setItem(key.current, JSON.stringify(d)); } catch { /* edits remain in memory */ }
  };
  useEffect(() => {
    const owner = ++generation.current;
    let cancelled = false;
    latest.current = null; key.current = ""; saving.current = null;
    setDraft(null); setSaved(null); setOffline(false); setConflict(false);
    void Promise.all([api<{id:string}>("/session"), api<WorksheetRecord>("/runs/"+s.run_id+"/worksheet")]).then(([actor,r]) => {
      if (cancelled) return;
      if (!validRecord(r)) throw Error("Saved worksheet could not be read. Reconnect to reload it.");
      key.current = "soc-worksheet:"+actor.id+":"+s.run_id;
      setSaved(r);
      let local: Draft | null = null;
      try { local = JSON.parse(sessionStorage.getItem(key.current) ?? "null") as Draft | null; } catch { /* use server record */ }
      if (local && (!validRecord(local) || typeof local.save_id !== "string" || typeof local.dirty !== "boolean")) local = null;
      if (local?.dirty && local.revision < r.revision && local.save_id === r.save_id) local = null;
      const d = local?.dirty ? local : fromRecord(r);
      latest.current = d; setDraft(d);
      const clash = !!local?.dirty && local.revision !== r.revision;
      setConflict(clash);
      setStatus(clash ? "Conflict — compare both copies" : local?.dirty ? "Recovered unsynchronized local copy" : "Saved");
    }).catch((e: Error) => { if (!cancelled) setStatus("Reconnect required — "+e.message); });
    return () => { cancelled=true; if (generation.current === owner) generation.current++; };
  }, [s.run_id, retry, ended]);

  useEffect(() => {
    const remote = s.workspace.worksheet, d = latest.current;
    if (!validRecord(remote) || !d || remote.revision <= d.revision || remote.save_id === saving.current) return;
    setSaved(remote);
    if (d.dirty) { setConflict(true); setStatus("Conflict — compare both copies"); }
    else { const next=fromRecord(remote); latest.current=next; setDraft(next); setStatus("Saved"); }
  }, [s.workspace.worksheet]);

  useEffect(() => {
    if (!draft?.dirty || conflict || ended || offline || saving.current) return;
    const owner = generation.current, storageKey = key.current;
    const timer = window.setTimeout(() => {
      const sent = latest.current;
      if (!sent || !sent.dirty || saving.current) return;
      saving.current=sent.save_id;
      setStatus("Saving…");
      void api<WorksheetRecord>("/runs/"+s.run_id+"/worksheet", "PATCH", {
        revision:sent.revision, save_id:sent.save_id, fields:sent.fields, evidence_ids:sent.evidence_ids,
      }).then((r) => {
        // A previous editor instance cannot acknowledge or erase newer local work.
        if (generation.current !== owner) return;
        if (!validRecord(r)) throw Error("The save acknowledgement could not be read. Your local copy is retained.");
        const current=latest.current;
        if (!current) return;
        const next = current.save_id === sent.save_id ? fromRecord(r) : {...current, revision:r.revision};
        latest.current=next;
        try { if (next.dirty) sessionStorage.setItem(storageKey,JSON.stringify(next)); else sessionStorage.removeItem(storageKey); } catch { /* server acknowledgement remains authoritative */ }
        setSaved(r); setDraft(next); setStatus(next.dirty ? "Unsaved changes" : "Saved"); void m.refresh().catch(() => {});
      }).catch(async (e: Error & {status?:number}) => {
        if (generation.current !== owner) return;
        if (e.status===409) {
          setConflict(true); setStatus("Conflict — local copy retained");
          try { const remote = await api<WorksheetRecord>("/runs/"+s.run_id+"/worksheet"); if (generation.current === owner && validRecord(remote)) setSaved(remote); } catch { /* local copy is retained */ }
        } else { setOffline(true); setStatus("Reconnect required — "+e.message); }
      }).finally(() => { if (generation.current === owner) { saving.current=null; setDraft((d)=>d ? {...d} : d); } });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, conflict, ended, offline]);

  const shown = ended ? saved : draft;
  return <details className="soc__panel learning-worksheet">
    <summary>Investigation worksheet · optional</summary>
    <p>Record how you reached your conclusion. Multiple defensible paths are welcome. This worksheet is separate from your submitted report.</p>
    <p role="status" aria-live="polite">{ended ? "Recorded worksheet · read only" : status}{saved?.saved_at ? " · "+saved.saved_at : ""}</p>
    {!shown && <button className="btn" onClick={()=>setRetry(x=>x+1)}>Reconnect worksheet</button>}
    {shown && FIELDS.map(([name,label])=><label className="soc-field" key={name}>
      <span>{label}</span><textarea rows={3} maxLength={4000} disabled={ended} value={shown.fields[name]} onChange={e=>{
        if (!draft) return;
        persist({...draft,fields:{...draft.fields,[name]:e.target.value},save_id:crypto.randomUUID(),dirty:true});
        if (!offline && !conflict) setStatus("Unsaved changes");
      }}/></label>)}
    {shown && <><p>Linked released evidence</p><div className="live-tags">{shown.evidence_ids.map(id=><button className="live-filter mono" key={id} onClick={()=>onInspect(id)}>{id.slice(-8)}</button>)}</div></>}
    {!ended && draft && <button className="btn" disabled={conflict} onClick={()=>persist({...draft,evidence_ids:s.workspace.evidence_ids,dirty:true,save_id:crypto.randomUUID()})}>Link my pinned evidence</button>}
    {!ended && status.startsWith("Reconnect") && <button className="btn" onClick={()=>{if(draft){setOffline(false);setStatus("Retrying save…");persist({...draft});}else setRetry(x=>x+1);}}>Retry saving</button>}
    {conflict && saved && draft && <section className="learning-conflict" role="alert">
      <h3>Another tab saved revision {saved.revision}</h3><p>Your copy is retained above. Compare the saved version before choosing which content to keep.</p>
      {FIELDS.map(([name,label])=><details key={name}><summary>Saved: {label}</summary><pre>{saved.fields[name] || "(empty)"}</pre></details>)}
      {!ended && <div className="live-tags"><button className="btn" onClick={()=>{persist(fromRecord(saved));setConflict(false);setStatus("Saved");}}>Load saved version</button>
      <button className="btn" onClick={()=>{persist({...draft,revision:saved.revision,save_id:crypto.randomUUID(),dirty:true});setConflict(false);}}>Save my copy as next revision</button></div>}
    </section>}
    {ended && draft?.dirty && <details><summary>Unsynchronized local worksheet · not submitted</summary><pre>{JSON.stringify(draft.fields,null,2)}</pre></details>}
  </details>;
}
