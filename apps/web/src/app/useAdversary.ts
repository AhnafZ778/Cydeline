import { useCallback, useEffect, useRef, useState } from "react";
import { AgentDecisionMeta, RunStatusSnapshot } from "../types/contracts";
import { AiState, Lens, aiStateOf, effectiveLens } from "../lib/adversary";

const LENS_KEY = "sl.lens";
/** How long the AI node stays in the "acting" state after a new move lands (wall clock). */
export const ACTING_MS = 6000;

function readLens(): Lens {
  try {
    return window.localStorage.getItem(LENS_KEY) === "blind" ? "blind" : "coached";
  } catch {
    return "coached";
  }
}

/**
 * Accumulates the AI's decisions as they are revealed by the control plane and derives the
 * lens state. Purely presentational: nothing here feeds scoring or state transitions.
 */
export function useAdversary(snapshot: RunStatusSnapshot | null, epoch: number, paused: boolean) {
  const [decisions, setDecisions] = useState<AgentDecisionMeta[]>([]);
  const [acting, setActing] = useState(false);
  const [pref, setPref] = useState<Lens>(readLens);
  const timer = useRef<number | null>(null);
  const runKey = `${snapshot?.run_id ?? ""}#${epoch}`;
  const lastRunKey = useRef(runKey);

  useEffect(() => {
    if (lastRunKey.current !== runKey) {
      lastRunKey.current = runKey;
      setDecisions([]);
      setActing(false);
    }
  }, [runKey]);

  const incoming = snapshot?.last_ai_decision ?? null;
  useEffect(() => {
    if (!incoming) return;
    setDecisions((prev) => (prev.some((d) => d.step === incoming.step) ? prev : [...prev, incoming]));
  }, [incoming]);

  const count = decisions.length;
  useEffect(() => {
    if (count === 0) return;
    setActing(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActing(false), ACTING_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [count]);

  const setLens = useCallback((l: Lens) => {
    setPref(l);
    try {
      window.localStorage.setItem(LENS_KEY, l);
    } catch {
      /* preference is optional */
    }
  }, []);

  const lens = effectiveLens(snapshot?.mode, pref);
  const state: AiState = aiStateOf({ decisions, acting, paused, finished: snapshot?.state === "completed" });
  return { decisions, lens, lensPref: pref, lensLocked: snapshot?.mode === "assessment", setLens, state, last: decisions[decisions.length - 1] ?? null };
}
