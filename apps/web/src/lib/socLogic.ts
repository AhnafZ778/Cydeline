import type { Grade, Verdict } from "./consoleGrade";

export type Role = "analyst" | "responder";
export type Channel = "main" | "investigation" | "closed";

export type Artifact = { id: string; value: string; comment: string; type: string };

export type CaseFile = {
  alertId: string;
  created: string;
  step: number;
  answers: Record<string, string>;
  artifacts: Artifact[];
  note: string;
  finished: boolean;
  verdict: Verdict | null;
  closeNote: string;
  grade: Grade | null;
  writeupSeen: boolean;
  rated: boolean;
};

export type SocState = {
  version: 1;
  role: Role;
  channel: Record<string, Channel>;
  mainOrder: string[];
  pool: string[];
  investigation: string[];
  closedOrder: string[];
  cases: Record<string, CaseFile>;
  contained: string[];
  deletedMail: string[];
  streak: number;
  streakDay: string | null;
  pendingStreak: boolean;
  pendingConfetti: boolean;
  solvedOnce: string[];
  connected: string | null;
  shell: string[];
  collapsed: boolean;
  seq: number;
};

export type SeedAlert = { id: string; role: Role; startsClosed?: boolean };

export const MAIN_CAP = 10;

export function localDay(date = new Date()): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function blankCase(alertId: string, created: string): CaseFile {
  return {
    alertId,
    created,
    step: 0,
    answers: {},
    artifacts: [],
    note: "",
    finished: false,
    verdict: null,
    closeNote: "",
    grade: null,
    writeupSeen: false,
    rated: false,
  };
}

export function pointsOf(state: SocState): number {
  return Object.values(state.cases).reduce((sum, file) => sum + (file.grade?.points ?? 0), 0);
}

export function seed(alerts: SeedAlert[], starters: Record<string, CaseFile> = {}): SocState {
  const analystOpen = alerts.filter((a) => a.role === "analyst" && !a.startsClosed).map((a) => a.id);
  const closed = alerts.filter((a) => a.startsClosed).map((a) => a.id);
  const channel: Record<string, Channel> = {};
  for (const id of analystOpen) channel[id] = "main";
  for (const id of closed) channel[id] = "closed";
  for (const alert of alerts) if (alert.role === "responder") channel[alert.id] = "main";
  return {
    version: 1,
    role: "analyst",
    channel,
    mainOrder: analystOpen.slice(0, MAIN_CAP),
    pool: analystOpen.slice(MAIN_CAP),
    investigation: [],
    closedOrder: closed,
    cases: starters,
    contained: [],
    deletedMail: [],
    streak: 0,
    streakDay: null,
    pendingStreak: false,
    pendingConfetti: false,
    solvedOnce: [],
    connected: null,
    shell: [],
    collapsed: false,
    seq: 1,
  };
}

export function reconcile(state: SocState, alerts: SeedAlert[]): SocState {
  const known = new Set(Object.keys(state.channel));
  const fresh = alerts.filter((a) => !known.has(a.id));
  if (!fresh.length) return state;
  const channel = { ...state.channel };
  let pool = state.pool;
  let closedOrder = state.closedOrder;
  for (const alert of fresh) {
    if (alert.startsClosed) {
      channel[alert.id] = "closed";
      closedOrder = [...closedOrder, alert.id];
    } else if (alert.role === "responder") channel[alert.id] = "main";
    else {
      channel[alert.id] = "main";
      pool = [...pool, alert.id];
    }
  }
  return { ...state, channel, pool, closedOrder };
}

export function channelIds(state: SocState, channel: Channel, role: Role, alerts: SeedAlert[]): string[] {
  const order = channel === "main" ? state.mainOrder : channel === "investigation" ? state.investigation : state.closedOrder;
  const roleOf = new Map(alerts.map((a) => [a.id, a.role]));
  const rows = order.filter((id) => state.channel[id] === channel && (role === "responder" || roleOf.get(id) !== "responder"));
  if (channel === "main" && role === "responder") {
    for (const alert of alerts) {
      if (alert.role === "responder" && state.channel[alert.id] === "main" && !rows.includes(alert.id)) rows.push(alert.id);
    }
  }
  return rows;
}

function withCase(state: SocState, id: string, edit: (file: CaseFile) => CaseFile): SocState {
  const file = state.cases[id];
  if (!file) return state;
  return { ...state, cases: { ...state.cases, [id]: edit(file) } };
}

export function takeAlert(state: SocState, id: string): SocState {
  if (state.channel[id] !== "main") return state;
  let mainOrder = state.mainOrder.filter((item) => item !== id);
  let pool = state.pool;
  if (state.mainOrder.includes(id) && pool.length) {
    mainOrder = [...mainOrder, pool[0]];
    pool = pool.slice(1);
  }
  return {
    ...state,
    pool,
    mainOrder,
    investigation: [id, ...state.investigation.filter((item) => item !== id)],
    channel: { ...state.channel, [id]: "investigation" },
  };
}

export function returnAlert(state: SocState, id: string, role: Role): SocState {
  if (state.channel[id] !== "investigation") return state;
  const cases = { ...state.cases };
  delete cases[id];
  let mainOrder = state.mainOrder;
  let pool = state.pool;
  if (role === "analyst") {
    if (mainOrder.length >= MAIN_CAP) {
      const back = mainOrder[mainOrder.length - 1];
      mainOrder = mainOrder.slice(0, -1);
      pool = [back, ...pool];
    }
    mainOrder = [id, ...mainOrder.filter((item) => item !== id)];
  }
  return {
    ...state,
    cases,
    mainOrder,
    pool,
    investigation: state.investigation.filter((item) => item !== id),
    channel: { ...state.channel, [id]: "main" },
  };
}

