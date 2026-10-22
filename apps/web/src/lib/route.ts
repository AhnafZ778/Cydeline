export type PracticePage = "monitoring" | "logs" | "cases" | "endpoint" | "email" | "intel" | "sandbox" | "learn";
export type ExtSite = "multiscan" | "detonate" | "ipcheck";

export type Route =
  | { kind: "mission" }
  | { kind: "practice"; page: PracticePage; caseId?: string }
  | { kind: "ext"; site: ExtSite; query: string };

const PAGES: PracticePage[] = ["monitoring", "logs", "cases", "endpoint", "email", "intel", "sandbox", "learn"];
const SITES: ExtSite[] = ["multiscan", "detonate", "ipcheck"];

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "").split("?")[0] ?? "";
  const parts = raw.split("/").filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  if (parts[0] === "ext" && SITES.includes(parts[1] as ExtSite)) {
    return { kind: "ext", site: parts[1] as ExtSite, query: parts.slice(2).join("/") };
  }
  if (parts[0] === "practice") {
    const page = (PAGES.includes(parts[1] as PracticePage) ? parts[1] : "monitoring") as PracticePage;
    if (page === "cases" && parts[2]) return { kind: "practice", page, caseId: parts[2] };
    return { kind: "practice", page };
  }
  return { kind: "mission" };
}

export function practiceHref(page: PracticePage, caseId?: string): string {
  if (page === "cases" && caseId) return `#/practice/cases/${caseId}`;
  return `#/practice/${page}`;
}

export function extHref(site: ExtSite, query: string): string {
  return `#/ext/${site}/${encodeURIComponent(query)}`;
}

export const PAGE_TITLE: Record<PracticePage | ExtSite, string> = {
  monitoring: "Monitoring - Northstar Practice",
  logs: "Log Management - Northstar Practice",
  cases: "Case Management - Northstar Practice",
  endpoint: "Endpoint Security - Northstar Practice",
  email: "Email Security - Northstar Practice",
  intel: "Threat Intel - Northstar Practice",
  sandbox: "Sandbox - Northstar Practice",
  learn: "Learn - Northstar Practice",
  multiscan: "Multiscan",
  detonate: "Detonate Lab",
  ipcheck: "IP Check",
};
