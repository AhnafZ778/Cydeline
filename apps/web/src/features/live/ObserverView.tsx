import { useEffect, useRef, useState } from "react";
import { Replayer } from "@rrweb/replay";
import type { eventWithTime } from "@rrweb/types";
import "@rrweb/replay/dist/style.css";
import { api, terminal } from "./types";
import { ModeSwitch, type Session } from "./ModeSwitch";

type Entry = { event_id: string; sequence: number; kind: string; at_sec?: number; timestamp_utc?: string; decision_id?: string; payload: Record<string, unknown>; expired?: boolean };
type Run = { run_id: string; state: string; outcome: string | null; scenario_id: string; virtual_clock_sec: number; thinking: boolean; ai_unavailable: boolean; paused: boolean };
type Status = Run & { capture: { accepted: boolean; updated_at: string; gap: boolean; capture_id: string } | null; learner_actions: Record<string, unknown>[]; history_notice: string };
type Page = { events: Entry[]; next_cursor: number; has_more: boolean };
const labels: Record<string, string> = { "decision.started": "Decision started", "model.request": "Model request", "model.response": "Model final response", "model.unavailable": "Model unavailable", "decision.validation": "Policy validation", "decision.rejected": "Policy rejected", "decision.stale": "Stale — not executed", "target.dispatched": "Request dispatched", "target.confirmed": "Target response confirmed" };

// Recordings are untrusted. Also isolate rendering in a scriptless, networkless frame.
export function safeReplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(safeReplay);
  if (!value || typeof value !== "object") return value;
  const node = value as Record<string, unknown>;
  if (typeof node.tagName === "string" && ["script", "iframe", "object", "embed", "base", "link", "meta", "form", "video", "audio"].includes(node.tagName.toLowerCase())) {
    return { ...node, tagName: "div", attributes: {}, childNodes: [] };
  }
  return Object.fromEntries(Object.entries(node).map(([key, val]) => {
    if (key === "attributes" && val && typeof val === "object") {
      return [key, Object.fromEntries(Object.entries(val).filter(([attr]) => !/^(on|src|href|action|formaction|poster|ping|background)/i.test(attr)))];
    }
    return [key, safeReplay(val)];
  }));
}

