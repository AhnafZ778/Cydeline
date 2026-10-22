import { Bot, EyeOff } from "lucide-react";
import { AgentDecisionMeta } from "../../types/contracts";
import { AiState, Lens, describeMove, provenance } from "../../lib/adversary";
import { Seg } from "../../design/ui";

const STATE_LABEL: Record<AiState, string> = {
  thinking: "Planning",
  acting: "Acting now",
  stopped: "Stopped",
  paused: "Paused",
};

export function LensToggle(props: { lens: Lens; locked: boolean; onChange: (l: Lens) => void }) {
  if (props.locked) {
    return (
      <span className="chip" title="Assessment runs are always blind so the lens cannot help you.">
        <EyeOff className="icon" style={{ width: 13, height: 13 }} /> Lens: Blind (assessment)
      </span>
    );
  }
  return (
    <div className="lens" data-testid="lens-toggle">
      <span className="lens__label" id="lens-label">
        Adversary lens
      </span>
      <Seg
        label="Adversary lens"
        value={props.lens}
        onChange={props.onChange}
        options={[
          { value: "coached", label: "Coached" },
          { value: "blind", label: "Blind" },
        ]}
      />
    </div>
  );
}

/** Live narration of what the AI adversary is doing. Coached lens only. */
export function AdversaryStrip(props: { state: AiState; decisions: AgentDecisionMeta[]; onOpen?: () => void }) {
  const last = props.decisions[props.decisions.length - 1] ?? null;
  const move = last ? describeMove(last) : null;
  const s = props.state;

  let headline: string;
  if (s === "acting" && move) headline = move.say;
  else if (s === "stopped" && move) headline = move.say;
  else if (s === "paused") headline = "Paused together with the scenario";
  else headline = last ? "Planning its next move" : "Planning its first move";

  return (
    <div className={`advstrip advstrip--${s}`} data-tour="adversary" data-testid="adversary-strip" data-state={s} role="group" aria-label="AI adversary activity">
      {s === "acting" && <span key={props.decisions.length} className="advstrip__bar" aria-hidden="true" />}
      {props.onOpen ? (
        <button className="advstrip__who" onClick={props.onOpen}>
          <span className="advstrip__avatar" aria-hidden="true">
            <Bot className="icon" />
          </span>
          <span className="advstrip__name">
            <strong>AI adversary</strong>
            <span className={`advstate advstate--${s}`}>
              <i aria-hidden="true" />
              {STATE_LABEL[s]}
            </span>
          </span>
        </button>
      ) : (
        <div className="advstrip__who">
          <span className="advstrip__avatar" aria-hidden="true">
            <Bot className="icon" />
          </span>
          <span className="advstrip__name">
            <strong>AI adversary</strong>
            <span className={`advstate advstate--${s}`}>
              <i aria-hidden="true" />
              {STATE_LABEL[s]}
            </span>
          </span>
        </div>
      )}

      <div className="advstrip__now">
        <span className="sr-only" role="status">
          {s === "acting" && move ? `AI adversary: ${move.say}` : ""}
        </span>
        <div className="advstrip__headline">
          {s === "acting" && <span className="advstrip__tag">Now</span>}
          <span>{headline}</span>
          {s === "thinking" && <span className="dots" aria-hidden="true"><i /><i /><i /></span>}
        </div>
        {move && s !== "paused" && (
          <div className="advstrip__lesson">
            {s === "thinking" && <span className="advstrip__last">Last: {move.say}. </span>}
            {move.lesson}
          </div>
        )}
      </div>

      <ol className="advstrip__trail" aria-label="Moves so far">
        {props.decisions.map((d, i) => {
          const m = describeMove(d);
          const current = i === props.decisions.length - 1;
          return (
            <li key={d.step} className={current ? "is-current" : ""} title={`${m.role}: ${m.say}`}>
              <span className="n">{d.step}</span>
              {m.pill}
            </li>
          );
        })}
        {s === "thinking" && (
          <li className="is-pending" aria-hidden="true">
            …
          </li>
        )}
      </ol>

      {last && (
        <div className="advstrip__meta">
          <span className="chip chip--indigo">{describeMove(last).role}</span>
          <span className="chip" title={`${last.model_id} · ${last.quantization}`}>
            {provenance(last)}
            {last.latency_ms > 0 ? ` · ${last.latency_ms}ms` : ""}
          </span>
          {last.fallback_used && <span className="chip chip--amber">Fallback policy</span>}
        </div>
      )}
    </div>
  );
}

export function BlindStrip() {
  return (
    <div className="advstrip advstrip--blind" data-tour="adversary" data-testid="adversary-strip" data-state="blind" role="group" aria-label="Adversary lens is off">
      <span className="advstrip__avatar" aria-hidden="true">
        <EyeOff className="icon" />
      </span>
      <div className="advstrip__now">
        <div className="advstrip__headline">
          <span>The adversary is hidden</span>
        </div>
        <div className="advstrip__lesson">Find its footprints in the logs yourself. Switch the lens to Coached to watch each move as it happens.</div>
      </div>
    </div>
  );
}
