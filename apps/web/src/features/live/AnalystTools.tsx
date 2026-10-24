import { useEffect, useState } from "react";
import { ExternalLink, Monitor, RotateCcw, Square } from "lucide-react";
import { api, type Snapshot } from "./types";
type ToolState = {
  status: string;
  desktop_os?: string;
  message?: string;
  url?: string;
  profile?: string;
};
export function AnalystTools({ snapshot: s, desktopOnly = false }: { snapshot: Pick<Snapshot, "run_id" | "mode">; desktopOnly?: boolean }) {
  const [profile, setProfile] = useState("desktop"),
    [data, setData] = useState<ToolState | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [connection, setConnection] = useState<string | null>(null);

  const path = "/runs/" + s.run_id + "/tools/" + profile;
  useEffect(() => {
    setData(null);
    setConnection(null);
    let disposed = false;
    async function refresh() {
      try {
        const result = await api<ToolState>(path);
        if (disposed) return;
        if (profile === "desktop" && result.desktop_os !== "Windows") {
          setData({ status: result.status, message: "Restart the range worker to enable Windows." });
          setConnection(null);
          throw new Error("Restart the range worker to enable the Windows workstation.");
        }
        setData(result);
        if (result.status !== "ready") setConnection(null);
        else if (result.url) setConnection((old) => old ?? result.url ?? null);
        setError(null);
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [path]);
  async function command(method: "POST" | "DELETE") {
    if (method === "POST" && profile === "desktop" && data?.desktop_os !== "Windows") {
      setError("Restart the range worker to enable the Windows workstation.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api<ToolState>(path, method);
      setData(result);
      setConnection(result.url ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card live-pad">
      <h2>{desktopOnly ? "Windows workstation" : "Analyst tools"}</h2>
      <p>
        Use a Windows virtual machine or Elastic Security with this run’s released evidence. Completed shifts can be opened for forensic
        review.
      </p>
      <div className="live-tool-grid">
        {(desktopOnly ? ["desktop"] : ["desktop", "siem"]).map((tool) => (
          <button
            key={tool}
            className={"live-scenario " + (profile === tool ? "selected" : "")}
            aria-pressed={profile === tool}
            onClick={() => setProfile(tool)}
          >
            <Monitor size={28} />
            <h3>{tool === "desktop" ? "Windows workstation" : "Elastic Security"}</h3>
            <p>
              {tool === "desktop"
                ? "Windows desktop with File Explorer, PowerShell, and a read-only evidence drive."
                : "Search the released events in a disposable Elasticsearch and Kibana environment."}
            </p>
          </button>
        ))}
      </div>
      <div className="live-tags">
        <button
          className="btn btn--primary"
          disabled={busy || !data || (profile === "desktop" && data.desktop_os !== "Windows") || data.status === "preparing" || data.status === "ready"}
          onClick={() => void command("POST")}
        >
          Launch {profile === "desktop" ? "Windows" : "Elastic Security"}
        </button>
        <button className="btn" disabled={busy || !data || data.status === "stopped"} onClick={() => void command("DELETE")}>
          <Square size={14} />
          Stop environment
        </button>
        {data?.status === "ready" && (
          <button
            className="btn"
            onClick={() => {
              setConnection(data.url ?? null);
            }}
          >
            <RotateCcw size={14} />
            Reconnect
          </button>
        )}
      </div>
      {error && (
        <p className="live-error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <div className="live-tool-state" aria-live="polite">
          <span className="live-badge">{data.status}</span>
          <p>{data.message}</p>
          {data.status === "preparing" && (
            <p className="live-muted">
              Preparing can take several minutes
              {s.mode === "assessment" ? ". " : ", and the shift clock keeps running unless you pause the exercise. "}
              Ending the shift also stops this environment.
            </p>
          )}
          {connection && data.status === "ready" && (
            <>
              <a className="btn" href={connection} target="_blank" rel="noreferrer">
                Open full screen <ExternalLink size={15} />
              </a>
              <iframe
                title={profile === "desktop" ? "Northstar Windows workstation" : "Northstar Elastic Security"}
                src={connection}
                className="live-tool-frame"
              />
            </>
          )}
        </div>
      )}
      <p className="live-muted">
        Optional profiles have a one-hour lease and use additional memory. Only one profile runs per shift. A failed tool launch leaves your
        investigation saved.
      </p>
    </section>
  );
}