function RecordedTab({ chunks, ended, onTime }: { chunks: Entry[]; ended: boolean; onTime: (time: number | null) => void }) {
  const frame = useRef<HTMLIFrameElement>(null), player = useRef<Replayer | null>(null);
  const seen = useRef(new Set<string>()), capture = useRef("");
  const pending = useRef<eventWithTime[]>([]);
  const [ready, setReady] = useState(0), [duration, setDuration] = useState(0), [position, setPosition] = useState(0);
  useEffect(() => {
    const root = frame.current?.contentDocument?.getElementById("screen");
    if (!root) return;
    for (const chunk of chunks) {
      if (seen.current.has(chunk.event_id) || chunk.expired) continue;
      const id = String(chunk.payload.capture_id);
      if (id !== capture.current) {
        player.current?.destroy(); player.current = null; capture.current = id;
      }
      let events = safeReplay(chunk.payload.events) as eventWithTime[];
      if (!Array.isArray(events)) continue;
      if (!player.current) { pending.current.push(...events); events = pending.current; }
      if (!player.current && events.some(e => e.type === 2)) {
        player.current = new Replayer(events, { root, liveMode: !ended, mouseTail: false, UNSAFE_replayCanvas: false, triggerFocus: false, showWarning: false, useVirtualDom: false, insertStyleRules: [".rr-block,[data-private]{background:#fff1e3!important;color:#6b5b4e!important;position:relative}", ".rr-block:after{content:'Private area hidden';position:absolute;inset:8px;font:12px sans-serif}"] });
        if (!ended) player.current.startLive(events[0].timestamp - 1000);
        else player.current.pause(0);
        pending.current = [];
      } else if (player.current) {
        for (const event of events) player.current.addEvent(event);
      }
      seen.current.add(chunk.event_id);
    }
    if (player.current) setDuration(player.current.getMetaData().totalTime);
  }, [chunks, ended, ready]);
  useEffect(() => () => { player.current?.destroy(); }, []);
  useEffect(() => {
    const root = frame.current?.contentDocument?.getElementById("screen");
    if (!root) return;
    const fit = () => {
      const current = player.current;
      if (!current) return;
      const width = Number.parseFloat(current.iframe.style.width || current.iframe.width);
      if (width > 0) {
        current.wrapper.style.transformOrigin = "top left";
        current.wrapper.style.transform = `scale(${Math.min(1, root.clientWidth / width)})`;
      }
    };
    const resize = new ResizeObserver(fit);
    resize.observe(root); fit();
    return () => resize.disconnect();
  }, [ready, chunks]);
  return <>
    {!chunks.length && <p>No recorded screen is available. The trainee may enable exercise-tab recording.</p>}
    <iframe ref={frame} className="observer-screen" title="Read-only recorded exercise tab" tabIndex={-1} inert sandbox="allow-same-origin" onLoad={() => setReady(x => x + 1)} srcDoc={'<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; form-action \'none\'; base-uri \'none\'"><style>body{margin:0;overflow:hidden}iframe{pointer-events:none}.replayer-wrapper{position:relative}.replayer-mouse{position:absolute;width:12px;height:12px;background:#c2410c;border:2px solid white;border-radius:50%;z-index:20;pointer-events:none}</style></head><body><main id="screen" inert></main></body></html>'} />
    {ended && duration > 0 && <><label>Recorded tab position <input type="range" min="0" max={duration} value={position} onChange={e => { const n = Number(e.target.value); setPosition(n); player.current?.pause(n); if (player.current) onTime(player.current.getMetaData().startTime + n); }} />{(position / 1000).toFixed(1)} s</label><button className="btn" onClick={() => onTime(null)}>Show all AI activity</button></>}
  </>;
}

