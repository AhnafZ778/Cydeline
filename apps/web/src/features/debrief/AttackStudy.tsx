import { useEffect, useMemo, useState } from "react";
import { DefenderAction, EventEnvelope, RunStatusSnapshot } from "../../types/contracts";
import { toLogRow } from "../../lib/format";
import { FLOW_W, FlowNode, deriveFlow } from "../../lib/flow";
import { aiFootprint, describeMove } from "../../lib/adversary";
import { factsFor } from "../../lib/nodeinfo";
import { FlowCanvas } from "../flow/FlowCanvas";
import { NodeDock } from "../flow/NodeDock";

const RESPONSE_SUB: Record<DefenderAction, string> = {
  revoke_session: "session revoked",
  require_reauthentication: "re-auth forced",
  temporarily_disable_account: "account disabled",
  restore_account: "account restored",
};

/**
 * After-action picture of the attack. A live shift does not have this diagram;
 * it is revealed here so a learner can see which track their response cut
 * and which route the adversary tried afterward.
 */
export function AttackStudy(props: { events: EventEnvelope[]; snapshot: RunStatusSnapshot }) {
  const visible = useMemo(
    () => props.events.filter((e) => e.learner_visible).sort((a, b) => a.sequence - b.sequence),
    [props.events]
  );
  const [step, setStep] = useState(() => Math.max(0, visible.length - 1));
  const [nodeId, setNodeId] = useState<string | null>(null);
  const idx = Math.min(step, Math.max(0, visible.length - 1));
  const shown = useMemo(() => visible.slice(0, idx + 1), [visible, idx]);
  const lastSeq = shown[shown.length - 1]?.sequence ?? 0;

  const rows = useMemo(() => shown.map(toLogRow), [shown]);
  const decisions = useMemo(
    () =>
      props.events
        .filter((e) => e.agent_meta && e.sequence <= lastSeq)
        .map((e) => e.agent_meta!)
        .sort((a, b) => a.step - b.step),
    [props.events, lastSeq]
  );
  const footprint = useMemo(() => aiFootprint(rows, decisions), [rows, decisions]);
  const lastMove = decisions[decisions.length - 1];

  const response = useMemo(() => {
    const last = [...props.snapshot.applied_actions].reverse().find((a) => a.result !== "rejected");
    if (!last) return null;
    const at = Date.parse(last.applied_at_utc);
    const reached = shown.some((e) => Date.parse(e.timestamp_utc) >= at);
    return reached ? { label: RESPONSE_SUB[last.action], session: last.target_handle } : null;
  }, [props.snapshot.applied_actions, shown]);

  const decl = props.snapshot.declaration;
  const revoked = props.snapshot.sess_a_revoked && decl ? [decl.suspected_session] : [];
  const protectedId = props.snapshot.protected_asset_id;

  const flow = useMemo(
    () =>
      deriveFlow({
        rows,
        protectedId,
        ai: footprint,
        aiSub: lastMove ? describeMove(lastMove).short.toLowerCase() : "planning",
        response,
      }),
    [rows, protectedId, footprint, lastMove, response]
  );

  const node: FlowNode | null = nodeId ? flow.byId.get(nodeId) ?? null : null;

  useEffect(() => {
    if (!nodeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(".flow")) setNodeId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nodeId]);
  const facts = useMemo(() => (node ? factsFor(node, rows, footprint, protectedId) : null), [node, rows, footprint, protectedId]);
  const receipt = props.snapshot.applied_actions[props.snapshot.applied_actions.length - 1] ?? null;
  const nowMs = rows[rows.length - 1]?.ms ?? 0;

  return (
    <section className="card flow" data-testid="attack-map" aria-label="How the attack moved">
      <div className="card__head flow__head">
        <div>
          <div className="card__title">How the attack moved</div>
          <div className="card__sub">
            A live shift never shows this. Scrub the run and watch which path your response cut, and which route the AI tried next. Indigo is the adversary. Red is refused.
          </div>
        </div>
        <div className="legend" aria-label="Legend">
          <span className="legend__item">
            <span className="swatch swatch--ok" /> allowed
          </span>
          <span className="legend__item">
            <span className="swatch swatch--denied" /> refused
          </span>
          <span className="legend__item">
            <span className="swatch swatch--ai" /> AI adversary
          </span>
          <span className="legend__item">
            <span className="swatch swatch--suspect" /> your response
          </span>
        </div>
      </div>

      <div className="flow__scrub">
        <label htmlFor="attack-scrub">
          Moment {idx + 1} of {Math.max(1, visible.length)}
        </label>
        <input
          id="attack-scrub"
          type="range"
          min={0}
          max={Math.max(0, visible.length - 1)}
          value={idx}
          onChange={(e) => {
            setStep(Number(e.target.value));
            setNodeId(null);
          }}
        />
      </div>

      <div className="flow__hint">Swipe or scroll sideways to see the whole flow.</div>
      <div className="flow__scroll" tabIndex={0} aria-label="Attack map, scrollable">
        <div className="flow__canvas" style={{ minWidth: Math.min(FLOW_W, 880) }}>
          <FlowCanvas
            flow={flow}
            rows={rows}
            nowMs={nowMs}
            suspect={decl?.suspected_session ?? null}
            revokedSessions={revoked}
            affectedIds={[]}
            selectedId={nodeId}
            ai={{ state: lastMove?.proposal.action === "stop" ? "stopped" : "acting", footprint }}
            protectedId={protectedId}
            onNode={(n) => setNodeId((cur) => (cur === n.id ? null : n.id))}
            onBackground={() => setNodeId(null)}
          />
        </div>
      </div>

      {node && facts && (
        <NodeDock
          node={node}
          facts={facts}
          aiState={null}
          decisions={decisions}
          receipt={receipt}
          suspect={decl?.suspected_session ?? null}
          canMark={false}
          study
          onFilter={() => undefined}
          onMark={() => undefined}
          onClearMark={() => undefined}
          onOpenRow={() => undefined}
          onClose={() => setNodeId(null)}
        />
      )}
    </section>
  );
}
