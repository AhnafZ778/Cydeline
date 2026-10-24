import { createContext, useContext, useState, type ReactNode } from "react";
import { useLiveRun } from "./useLiveRun";
import { draftKey } from "./types";
export const runHref = (rid: string, page = "monitoring") =>
  "#/live/" + rid + "/" + page;
const RunContext = createContext<ReturnType<typeof useLiveRun> | null>(null);
export function RunProvider({
  rid,
  children,
}: {
  rid: string | null;
  children: ReactNode;
}) {
  const run = useLiveRun(rid);
  return <RunContext.Provider value={run}>{children}</RunContext.Provider>;
}
export function useRun() {
  const m = useContext(RunContext);
  if (!m) throw Error("Missing run context");
  return m;
}
// Drafts are per-run and per-browser-tab; server records remain authoritative.
export function useDraft<T>(
  rid: string,
  name: string,
  initial: T,
): [T, (value: T | ((previous: T) => T)) => void] {
  const key = draftKey(rid, name);
  const [value, setValue] = useState<T>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? "null") ?? initial;
    } catch {
      return initial;
    }
  });
  return [
    value,
    (update: T | ((previous: T) => T)) => {
      setValue(previous => {
        const next = typeof update === "function" ? (update as (p: T) => T)(previous) : update;
        try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* storage may be disabled */ }
        return next;
      });
    },
  ];
}
