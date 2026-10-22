import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Drawer } from "../../design/ui";
import { VerificationProbeResult, VerificationResponse } from "../../types/contracts";

function Probe(props: {
  question: string;
  detail: string;
  expected: string;
  result: VerificationProbeResult | null;
  pending: boolean;
  failCopy: string;
  testid: string;
}) {
  const state = props.result ? (props.result.passed ? "is-pass" : "is-fail") : "";
  return (
    <div className={`probe ${state}`} data-testid={props.testid}>
      <div className="probe__head">
        <div>
          <div className="probe__q">{props.question}</div>
          <p className="muted" style={{ fontSize: "var(--fs-13)", marginTop: 4 }}>
            {props.detail}
          </p>
        </div>
        {props.pending ? (
          <Loader2 className="icon spin" />
        ) : props.result ? (
          props.result.passed ? (
            <span className="chip chip--teal">
              <CheckCircle2 className="icon" /> Pass
            </span>
          ) : (
            <span className="chip chip--coral">
              <XCircle className="icon" /> Fail
            </span>
          )
        ) : (
          <span className="chip">Not run</span>
        )}
      </div>
      <div className="probe__line">
        {props.result ? `observed ${props.result.observed_http_status} · expected ${props.expected}` : `expected ${props.expected}`}
      </div>
      {props.result && !props.result.passed && <p className="probe__teach">{props.failCopy}</p>}
    </div>
  );
}

export function VerifyDrawer(props: {
  verification: VerificationResponse | null;
  busy: boolean;
  onRun: () => void;
  onReopen: () => void;
  onDebrief: () => void;
  onClose: () => void;
}) {
  const v = props.verification;
  const passed = !!v?.both_passed;
  return (
    <Drawer
      label="Verify recovery"
      eyebrow="Step 5 · Verify"
      title="Prove it worked"
      subtitle="Two paired checks. You need both: the intruder is out, and legitimate work still runs."
      onClose={props.onClose}
      foot={
        passed ? (
          <>
            <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
              Both checks passed.
            </span>
            <button className="btn btn--primary" onClick={props.onDebrief} data-testid="see-debrief">
              See debrief
            </button>
          </>
        ) : (
          <>
            {v ? (
              <button className="btn" onClick={props.onReopen}>
                Reopen responses
              </button>
            ) : (
              <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
                Results also appear in the logs.
              </span>
            )}
            <button className="btn btn--primary" onClick={props.onRun} disabled={props.busy} data-testid="run-checks">
              {props.busy ? "Running..." : v ? "Run again" : "Run both checks"}
            </button>
          </>
        )
      }
    >
      <Probe
        testid="probe-intruder"
        question="Is the intruder locked out?"
        detail="Replays the suspect session against the vault document."
        expected="refused (4xx)"
        result={v?.suspicious_denied ?? null}
        pending={props.busy}
        failCopy="The intruder still got through. What you applied did not stop this session. Reopen the responses and compare scope."
      />
      <Probe
        testid="probe-eli"
        question="Can Eli still work?"
        detail="Runs Eli's normal workflow with his own session."
        expected="allowed (2xx)"
        result={v?.benign_workflow ?? null}
        pending={props.busy}
        failCopy="Legitimate work broke. A response that is too broad stops real people too. Reopen the responses and pick a narrower one."
      />
    </Drawer>
  );
}
