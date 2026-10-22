export type StepWhen = { id: string; equals: string };

type Base = { id: string; title: string; body: string; when?: StepWhen };

export type Step =
  | (Base & { kind: "info" })
  | (Base & { kind: "yesno" })
  | (Base & { kind: "choice"; options: string[] })
  | (Base & { kind: "verdict" })
  | (Base & { kind: "check"; check: "contained"; hostId: string })
  | (Base & { kind: "check"; check: "deleted"; mailId: string })
  | (Base & { kind: "artifacts" })
  | (Base & { kind: "note" })
  | (Base & { kind: "confirm" });

export const ARTIFACT_TYPES = ["URL Address", "E-mail Sender", "E-mail Domain", "IP Address", "MD5 Hash"] as const;

export function visibleSteps(steps: Step[], answers: Record<string, string>): Step[] {
  return steps.filter((step) => !step.when || (answers[step.when.id] ?? "") === step.when.equals);
}
