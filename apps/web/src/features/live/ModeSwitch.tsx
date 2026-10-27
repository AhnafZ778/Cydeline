import { useEffect, useState } from "react";
import { api } from "./types";

export type Session = { id: string; name: string; role: string; local_demo?: boolean };

export async function openWorkspaceMode(role: "learner" | "instructor", localDemo: boolean) {
  const selected = sessionStorage.getItem("soc-selected-run");
  const target = role === "instructor" ? "#/live/instructor" : selected ? "#/live/" + selected + "/monitoring" : "#/";
  if (localDemo) {
    await api("/session/demo", "POST", {role});
    if (selected) sessionStorage.setItem("soc-selected-run", selected);
    window.location.hash = target;
    window.location.reload();
  } else window.location.hash = target;
}

export function ModeSwitch() {
  const [session, setSession] = useState<Session | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const instructorPage = /#\/live\/instructor/.test(window.location.hash) || /#\/live\/observer/.test(window.location.hash) && session?.role === "instructor";
  useEffect(() => { let live = true; setError(""); void api<Session>("/session").then(s => { if (live) setSession(s); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [retry]);
  async function change(role: "learner" | "instructor") {
    setBusy(true); setError("");
    try {
      await openWorkspaceMode(role, !!session?.local_demo && session.role !== "observer");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  if (session?.role === "observer") return <span className="local-demo">Observer · read only</span>;
  return <div className="mode-switch-wrap rr-block">
    {session?.local_demo && <span className="local-demo" title="Password-free access is enabled only for this local demo">Local demo</span>}
    <div className="mode-switch" role="group" aria-label="Workspace mode">
      <button disabled={busy || !session} aria-pressed={!instructorPage} onClick={() => void change("learner")}>Training</button>
      <button disabled={busy || !session} aria-pressed={instructorPage} onClick={() => void change("instructor")}>Instructor</button>
    </div>
    {error && <p className="live-error" role="alert">{error} {!session && <button className="btn btn--sm" onClick={() => setRetry(n => n + 1)}>Reconnect session</button>}</p>}
  </div>;
}