export function ObserverView({ runId }: { runId?: string }) {
  const [runs, setRuns] = useState<Run[]>([]), [status, setStatus] = useState<Status | null>(null), [entries, setEntries] = useState<Entry[]>([]), [chunks, setChunks] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null), [code, setCode] = useState(""), [connection, setConnection] = useState("Connecting"), [actor, setActor] = useState("");
  const [name, setName] = useState(""), [invitation, setInvitation] = useState(""), [grants, setGrants] = useState<{id: string; name: string; revoked: boolean}[]>([]);
  const [view, setView] = useState("screen");
  const [pane, setPane] = useState("trainee");
  const [segment, setSegment] = useState(""), [cutoff, setCutoff] = useState<number | null>(null);
  const [localDemo, setLocalDemo] = useState(false);
  useEffect(() => {
    let cancelled = false, eventCursor = 0, captureCursor = 0;
    setEntries([]); setChunks([]); setStatus(null); setError(null); setInvitation("");
    const stream = runId ? new EventSource("/api/observer/runs/" + runId + "/stream") : null;
    const poll = async () => {
      try {
        const identity = await api<Session>("/session");
        if (!cancelled) { setActor(identity.role); setLocalDemo(!!identity.local_demo); }
        const list = await api<{runs: Run[]}>("/observer/runs");
        if (cancelled) return;
        setActor(identity.role); setRuns(list.runs);
        if (!runId) { setConnection("Ready"); return; }
        const base = "/observer/runs/" + runId;
        const [s, events, captures] = await Promise.all([api<Status>(base), api<Page>(base + "/events?cursor=" + eventCursor), api<Page>(base + "/capture?cursor=" + captureCursor)]);
        if (cancelled) return;
        setStatus(s); setConnection(terminal(s.state) ? "Recorded" : s.paused || s.ai_unavailable ? "Paused" : "Live"); setError(null);
        if (terminal(s.state)) stream?.close();
        eventCursor = events.next_cursor; captureCursor = captures.next_cursor;
        setEntries(old => [...old, ...events.events]); setChunks(old => [...old, ...captures.events]);
        if (identity.role === "instructor") { const g = await api<{grants: typeof grants}>("/instructor/runs/" + runId + "/observers"); if (!cancelled) setGrants(g.grants); }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message); setConnection("Disconnected — last recorded view");
          if ([401, 403, 404].includes((e as {status?: number}).status ?? 0)) { setEntries([]); setChunks([]); setStatus(null); stream?.close(); }
        }
      }
    };
    let pending = false;
    const update = async () => { if (!pending) { pending = true; try { await poll(); } finally { pending = false; } } };
    if (stream) {
      stream.addEventListener("revoked", () => { setEntries([]); setChunks([]); setStatus(null); setError("Observer access ended. Sign in or ask the instructor for a new assignment."); setConnection("Access ended"); stream.close(); });
      stream.addEventListener("status", () => void update());
      stream.onerror = () => setConnection("Reconnecting");
    }
    void update(); const timer = setInterval(() => void update(), 1000);
    return () => { cancelled = true; clearInterval(timer); stream?.close(); };
  }, [runId]);
  async function login(e: React.FormEvent) { e.preventDefault(); try { await api("/session", "POST", {code}); window.location.reload(); } catch(e) { setError((e as Error).message); } }
  async function invite(e: React.FormEvent) { e.preventDefault(); try { const g = await api<{access_code: string}>("/instructor/runs/" + runId + "/observers", "POST", {name}); setInvitation(g.access_code); setName(""); } catch(e) { setError((e as Error).message); } }
  const ended = !!status && terminal(status.state);
  const segments = [...new Set(chunks.filter(c => !c.expired).map(c => String(c.payload.capture_id)))];
  const shownSegment = segments.includes(segment) ? segment : segments.at(-1);
  const shownChunks = chunks.filter(c => c.payload.capture_id === shownSegment);
  const shownEntries = cutoff === null ? entries : entries.filter(e => !e.timestamp_utc || Date.parse(e.timestamp_utc) <= cutoff);
  return <main className="observer-page">
    <header className="observer-header"><div><a href="#/live/instructor">Northstar · Instructor</a><h1>AI observation room</h1><p>Actual model activity and recorded trainee actions. Observer access is read-only.</p></div><span className="live-badge">{connection}</span><ModeSwitch /></header>
    <nav className="instructor-tabs" aria-label="Instructor tools"><a href="#/live/instructor">Training management</a><a href="#/live/observer" aria-current="page">Live observation</a></nav>
    {error && <p className="live-error" role="alert">{error}</p>}
    {!localDemo && actor !== "instructor" && actor !== "observer" && <details className="rr-block"><summary>Sign in with an observer invitation</summary><form className="observer-login" onSubmit={e => void login(e)}><label>Instructor or assigned observer code <input type="password" autoComplete="current-password" value={code} onChange={e => setCode(e.target.value)} required /></label><button className="btn">Sign in</button></form></details>}
    <nav className="observer-runs" aria-label="Authorized exercises">{runs.map(r => <a key={r.run_id} className="btn" aria-current={r.run_id === runId ? "page" : undefined} href={"#/live/observer/" + r.run_id}>{r.scenario_id} · {r.state}<small>{r.run_id}</small></a>)}</nav>
    {!runs.length && <p>No exercises are available for this session. Live access requires an instructor login or a run-specific observer invitation. Trainees can open their own completed exercise here.</p>}
    {status && <>
      <p><code>{runId}</code> · Exercise time {status.virtual_clock_sec.toFixed(0)} s · {status.state}{status.outcome && " · " + status.outcome}</p>
      <div className="observer-pane-toggle" role="group" aria-label="Observation pane"><button className="btn" aria-pressed={pane === "trainee"} aria-controls="observer-trainee" onClick={() => setPane("trainee")}>Trainee view</button><button className="btn" aria-pressed={pane === "ai"} aria-controls="observer-ai" onClick={() => setPane("ai")}>AI view</button></div>
      <div className="observer-layout" data-pane={pane}><section id="observer-trainee" className="soc__panel observer-column observer-trainee" aria-label="Trainee activity"><h2>Trainee activity</h2><div role="group" aria-label="Activity view"><button className="btn" aria-pressed={view === "screen"} onClick={() => setView("screen")}>Exercise tab</button><button className="btn" aria-pressed={view === "actions"} onClick={() => setView("actions")}>Confirmed actions</button></div>
        {view === "screen" ? <><p>{status.capture?.accepted ? "Trainee permitted exercise-tab recording." : "Recording is off."} {status.capture?.gap && "Recording contains a gap."} {status.capture && "Last capture update: " + status.capture.updated_at}</p>{segments.length > 1 && <label>Recording segment <select value={shownSegment} onChange={e => { setSegment(e.target.value); setCutoff(null); }}>{segments.map((id, i) => <option key={id} value={id}>Segment {i + 1}</option>)}</select>Time between segments is not recorded.</label>}<RecordedTab key={runId + ":" + shownSegment} chunks={shownChunks} ended={ended} onTime={setCutoff} /><p>Windows observation is a later range milestone and is not connected here.</p></> : <>{!status.learner_actions.length && <p>No confirmed trainee actions yet.</p>}{status.learner_actions.map((action, i) => <pre key={i}>{JSON.stringify(action, null, 2)}</pre>)}</>}
      </section><section id="observer-ai" className="soc__panel observer-column observer-ai" aria-label="AI activity"><h2>AI activity</h2><p>{ended ? "Exercise ended. This is its recorded AI activity." : status.ai_unavailable ? "AI unavailable — no substitute action is running." : status.paused ? "Exercise paused. New AI turns resume with the exercise." : status.thinking ? "Model is generating its response." : "Waiting for the next model turn."}</p><p>{status.history_notice}</p><p>AI-stated intent is a brief declaration, not private internal reasoning. A confirmed request may still be denied.</p>
        {!entries.length && <p>No observer events recorded yet.</p>}
        {shownEntries.map(entry => <article className="observer-event" key={entry.event_id}><h3>{labels[entry.kind] ?? entry.kind}<small>#{entry.sequence} · {entry.at_sec?.toFixed(1)} s</small></h3>{entry.decision_id && <code>{entry.decision_id}</code>}{!entry.expired && entry.kind === "target.confirmed" && <p>Target result: HTTP {String(entry.payload.http_status)} · {String(entry.payload.outcome)}</p>}{!entry.expired && entry.kind === "target.dispatched" && <p>Requested action: {String(entry.payload.action)}</p>}{!entry.expired && entry.kind === "model.response" && <p>Model: {String(entry.payload.model)}</p>}{!entry.expired && entry.kind === "decision.validation" && <><p>{entry.payload.accepted ? "Policy accepted the proposal." : "Policy rejected the proposal; no target action executed."}</p><p>AI-stated intent: {String((entry.payload.proposal as {reason?: string} | undefined)?.reason ?? "Not supplied")}</p></>}{entry.expired ? <p>Detailed content expired under the retention policy.</p> : <details><summary>Actual recorded data</summary><pre>{JSON.stringify(entry.payload, null, 2)}</pre></details>}</article>)}
      </section></div>
      {actor === "instructor" && <section className="soc__panel rr-block"><h2>Read-only observer invitations</h2><form className="observer-login" onSubmit={e => void invite(e)}><label>Observer name <input value={name} onChange={e => setName(e.target.value)} required maxLength={80} /></label><button className="btn">Create invitation</button></form>{invitation && <p>Access code (shown once): <code>{invitation}</code></p>}{grants.filter(g => !g.revoked).map(g => <p key={g.id}>{g.name} <button className="btn" onClick={() => void api("/instructor/runs/" + runId + "/observers/" + g.id, "DELETE").catch(e => setError(e.message))}>Revoke access</button></p>)}</section>}
    </>}
  </main>;
}
