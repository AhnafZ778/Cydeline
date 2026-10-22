import { Drawer } from "../../design/ui";
import type { Mission } from "../../app/useMission";

/** Hidden operator drawer. Never part of the learner flow or scoring. */
export function DevDrawer({ m, onClose }: { m: Mission; onClose: () => void }) {
  const s = m.snapshot;
  return (
    <Drawer label="Developer tools" eyebrow="Operator only" title="Dev tools" subtitle="Not part of the learner experience." onClose={onClose}>
      <dl className="fields">
        <dt>client</dt>
        <dd>{m.modeLabel}</dd>
        <dt>run id</dt>
        <dd>{s?.run_id ?? "-"}</dd>
        <dt>state</dt>
        <dd>{s?.state ?? "-"}</dd>
        <dt>outcome</dt>
        <dd>{s?.outcome ?? "-"}</dd>
        <dt>ai step</dt>
        <dd>
          {s?.ai_step ?? "-"} ({s?.ai_steps_remaining ?? "-"} left)
        </dd>
        <dt>events</dt>
        <dd>{m.events.length}</dd>
      </dl>
      <div className="dev-grid">
        <button className="btn" onClick={() => void m.stepOnce()} disabled={!s}>
          Advance scenario one tick
        </button>
        <button className="btn" onClick={() => void m.forceFallback()} disabled={!s}>
          Force adversary fallback move
        </button>
        <button className="btn" onClick={m.togglePause}>
          {m.paused ? "Resume stream" : "Pause stream"}
        </button>
        <button className="btn btn--danger" onClick={m.reset}>
          Restart mission
        </button>
      </div>
      <p className="dev-note">Open with Ctrl/Cmd+K or add ?dev=1 to the URL. The learner view stays free of adversary metadata until the debrief.</p>
    </Drawer>
  );
}
