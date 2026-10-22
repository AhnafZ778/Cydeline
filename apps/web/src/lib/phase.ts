import { RunStatusSnapshot } from "../types/contracts";

export type PhaseKey = "observe" | "investigate" | "declare" | "contain" | "verify" | "done";

export const STEP_LABELS = ["Observe", "Investigate", "Declare", "Contain", "Verify"] as const;

export type DrawerName = "inspector" | "declare" | "respond" | "verify" | "dev" | "help" | null;

export interface PhaseInput {
  snapshot: RunStatusSnapshot | null;
  pinnedCount: number;
  inspected: boolean;
  drawer: DrawerName;
}

/** Derive the current phase purely from server snapshot plus the learner's own progress. */
export function selectPhase({ snapshot, pinnedCount, inspected, drawer }: PhaseInput): PhaseKey {
  if (snapshot?.verification?.both_passed) return "done";
  if (snapshot?.sess_a_revoked) return "verify";
  if (snapshot?.declaration) return "contain";
  if (drawer === "declare") return "declare";
  if (pinnedCount > 0 || inspected) return "investigate";
  return "observe";
}

/** 0-based index of the current stepper step (5 means all done). */
export function stepIndex(phase: PhaseKey): number {
  switch (phase) {
    case "observe":
      return 0;
    case "investigate":
      return 1;
    case "declare":
      return 2;
    case "contain":
      return 3;
    case "verify":
      return 4;
    default:
      return 5;
  }
}

export interface ObjectiveState {
  id: string;
  label: string;
  done: boolean;
}

export function objectiveStates(input: {
  snapshot: RunStatusSnapshot | null;
  pinnedCount: number;
  inspected: boolean;
}): ObjectiveState[] {
  const { snapshot, pinnedCount, inspected } = input;
  return [
    { id: "inspect", label: "Open a log line to inspect it", done: inspected || pinnedCount > 0 },
    { id: "pin", label: "Pin 2 or more log lines as evidence", done: pinnedCount >= 2 || !!snapshot?.declaration },
    { id: "declare", label: "Declare the incident", done: !!snapshot?.declaration },
    { id: "contain", label: "Contain it with the smallest action that works", done: !!snapshot?.sess_a_revoked },
    { id: "verify", label: "Verify the intruder is out and legitimate work continues", done: !!snapshot?.verification?.both_passed },
  ];
}

export interface Cta {
  label: string;
  enabled: boolean;
  reason: string | null;
}

export function ctaFor(phase: PhaseKey, ctx: { selectedId: string | null; selectedPinned: boolean; pinnedCount: number }): Cta {
  switch (phase) {
    case "observe":
      return ctx.selectedId
        ? { label: "Pin evidence", enabled: !ctx.selectedPinned, reason: null }
        : { label: "Pin evidence", enabled: false, reason: "Click a log line to inspect it first" };
    case "investigate":
      if (ctx.pinnedCount === 0) {
        return ctx.selectedId && !ctx.selectedPinned
          ? { label: "Pin evidence", enabled: true, reason: "Pin the lines that support your theory" }
          : { label: "Pin evidence", enabled: false, reason: "Click a log line, then pin it" };
      }
      return {
        label: "Declare incident",
        enabled: true,
        reason: ctx.pinnedCount === 1 ? "1 line pinned. 2 or more makes a stronger case" : `${ctx.pinnedCount} lines pinned`,
      };
    case "declare":
      return { label: "Declare incident", enabled: true, reason: "Finish the form on the right" };
    case "contain":
      return { label: "Choose response", enabled: true, reason: "Your declaration was accepted" };
    case "verify":
      return { label: "Run both checks", enabled: true, reason: "Containment is a claim until you test it" };
    default:
      return { label: "See debrief", enabled: true, reason: "Both checks passed" };
  }
}