export function returnInvestigation(state: SocState, alerts: SeedAlert[]): SocState {
  const roleOf = new Map(alerts.map((alert) => [alert.id, alert.role]));
  return state.investigation.reduce(
    (current, id) => returnAlert(current, id, roleOf.get(id) ?? "analyst"),
    state,
  );
}

export function createCase(state: SocState, id: string, created: string): SocState {
  if (state.channel[id] !== "investigation" || state.cases[id]) return state;
  return { ...state, cases: { ...state.cases, [id]: blankCase(id, created) } };
}

export function answerStep(state: SocState, id: string, stepId: string, value: string): SocState {
  return withCase(state, id, (file) => (file.finished ? file : { ...file, answers: { ...file.answers, [stepId]: value } }));
}

export function setPlayStep(state: SocState, id: string, step: number): SocState {
  return withCase(state, id, (file) => ({ ...file, step: Math.max(0, step) }));
}

export function restartPlaybook(state: SocState, id: string): SocState {
  return withCase(state, id, (file) => ({ ...blankCase(id, file.created), artifacts: [] }));
}

export function setNote(state: SocState, id: string, note: string): SocState {
  return withCase(state, id, (file) => (file.finished ? file : { ...file, note: note.slice(0, 3000) }));
}

export function addArtifact(state: SocState, id: string, value: string, comment: string, type: string): SocState {
  const clean = value.trim();
  if (!clean) return state;
  const file = state.cases[id];
  if (!file || file.finished) return state;
  const artifact: Artifact = { id: `art-${state.seq}`, value: clean, comment: comment.trim(), type };
  return withCase({ ...state, seq: state.seq + 1 }, id, (current) => ({ ...current, artifacts: [...current.artifacts, artifact] }));
}

export function removeArtifact(state: SocState, id: string, artifactId: string): SocState {
  return withCase(state, id, (file) => (file.finished ? file : { ...file, artifacts: file.artifacts.filter((item) => item.id !== artifactId) }));
}

export function finishPlaybook(state: SocState, id: string): SocState {
  return withCase(state, id, (file) => ({ ...file, finished: true }));
}

export function closeAlert(state: SocState, id: string, verdict: Verdict, note: string, grade: Grade, today: string): SocState {
  const file = state.cases[id];
  if (state.channel[id] !== "investigation" || !file) return state;
  const first = grade.perfect && !state.solvedOnce.includes(id);
  const showStreak = state.streakDay !== today;
  return {
    ...state,
    cases: { ...state.cases, [id]: { ...file, verdict, closeNote: note, grade } },
    channel: { ...state.channel, [id]: "closed" },
    investigation: state.investigation.filter((item) => item !== id),
    closedOrder: [id, ...state.closedOrder.filter((item) => item !== id)],
    pendingStreak: showStreak || state.pendingStreak,
    pendingConfetti: first || state.pendingConfetti,
    solvedOnce: first ? [...state.solvedOnce, id] : state.solvedOnce,
  };
}

export function dismissStreak(state: SocState, today: string): SocState {
  if (!state.pendingStreak) return { ...state, pendingConfetti: false };
  return { ...state, pendingStreak: false, pendingConfetti: false, streak: state.streak + 1, streakDay: today };
}

export function dismissConfetti(state: SocState): SocState {
  return state.pendingConfetti ? { ...state, pendingConfetti: false } : state;
}

export function retryAlert(state: SocState, id: string, role: Role): SocState {
  if (state.channel[id] !== "closed") return state;
  const cases = { ...state.cases };
  delete cases[id];
  let mainOrder = state.mainOrder;
  let pool = state.pool;
  if (role === "analyst") {
    if (mainOrder.length >= MAIN_CAP) {
      const back = mainOrder[mainOrder.length - 1];
      mainOrder = mainOrder.slice(0, -1);
      pool = [back, ...pool];
    }
    mainOrder = [id, ...mainOrder.filter((item) => item !== id)];
  }
  return {
    ...state,
    cases,
    mainOrder,
    pool,
    closedOrder: state.closedOrder.filter((item) => item !== id),
    channel: { ...state.channel, [id]: "main" },
  };
}

export function seeWriteup(state: SocState, id: string): SocState {
  return withCase(state, id, (file) => ({ ...file, writeupSeen: true }));
}

export function rateCase(state: SocState, id: string): SocState {
  return withCase(state, id, (file) => ({ ...file, rated: !file.rated }));
}

export function toggleContain(state: SocState, hostId: string): SocState {
  const contained = state.contained.includes(hostId)
    ? state.contained.filter((id) => id !== hostId)
    : [...state.contained, hostId];
  return { ...state, contained };
}

export function deleteMail(state: SocState, mailId: string): SocState {
  if (state.deletedMail.includes(mailId)) return state;
  return { ...state, deletedMail: [...state.deletedMail, mailId] };
}

export function connectHost(state: SocState, hostId: string): SocState {
  return { ...state, connected: hostId, shell: [`session open on ${hostId}`] };
}

export function pushShell(state: SocState, command: string, output: string): SocState {
  return { ...state, shell: [...state.shell, `> ${command}`, output] };
}

export function setRole(state: SocState, role: Role): SocState {
  return { ...state, role };
}

export function toggleCollapsed(state: SocState): SocState {
  return { ...state, collapsed: !state.collapsed };
}
