import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Monitor, Minimize2, RotateCcw, Square } from "lucide-react";
import { api, type Snapshot } from "./types";
type ToolState = { status: string; desktop_os?: string; message?: string; url?: string; profile?: string };
type Props = { snapshot: Pick<Snapshot, "run_id" | "mode">; desktopOnly?: boolean; onFocusChange?: (focused: boolean) => void; notice?: string };
export function AnalystTools({ snapshot: s, desktopOnly = false, onFocusChange, notice }: Props) {
  const [profile, setProfile] = useState("desktop"), [data, setData] = useState<ToolState | null>(null);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<string | null>(null), [expanded, setExpanded] = useState(false);
  const [frameRevision, setFrameRevision] = useState(0);
  const autoOpened = useRef(false), pending = useRef(false), generation = useRef(0);
  const minimize = useRef<HTMLButtonElement>(null), resume = useRef<HTMLButtonElement>(null);
  const path = "/runs/" + s.run_id + "/tools/" + profile;
  const ready = !!connection && data?.status === "ready";
  const focused = ready && expanded;
  useLayoutEffect(() => {
    onFocusChange?.(focused);
    const frame = requestAnimationFrame(() => { if (focused) minimize.current?.focus(); else if (ready) resume.current?.focus(); });
    return () => { cancelAnimationFrame(frame); onFocusChange?.(false); };
  }, [focused, onFocusChange]);
  useEffect(() => {
    if (ready && !autoOpened.current) { autoOpened.current = true; setExpanded(true); }
  }, [ready]);
  useEffect(() => {
    if (!focused) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setExpanded(false); requestAnimationFrame(() => resume.current?.focus()); } };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [focused]);
  useEffect(() => {
    setData(null); setConnection(null); setExpanded(false); setError(null); autoOpened.current = false;
    let disposed = false, polling = false;
    generation.current++;
    async function refresh() {
      if (polling || pending.current) return;
      polling = true; const revision = generation.current;
      try {
        const result = await api<ToolState>(path);
        if (disposed || revision !== generation.current) return;
        setData(result);
        if (result.status !== "ready") setConnection(null);
        else if (result.url) setConnection(old => old ?? result.url ?? null);
        setError(null);
      } catch (e) { if (!disposed && revision === generation.current) setError((e as Error).message); }
      finally { polling = false; }
    }
    void refresh(); const timer = window.setInterval(() => void refresh(), 5000);
    return () => { disposed = true; generation.current++; window.clearInterval(timer); };
  }, [path]);
  async function command(method: "POST" | "DELETE") {
    if (pending.current) return;
    pending.current = true; const revision = ++generation.current;
    setBusy(true); setError(null);
    try {
      const result = await api<ToolState>(path, method);
      if (revision !== generation.current) return;
      if (method === "POST") autoOpened.current = false;
      setData(result); setConnection(result.url ?? null);
      if (method === "DELETE") { setExpanded(false); autoOpened.current = false; }
    } catch (e) { if (revision === generation.current) setError((e as Error).message); }
    finally { pending.current = false; setBusy(false); }
  }
  function minimizeWorkspace() { setExpanded(false); requestAnimationFrame(() => resume.current?.focus()); }
  return <section className="workspace-launcher">
    <header className="workspace-heading"><div><h1>{desktopOnly ? "Windows workstation" : "Workspace"}</h1><p>Open this exercise’s evidence in your own lab environment.</p></div><Monitor size={24} /></header>
    {!desktopOnly && <div className="workspace-profiles" role="group" aria-label="Lab environment">{["desktop", "siem"].map(tool => <button className="btn" key={tool} disabled={busy || data?.status === "preparing" || data?.status === "ready"} aria-pressed={profile === tool} onClick={() => setProfile(tool)}>{tool === "desktop" ? "Windows workstation" : "Elastic Security"}</button>)}</div>}
    <section className="soc__panel workspace-summary">
      <h2>{profile === "desktop" ? "Windows desktop" : "Elastic Security"}</h2>
      <p>{profile === "desktop" ? "File Explorer, PowerShell and a read-only evidence drive." : "Search released events in Elasticsearch and Kibana."}</p>
      <p role="status"><span className="live-badge">{data?.status ?? "Connecting"}</span> {data?.message}</p>
      {data?.status === "preparing" && <p>Preparing can take several minutes. {s.mode === "assessment" ? "The exercise clock keeps running." : "You can pause the exercise while you wait."} Ending the shift also stops this environment.</p>}
      <div className="live-tags">
        {ready ? <button ref={resume} className="btn btn--primary" onClick={() => setExpanded(true)}>Resume workspace</button> : <button className="btn btn--primary" disabled={busy || !data || (profile === "desktop" && data.desktop_os !== "Windows") || data.status === "preparing"} onClick={() => void command("POST")}>Launch {profile === "desktop" ? "Windows" : "Elastic Security"}</button>}
        {data && !["stopped", "unavailable", "unsupported"].includes(data.status) && <button className="btn" disabled={busy} onClick={() => void command("DELETE")}><Square size={14} />Stop environment</button>}
        {ready && <button className="btn" onClick={() => { setConnection(data?.url ?? null); setFrameRevision(n => n + 1); setExpanded(true); }}><RotateCcw size={14} />Reconnect</button>}
      </div>
      {error && <p className="live-error" role="alert">{error}</p>}
      <details className="workspace-info"><summary>About this environment</summary><p>One profile per shift, with a one-hour lease. Environments use additional memory. Stopping one leaves your investigation saved. Minimize returns to the SOC without stopping the desktop.</p></details>
    </section>
    {ready && createPortal(<section className="workspace-display" hidden={!focused} aria-label={profile === "desktop" ? "Windows workspace" : "Elastic workspace"}>
      <iframe key={frameRevision} title={profile === "desktop" ? "Northstar Windows workstation" : "Northstar Elastic Security"} src={connection!} className="workspace-frame" />
      {(error || notice) && <p className="workspace-notice" role="status">{error || notice}</p>}
      <div className="workspace-controls"><a href={connection!} target="_blank" rel="noreferrer" aria-label="Open workspace in a new tab" title="Open in a new tab"><ExternalLink size={16} /></a><button ref={minimize} onClick={minimizeWorkspace} aria-label="Minimize workspace" title="Minimize workspace"><Minimize2 size={18} /></button></div>
    </section>, document.body)}
  </section>;
}
