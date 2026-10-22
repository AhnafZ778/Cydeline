import { useState } from "react";
import { ArrowLeft, ArrowRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { PracticeAlert } from "../../content/console";
import { PLAYBOOKS } from "../../content/console/playbooks";
import { ARTIFACT_TYPES, visibleSteps } from "../../lib/playbook";
import type { CaseFile } from "../../lib/socLogic";
import { soc, useSoc } from "../../lib/socStore";
import { Modal } from "./Monitoring";

export function PlaybookModal(props: { alert: PracticeAlert; file: CaseFile; onClose: () => void }) {
  const steps = visibleSteps(PLAYBOOKS[props.alert.playbook] ?? [], props.file.answers);
  const index = Math.min(props.file.step, Math.max(0, steps.length - 1));
  const step = steps[index];
  const go = (next: number) => soc.step(props.alert.id, Math.max(0, Math.min(steps.length - 1, next)));
  const finish = () => {
    soc.finish(props.alert.id);
    props.onClose();
  };
  if (!step) return null;
  return (
    <Modal title={step.title} onClose={props.onClose} wide>
      <div className="play">
        <p>{step.body}</p>
        {step.kind === "verdict" && (
          <ul className="play__links">
            {props.alert.links.map((link) => (
              <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer">{link.label}</a></li>
            ))}
          </ul>
        )}
        {step.kind === "yesno" && (
          <div className="play__choices">
            {["Yes", "No"].map((option) => (
              <button key={option} type="button" className={`btn ${props.file.answers[step.id] === option ? "btn--primary" : ""}`} data-testid={`choice-${option}`} disabled={props.file.finished} onClick={() => soc.answer(props.alert.id, step.id, option)}>
                {option}
              </button>
            ))}
          </div>
        )}
        {(step.kind === "choice" || step.kind === "verdict") && (
          <div className="play__choices">
            {(step.kind === "choice" ? step.options : ["Malicious", "Non-malicious"]).map((option) => (
              <button key={option} type="button" className={`btn ${props.file.answers[step.id] === option ? "btn--primary" : ""}`} data-testid={`choice-${option}`} disabled={props.file.finished} onClick={() => soc.answer(props.alert.id, step.id, option)}>
                {option}
              </button>
            ))}
          </div>
        )}
        {step.kind === "check" && <CheckStatus step={step} alert={props.alert} />}
        {step.kind === "artifacts" && <Artifacts alertId={props.alert.id} file={props.file} />}
        {step.kind === "note" && (
          <label className="soc-field">
            <span className="sr-only">Analyst note</span>
            <textarea value={props.file.note} placeholder="Please enter comments" rows={5} disabled={props.file.finished} onChange={(event) => soc.note(props.alert.id, event.target.value)} />
            <em className="play__count">{props.file.note.length} / 3000</em>
          </label>
        )}
        {step.kind === "confirm" && (
          <div className="soc__modal-actions">
            <button type="button" className="btn btn--primary" data-testid="playbook-confirm" onClick={finish}>Confirm</button>
          </div>
        )}
        {step.kind !== "confirm" && (
          <div className="soc__modal-actions">
            <button type="button" className="btn btn--primary" data-testid="playbook-next" onClick={() => go(index + 1)}>Next</button>
          </div>
        )}
      </div>
      <div className="play__foot">
        <button type="button" aria-label="Back" disabled={index === 0} onClick={() => go(index - 1)}><ArrowLeft className="icon" /></button>
        <button type="button" aria-label="Restart playbook" onClick={() => soc.restart(props.alert.id)}><RotateCcw className="icon" /></button>
        <button type="button" aria-label="Forward" data-testid="playbook-forward" disabled={index >= steps.length - 1 && step.kind !== "confirm"} onClick={() => (step.kind === "confirm" ? finish() : go(index + 1))}><ArrowRight className="icon" /></button>
      </div>
    </Modal>
  );
}

function CheckStatus(props: { step: Extract<ReturnType<typeof visibleSteps>[number], { kind: "check" }>; alert: PracticeAlert }) {
  const state = useSoc();
  const done = props.step.check === "contained"
    ? state.contained.includes(props.step.hostId === "*" ? props.alert.hostId : props.step.hostId)
    : state.deletedMail.includes(props.step.check === "deleted" ? props.step.mailId : "");
  const href = props.step.check === "contained" ? "#/practice/endpoint" : "#/practice/email";
  return (
    <p className={done ? "ok" : ""}>
      {done ? "Recorded." : "Not done yet."}{" "}
      <a href={href} target="_blank" rel="noreferrer">{props.step.check === "contained" ? "Endpoint security" : "Email security"}</a>
    </p>
  );
}

function Artifacts(props: { alertId: string; file: CaseFile }) {
  const [value, setValue] = useState("");
  const [comment, setComment] = useState("");
  const [type, setType] = useState<(typeof ARTIFACT_TYPES)[number]>("URL Address");
  return (
    <div className="arts">
      {!props.file.finished && (
        <button type="button" className="soc-icon" aria-label="Add artifact row" onClick={() => { if (value.trim()) { soc.addArtifact(props.alertId, value, comment, type); setValue(""); setComment(""); } }}>
          <Plus className="icon" />
        </button>
      )}
      <table className="soc-table">
        <thead>
          <tr><th>Value</th><th>Comment</th><th>Type</th><th>Remove</th></tr>
        </thead>
        <tbody>
          {props.file.artifacts.map((artifact) => (
            <tr key={artifact.id}>
              <td className="mono">{artifact.value}</td>
              <td>{artifact.comment}</td>
              <td>{artifact.type}</td>
              <td>
                <button type="button" className="soc-icon" aria-label={`Remove ${artifact.value}`} disabled={props.file.finished} onClick={() => soc.removeArtifact(props.alertId, artifact.id)}>
                  <Trash2 className="icon" />
                </button>
              </td>
            </tr>
          ))}
          {!props.file.finished && (
            <tr>
              <td><input aria-label="Artifact value" value={value} onChange={(event) => setValue(event.target.value)} /></td>
              <td><input aria-label="Artifact comment" value={comment} onChange={(event) => setComment(event.target.value)} /></td>
              <td>
                <select aria-label="Artifact type" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                  {ARTIFACT_TYPES.map((option) => <option key={option}>{option}</option>)}
                </select>
              </td>
              <td></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
