import { defang } from "./defang";
import { visibleSteps, type Step } from "./playbook";

export type Verdict = "true_positive" | "false_positive";

export type AnswerKey = {
  verdict: Verdict;
  steps: Record<string, string>;
};

export type GradeLine = { id: string; label: string; ok: boolean; points: number };

export type Grade = {
  verdictOk: boolean;
  lines: GradeLine[];
  points: number;
  perfect: boolean;
};

const VERDICT_LABEL: Record<Verdict, string> = {
  true_positive: "True Positive",
  false_positive: "False Positive",
};

export function gradeAlert(args: {
  steps: Step[];
  answers: Record<string, string>;
  verdict: Verdict;
  contained: string[];
  deleted: string[];
  hostId: string;
  key: AnswerKey;
}): Grade {
  const verdictOk = args.verdict === args.key.verdict;
  const lines: GradeLine[] = [
    { id: "verdict", label: VERDICT_LABEL[args.verdict], ok: verdictOk, points: verdictOk ? 5 : 0 },
  ];
  for (const step of visibleSteps(args.steps, args.answers)) {
    if (step.kind === "info" || step.kind === "artifacts" || step.kind === "note" || step.kind === "confirm") continue;
    let ok = false;
    if (step.kind === "check" && step.check === "contained") {
      const hostId = step.hostId === "*" ? args.hostId : step.hostId;
      ok = args.contained.includes(hostId);
    }
    else if (step.kind === "check" && step.check === "deleted") ok = args.deleted.includes(step.mailId);
    else ok = defang(args.answers[step.id] ?? "") === defang(args.key.steps[step.id] ?? "\u0000");
    lines.push({ id: step.id, label: step.title, ok, points: ok ? 5 : 0 });
  }
  const points = lines.reduce((sum, line) => sum + line.points, 0);
  return { verdictOk, lines, points, perfect: lines.every((line) => line.ok) };
}
