import { useSyncExternalStore } from "react";
import { ALERTS, starterCases } from "../content/console";
import { PLAYBOOKS } from "../content/console/playbooks";
import { gradeAlert, type Verdict } from "./consoleGrade";
import {
  closeAlert,
  connectHost,
  createCase,
  deleteMail,
  dismissConfetti,
  dismissStreak,
  finishPlaybook,
  localDay,
  pushShell,
  rateCase,
  reconcile,
  restartPlaybook,
  retryAlert,
  returnInvestigation,
  seed,
  seeWriteup,
  setNote,
  setPlayStep,
  setRole,
  takeAlert,
  toggleCollapsed,
  toggleContain,
  addArtifact,
  answerStep,
  removeArtifact,
  type Role,
  type SocState,
} from "./socLogic";

const KEY = "sl.soc.v1";
const RETURNED_KEY = "sl.soc.returned.1";

const catalog = () => ALERTS.map((alert) => ({ id: alert.id, role: alert.role, startsClosed: alert.startsClosed }));

function fresh(): SocState {
  return seed(catalog(), starterCases());
}

function load(): SocState {
  if (typeof localStorage === "undefined") return fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(RETURNED_KEY, "1");
      return fresh();
    }
    const parsed = JSON.parse(raw) as SocState;
    if (!parsed || parsed.version !== 1) {
      localStorage.setItem(RETURNED_KEY, "1");
      return fresh();
    }
    let next = reconcile(parsed, catalog());
    if (localStorage.getItem(RETURNED_KEY) !== "1") {
      next = returnInvestigation(next, catalog());
      localStorage.setItem(RETURNED_KEY, "1");
      localStorage.setItem(KEY, JSON.stringify(next));
    }
    return next;
  } catch {
    return fresh();
  }
}

let state = load();
const listeners = new Set<() => void>();
let remote = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: SocState, broadcast = true) {
  state = next;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      // State written by this code is already past the one-time investigation upgrade in load(). Without this flag a
      // second tab (for example an external-site popup) would "upgrade" the first tab's active case away.
      localStorage.setItem(RETURNED_KEY, "1");
    } catch {
      /* storage full or blocked */
    }
  }
  if (broadcast && !remote && typeof BroadcastChannel !== "undefined") {
    channel?.postMessage(next);
  }
  emit();
}

const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("sl.soc.v1");
channel?.addEventListener("message", (event) => {
  const next = event.data as SocState;
  if (!next || next.version !== 1) return;
  remote = true;
  commit(next, false);
  remote = false;
});

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY || !event.newValue) return;
    try {
      const next = JSON.parse(event.newValue) as SocState;
      if (!next || next.version !== 1) return;
      remote = true;
      commit(next, false);
      remote = false;
    } catch {
      /* ignore malformed payloads from other tabs */
    }
  });
}

function update(fn: (current: SocState) => SocState) {
  commit(fn(state));
}

export function useSoc(): SocState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

export const soc = {
  take: (id: string) => update((current) => takeAlert(current, id)),
  create: (id: string) => update((current) => createCase(current, id, new Date().toISOString())),
  answer: (id: string, stepId: string, value: string) => update((current) => answerStep(current, id, stepId, value)),
  step: (id: string, index: number) => update((current) => setPlayStep(current, id, index)),
  restart: (id: string) => update((current) => restartPlaybook(current, id)),
  note: (id: string, note: string) => update((current) => setNote(current, id, note)),
  addArtifact: (id: string, value: string, comment: string, type: string) => update((current) => addArtifact(current, id, value, comment, type)),
  removeArtifact: (id: string, artifactId: string) => update((current) => removeArtifact(current, id, artifactId)),
  finish: (id: string) => update((current) => finishPlaybook(current, id)),
  close: async (id: string, verdict: Verdict, note: string) => {
    const file = state.cases[id];
    const alert = ALERTS.find((item) => item.id === id);
    if (!file || !alert) return;
    const { KEYS } = await import("../content/console/keys");
    const grade = gradeAlert({
      steps: PLAYBOOKS[alert.playbook] ?? [],
      answers: file.answers,
      verdict,
      contained: state.contained,
      deleted: state.deletedMail,
      hostId: alert.hostId,
      key: KEYS[id],
    });
    update((current) => closeAlert(current, id, verdict, note, grade, localDay()));
  },
  dismissStreak: () => update((current) => dismissStreak(current, localDay())),
  dismissConfetti: () => update((current) => dismissConfetti(current)),
  retry: (id: string) => {
    const alert = ALERTS.find((item) => item.id === id);
    if (!alert) return;
    update((current) => retryAlert(current, id, alert.role));
  },
  seeWriteup: (id: string) => update((current) => seeWriteup(current, id)),
  rate: (id: string) => update((current) => rateCase(current, id)),
  contain: (hostId: string) => update((current) => toggleContain(current, hostId)),
  deleteMail: (mailId: string) => update((current) => deleteMail(current, mailId)),
  connect: (hostId: string) => update((current) => connectHost(current, hostId)),
  command: (command: string, output: string) => update((current) => pushShell(current, command, output)),
  role: (role: Role) => update((current) => setRole(current, role)),
  collapse: () => update((current) => toggleCollapsed(current)),
  reset: () => commit(fresh()),
};
