import { useState } from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { Drawer, Modal } from "../../design/ui";
import { ACTIONS, ActionInfo, RESTORE } from "../../content/guide";
import { DefenderAction, DefenderActionReceipt, RunStatusSnapshot } from "../../types/contracts";

type Result = { ok: boolean; error?: string; receipt?: DefenderActionReceipt };

function Facts({ a }: { a: ActionInfo }) {
  return (
    <dl className="facts">
      <dt>Scope</dt>
      <dd>{a.scope}</dd>
      <dt>Stops</dt>
      <dd>{a.stops}</dd>
      <dt>Side effects</dt>
      <dd>{a.side}</dd>
    </dl>
  );
}

export function RespondDrawer(props: {
  snapshot: RunStatusSnapshot;
  receipt: DefenderActionReceipt | null;
  busy: boolean;
  onApply: (a: DefenderAction) => Promise<Result>;
  onPreview: (a: DefenderAction | null) => void;
  onVerify: () => void;
  onClose: () => void;
}) {
  const snap = props.snapshot;
  const session = snap.declaration?.suspected_session ?? "";
  const user = snap.declaration?.suspected_actor.split("@")[0] ?? "the user";
  const [picked, setPicked] = useState<DefenderAction | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appliedActions = new Set(snap.applied_actions.filter((r) => r.result !== "rejected").map((r) => r.action));
  const contained = snap.sess_a_revoked;

  const choose = (a: DefenderAction) => {
    setPicked(a);
    setError(null);
    props.onPreview(a);
  };

  const run = async (a: DefenderAction) => {
    setConfirm(false);
    setError(null);
    const r = await props.onApply(a);
    if (!r.ok) setError(r.error ?? "The server did not confirm that action.");
    else if (r.receipt?.result === "rejected") setError(r.receipt.message);
    else {
      setPicked(null);
      props.onPreview(null);
    }
  };

  const apply = () => {
    if (!picked) return;
    if (picked === "temporarily_disable_account") setConfirm(true);
    else void run(picked);
  };

  const restore = snap.maya_account_disabled;

  return (
    <Drawer
      label="Choose a response"
      eyebrow="Step 4 · Contain"
      title="Choose a response"
      subtitle="Each option changes who can still use the system. Hover to preview the effect on the workflow."
      onClose={() => {
        props.onPreview(null);
        props.onClose();
      }}
      foot={
        contained && !picked ? (
          <>
            <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
              Containment is a claim until you test it.
            </span>
            <button className="btn btn--primary" onClick={props.onVerify} data-testid="go-verify">
              Run both checks
            </button>
          </>
        ) : (
          <>
            <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
              {props.busy ? "Waiting for the server to confirm..." : picked ? "The workflow changes only after the server confirms." : "Pick one option."}
            </span>
            <button className="btn btn--primary" onClick={apply} disabled={!picked || props.busy} data-testid="apply-response">
              {props.busy ? (
                <>
                  <Loader2 className="icon spin" /> Applying
                </>
              ) : (
                "Apply response"
              )}
            </button>
          </>
        )
      }
    >
      <fieldset className="field" aria-label="Responses" onMouseLeave={() => props.onPreview(picked)}>
        {ACTIONS.map((a) => (
          <label
            className="action-card"
            key={a.action}
            onMouseEnter={() => props.onPreview(a.action)}
            onFocus={() => props.onPreview(a.action)}
          >
            <div className="action-card__head">
              <input type="radio" name="response" value={a.action} checked={picked === a.action} onChange={() => choose(a.action)} />
              <div className="action-card__title">
                <strong>{a.title}</strong>
                <code>{a.action}</code>
              </div>
              {appliedActions.has(a.action) && <span className="chip chip--teal" style={{ marginLeft: "auto" }}>Applied</span>}
            </div>
            <Facts a={a} />
          </label>
        ))}
      </fieldset>

      {restore && (
        <section className="action-card" style={{ cursor: "default" }}>
          <div className="action-card__title">
            <strong>{RESTORE.title}</strong>
            <code>{RESTORE.action}</code>
          </div>
          <Facts a={RESTORE} />
          <button className="btn" style={{ marginTop: 12 }} onClick={() => void run("restore_account")} disabled={props.busy} data-testid="restore-account">
            Restore {user}'s account
          </button>
        </section>
      )}

      {props.receipt && (
        <section className="card" style={{ padding: "var(--s-4)" }} aria-live="polite" data-testid="receipt">
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
            <CheckCircle2 className="icon" style={{ color: "var(--teal)" }} />
            Server confirmed
          </div>
          <dl className="fields" style={{ marginTop: 8 }}>
            <dt>action</dt>
            <dd>{props.receipt.action}</dd>
            <dt>target</dt>
            <dd>{props.receipt.target_handle || session}</dd>
            <dt>result</dt>
            <dd>{props.receipt.result}</dd>
            <dt>audit id</dt>
            <dd>{props.receipt.target_audit_id}</dd>
          </dl>
        </section>
      )}

      {error && (
        <div className="form-error" role="alert" data-testid="respond-error">
          <TriangleAlert className="icon" />
          <span>{error}</span>
        </div>
      )}

      {confirm && (
        <Modal
          title={`Disable ${user}'s whole account?`}
          onClose={() => setConfirm(false)}
          actions={
            <>
              <button className="btn" data-autofocus onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn--danger" onClick={() => void run("temporarily_disable_account")} data-testid="confirm-disable">
                Disable account
              </button>
            </>
          }
        >
          <p>This stops every session and sign-in for {user}. They cannot work until you restore the account. Is that the smallest action that stops the problem?</p>
        </Modal>
      )}
    </Drawer>
  );
}
