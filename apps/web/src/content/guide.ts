import { PhaseKey } from "../lib/phase";
import { DefenderAction } from "../types/contracts";
import { Pivot } from "../lib/query";

export interface Focus {
  title: string;
  why: string;
  think: string;
}

/** What the learner should look at right now. Questions and reasons, never answers. */
export const FOCUS: Record<PhaseKey, Focus> = {
  observe: {
    title: "Learn what normal looks like",
    why: "Attackers hide inside ordinary traffic. Before you can spot something odd, you need to know what usual looks like.",
    think: "Open a few lines. Notice which source address and session tend to go together.",
  },
  investigate: {
    title: "Find the session that behaves differently",
    why: "One session in this traffic is not behaving like the others. Lines you pin become your evidence.",
    think: "Group the logs by session. Which one does something the others don't?",
  },
  declare: {
    title: "State your finding",
    why: "A declaration names the session and the lines that justify it. Evidence beats a hunch.",
    think: "Choose one session, then back it up with the lines that prove it.",
  },
  contain: {
    title: "Stop it without breaking work",
    why: "Every response has a cost. The goal is the smallest action that fully stops the problem.",
    think: "Compare scope and side effects. Who else would each option affect?",
  },
  verify: {
    title: "Prove it worked",
    why: "Containment is a claim until you test it. Two checks: the intruder is out, and legitimate work still runs.",
    think: "Run both checks. A pass needs both.",
  },
  done: {
    title: "Review your run",
    why: "Look at what the logs showed and what each decision cost.",
    think: "Open the debrief to compare your timeline with the adversary's.",
  },
};

export const HEADINGS: Record<PhaseKey, { title: string; sub: string }> = {
  observe: { title: "Live operations", sub: "Northstar's API is handling traffic right now. Something in it is not normal." },
  investigate: { title: "Investigation", sub: "Compare sessions, source addresses and routes. Pin the lines that make your case." },
  declare: { title: "Declare the incident", sub: "Name the session and the evidence that supports it." },
  contain: { title: "Containment", sub: "Pick the smallest response that stops the problem. Each option says who else it affects." },
  verify: { title: "Verification", sub: "Test that the intruder is out and that legitimate users still work." },
  done: { title: "Run complete", sub: "Both checks passed." },
};

export const BRIEF = {
  ticket: [
    ["Ticket", "SOC-0142"],
    ["Reported", "Finance noticed unusual access to a restricted document"],
    ["Protect", "doc_finance_07"],
    ["Keep working", "eli@northstar.test"],
  ] as const,
  paragraphs: [
    "You are the on-call analyst for Northstar Analytics, a fictional company. Its API is serving normal traffic from three employees.",
    "An AI adversary is working against that API right now. It moves one step at a time and reacts to what you do.",
    "Your job: find the session that doesn't belong, make your case from the logs, stop it with the smallest action that works, and prove it worked.",
  ],
};

export interface Concept {
  id: string;
  title: string;
  body: string;
  jump?: { label: string; pivot?: Pivot; query?: string };
}

export const CONCEPTS: Concept[] = [
  {
    id: "session",
    title: "Session",
    body: "A session is the server's memory that someone already signed in. Every request carries a token for it, and whoever holds the token is treated as that user.",
    jump: { label: "Group the logs by session", pivot: "bysession" },
  },
  {
    id: "hijack",
    title: "Session hijack",
    body: "If a token is stolen, someone else can act as the user without a password. The tell is often one session suddenly appearing from a different source address or client.",
    jump: { label: "Compare source IPs per session", pivot: "bysession" },
  },
  {
    id: "logline",
    title: "Reading a log line",
    body: "Each line is one request: when it happened, which session, from which source address, what it asked for (verb and path), the result (status), how long it took, and a request ID you can cross-reference.",
  },
  {
    id: "status",
    title: "Status codes",
    body: "2xx worked. 3xx means use your cached copy. 4xx means refused or not found, which is not always malicious: a mistyped file name is a 404. 403 means the server understood and said no.",
    jump: { label: "Show only 4xx", query: "status:4xx" },
  },
  {
    id: "blast",
    title: "Blast radius",
    body: "How many people and things an action affects. Ending one session has a small blast radius. Disabling an account has a large one.",
  },
  {
    id: "verify",
    title: "Verification",
    body: "After you act, test it. Check that the bad actor is blocked and that the good users still work. Both must be true.",
  },
];

export interface ActionInfo {
  action: DefenderAction;
  title: string;
  scope: string;
  stops: string;
  side: string;
  /** Node ids on the map that this action affects, given the suspect session handle. */
  affects: (session: string, user: string) => string[];
}

export const ACTIONS: ActionInfo[] = [
  {
    action: "revoke_session",
    title: "End one session",
    scope: "Only the chosen session. Other sessions are untouched.",
    stops: "Every request that carries that session's token.",
    side: "The user must sign in again.",
    affects: (s) => [`session:${s}`],
  },
  {
    action: "require_reauthentication",
    title: "Force re-authentication",
    scope: "All of the user's active sessions.",
    stops: "Existing tokens until a new sign-in.",
    side: "The user is interrupted on every device.",
    affects: (s) => [`session:${s}`],
  },
  {
    action: "temporarily_disable_account",
    title: "Disable the account",
    scope: "The user's whole account.",
    stops: "All access, including sign-in.",
    side: "The user cannot work until it is restored.",
    affects: (s) => [`session:${s}`, "route:/docs", "route:/session", "gateway"],
  },
];

export const RESTORE: ActionInfo = {
  action: "restore_account",
  title: "Restore the account",
  scope: "The user's whole account.",
  stops: "Nothing. It lifts the account block.",
  side: "The compromised session stays revoked.",
  affects: (s) => [`session:${s}`],
};

export const SHORTCUTS: Array<[string, string[]]> = [
  ["Focus the log filter", ["/"]],
  ["Move between log lines", ["j", "k"]],
  ["Inspect the focused line", ["Enter"]],
  ["Pin or unpin the focused line", ["p"]],
  ["Close a panel", ["Esc"]],
  ["Show this sheet", ["?"]],
];

export const TOUR = [
  { target: "objective", title: "Your current objective", body: "This card always tells you what to do now and why it matters. It changes as you progress." },
  { target: "adversary", title: "Watch the AI work", body: "This overlay is optional. It narrates each AI move as it happens. Switch the lens to Blind, or hide Coach, when you want the shift to feel like the real job." },
  { target: "activity", title: "Activity", body: "Requests over time. Hatched bars are refused requests. Your own actions appear as markers so you can see cause and effect." },
  { target: "logs", title: "Logs", body: "The real record. Click a line to inspect it and pin it as evidence. Use the filter or the pivots to compare sessions." },
] as const;
