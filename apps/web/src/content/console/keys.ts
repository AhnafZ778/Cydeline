import type { AnswerKey } from "../../lib/consoleGrade";

const tp = (steps: Record<string, string>): AnswerKey => ({ verdict: "true_positive", steps });
const fp = (steps: Record<string, string>): AnswerKey => ({ verdict: "false_positive", steps });

const phishBlocked = tp({ attachments: "Yes", analyze: "Malicious", delivered: "Not Delivered" });
const malware = tp({ quarantine: "No", analyze: "Malicious" });

export const KEYS: Record<string, AnswerKey> = {
  "NS-4412": tp({ attachments: "Yes", analyze: "Malicious", delivered: "Delivered" }),
  "NS-4428": phishBlocked,
  "NS-4418": malware,
  "NS-4424": malware,
  "NS-4434": malware,
  "NS-4440": malware,
  "NS-4401": tp({ blocked: "Yes", analyze: "Malicious" }),
  "NS-4420": tp({ blocked: "No", analyze: "Malicious" }),
  "NS-4438": tp({ blocked: "Yes", analyze: "Malicious" }),
  "NS-4426": fp({ blocked: "No", analyze: "Non-malicious" }),
  "NS-4432": fp({ blocked: "No", analyze: "Non-malicious" }),
  "NS-4422": tp({ success: "No", analyze: "Malicious" }),
  "NS-4430": tp({ success: "No", analyze: "Malicious" }),
  "NS-4436": fp({ success: "Yes", analyze: "Non-malicious" }),
  "NS-4388": fp({ leaves: "No", analyze: "Non-malicious" }),
  "NS-4502": tp({}),
};
