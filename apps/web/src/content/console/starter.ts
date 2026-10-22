import type { Grade } from "../../lib/consoleGrade";
import { blankCase, type CaseFile } from "../../lib/socLogic";

const grade: Grade = {
  verdictOk: true,
  perfect: true,
  points: 15,
  lines: [
    { id: "verdict", label: "False Positive", ok: true, points: 5 },
    { id: "leaves", label: "Does the forward leave the company?", ok: true, points: 5 },
    { id: "analyze", label: "Is the destination malicious?", ok: true, points: 5 },
  ],
};

export function starterCases(): Record<string, CaseFile> {
  const file: CaseFile = {
    ...blankCase("NS-4388", "2026-10-21T19:20:00.000Z"),
    finished: true,
    answers: { leaves: "No", analyze: "Non-malicious" },
    note: "Forward stays on shared-it@northstar.example. Covered by CHG-1882.",
    verdict: "false_positive",
    closeNote: "Internal forward, change CHG-1882.",
    grade,
    writeupSeen: false,
  };
  return { "NS-4388": file };
}
