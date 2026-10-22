import { useMemo, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { Drawer } from "../../design/ui";
import { LogRowView } from "../../lib/format";

const STARTERS = [
  "Compared with the other sessions, this one...",
  "The pinned lines show...",
  "I ruled out the other sessions because...",
];

export function DeclareDrawer(props: {
  rows: LogRowView[];
  pinned: string[];
  rowById: Map<string, LogRowView>;
  busy: boolean;
  initial?: string | null;
  onUnpin: (id: string) => void;
  onSubmit: (p: { suspected_actor: string; suspected_session: string; evidence_event_ids: string[]; rationale: string }) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const pinnedRows = props.pinned.map((id) => props.rowById.get(id)).filter((r): r is LogRowView => !!r);

  const sessions = useMemo(() => {
    const map = new Map<string, { session: string; actor: string; user: string; requests: number; pinned: number }>();
    for (const r of props.rows) {
      if (r.source !== "target-access" && r.source !== "target-auth") continue;
      const g = map.get(r.session) ?? { session: r.session, actor: r.event.actor_id, user: r.user, requests: 0, pinned: 0 };
      g.requests += 1;
      map.set(r.session, g);
    }
    for (const r of pinnedRows) {
      const g = map.get(r.session);
      if (g) g.pinned += 1;
    }
    return [...map.values()].sort((a, b) => b.pinned - a.pinned || a.session.localeCompare(b.session));
  }, [props.rows, pinnedRows]);

  const [session, setSession] = useState<string>(props.initial ?? "");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);

  const chosen = sessions.find((s) => s.session === session);
  const ready = !!chosen && pinnedRows.length > 0 && rationale.trim().length >= 10;

  const submit = async () => {
    if (!chosen) {
      setError("Choose the session you suspect.");
      return;
    }
    if (pinnedRows.length === 0) {
      setError("Pin at least one log line as evidence first.");
      return;
    }
    setError(null);
    const r = await props.onSubmit({
      suspected_actor: chosen.actor,
      suspected_session: chosen.session,
      evidence_event_ids: props.pinned,
      rationale: rationale.trim(),
    });
    if (!r.ok) setError(r.error ?? "The server did not accept that declaration.");
  };

  return (
    <Drawer
      label="Declare incident"
      eyebrow="Step 3 · Declare"
      title="Declare the incident"
      subtitle="Name the session you suspect and show why. The server checks your evidence."
      onClose={props.onClose}
      foot={
        <>
          <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
            {pinnedRows.length} evidence line{pinnedRows.length === 1 ? "" : "s"}
          </span>
          <button className="btn btn--primary" onClick={submit} disabled={props.busy || !ready} data-testid="declare-submit">
            {props.busy ? "Checking..." : "Declare incident"}
          </button>
        </>
      }
    >
      <fieldset className="field">
        <legend>Which session do you suspect?</legend>
        {sessions.map((s) => (
          <label className="radio-card" key={s.session}>
            <input type="radio" name="suspect" value={s.session} checked={session === s.session} onChange={() => setSession(s.session)} />
            <span className="radio-card__main">
              <strong>{s.session}</strong>
              <span>
                {s.user} · {s.requests} requests{s.pinned ? ` · ${s.pinned} pinned` : ""}
              </span>
            </span>
          </label>
        ))}
        {sessions.length === 0 && <p className="field__hint">No sessions in the logs yet.</p>}
      </fieldset>

      <section className="field">
        <label>Evidence</label>
        {pinnedRows.length === 0 ? (
          <p className="field__hint">Nothing pinned yet. Close this panel and pin the lines that support your theory.</p>
        ) : (
          <ul className="evidence-list">
            {pinnedRows.map((r) => (
              <li key={r.id}>
                <span>
                  {r.time.slice(0, 8)} {r.session} {r.method} {r.path} {r.status ?? ""}
                </span>
                <button className="btn btn--ghost btn--icon btn--sm" aria-label={`Unpin ${r.rid}`} onClick={() => props.onUnpin(r.id)}>
                  <X className="icon" style={{ width: 12, height: 12 }} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="field">
        <label htmlFor="rationale">Why? (one or two sentences)</label>
        <textarea id="rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Explain in your own words what you saw." />
        <div className="starters" aria-label="Sentence starters">
          {STARTERS.map((s) => (
            <button key={s} type="button" onClick={() => setRationale((r) => (r ? `${r} ${s}` : s))}>
              {s}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="form-error" role="alert" data-testid="declare-error">
          <TriangleAlert className="icon" />
          <span>{error}</span>
        </div>
      )}
    </Drawer>
  );
}
