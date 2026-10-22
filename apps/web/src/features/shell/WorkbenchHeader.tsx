import { ArrowRight } from "lucide-react";
import { HEADINGS } from "../../content/guide";
import { Cta, PhaseKey } from "../../lib/phase";

export function WorkbenchHeader(props: { phase: PhaseKey; cta: Cta; busy: string | null; onCta: () => void }) {
  const h = HEADINGS[props.phase];
  return (
    <div className="wb-head">
      <div>
        <h1>{h.title}</h1>
        <p>{h.sub}</p>
      </div>
      <div className="wb-head__cta">
        <button
          className="btn btn--primary btn--lg"
          data-testid="primary-cta"
          disabled={!props.cta.enabled || !!props.busy}
          onClick={props.onCta}
          aria-describedby="cta-reason"
        >
          {props.busy === "verify" ? "Running checks..." : props.busy === "debrief" ? "Loading debrief..." : props.cta.label}
          <ArrowRight className="icon" />
        </button>
        <span className="wb-head__reason" id="cta-reason">
          {props.cta.reason ?? "\u00a0"}
        </span>
      </div>
    </div>
  );
}
