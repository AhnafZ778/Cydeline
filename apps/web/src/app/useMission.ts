import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ControlPlaneClient,
  DebriefResponse,
  DefenderAction,
  DefenderActionReceipt,
  EventEnvelope,
  ReplayResponse,
  RunStatusSnapshot,
  VerificationResponse,
} from "../types/contracts";
import { LogRowView, toRows } from "../lib/format";
import { Pivot, Term, sameTerm } from "../lib/query";
import { Cta, DrawerName, PhaseKey, ctaFor, objectiveStates, selectPhase } from "../lib/phase";

export type MissionStatus = "landing" | "starting" | "live" | "debrief";

export interface DebriefBundle {
  debrief: DebriefResponse;
  replay: ReplayResponse;
}

function mergeEvents(prev: EventEnvelope[], incoming: EventEnvelope[]): EventEnvelope[] {
  if (incoming.length === 0) return prev;
  const map = new Map(prev.map((e) => [e.event_id, e]));
  for (const e of incoming) map.set(e.event_id, e);
  return [...map.values()].sort((a, b) => a.sequence - b.sequence);
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function useMission(client: ControlPlaneClient) {
  const isSim = client.modeLabel === "Stateful AI Simulation";

  const [status, setStatus] = useState<MissionStatus>("landing");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RunStatusSnapshot | null>(null);
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  const [frozenSeq, setFrozenSeq] = useState<number | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspected, setInspected] = useState(false);
  const [suspect, setSuspect] = useState<string | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [pivot, setPivot] = useState<Pivot>("all");
  const [drawer, setDrawer] = useState<DrawerName>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [bundle, setBundle] = useState<DebriefBundle | null>(null);
  const [receipt, setReceipt] = useState<DefenderActionReceipt | null>(null);
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [announce, setAnnounce] = useState("");
  const [lastEventAt, setLastEventAt] = useState<number>(0);
  const [epoch, setEpoch] = useState(0);

  const eventsRef = useRef<EventEnvelope[]>([]);
  eventsRef.current = events;
  const keyRef = useRef<Record<string, string>>({});
  const runId = snapshot?.run_id ?? null;

  const refresh = useCallback(
    async (id: string) => {
      const [snap, evts] = await Promise.all([client.getSnapshot(id), client.getEvents(id)]);
      setSnapshot(snap);
      setEvents((prev) => mergeEvents(prev, evts));
    },
    [client]
  );

  // ---------------------------------------------------------------- lifecycle
  const begin = useCallback(
    async (existingRun?: string) => {
      setStatus("starting");
      setError(null);
      try {
        const snap = existingRun ? await client.resetRun(existingRun, "practice") : await client.createAndStartRun("practice");
        const evts = await client.getEvents(snap.run_id);
        keyRef.current = {};
        setEpoch((n) => n + 1);
        setSnapshot(snap);
        setEvents(evts);
        setFrozenSeq(null);
        setPinned([]);
        setSelectedId(null);
        setInspected(false);
        setSuspect(null);
        setTerms([]);
        setPivot("all");
        setDrawer(null);
        setBundle(null);
        setReceipt(null);
        setVerification(null);
        setAnnounce("Shift started. Live logs are streaming.");
        setLastEventAt(Date.now());
        setStatus("live");
      } catch (e) {
        setError(message(e));
        setStatus("landing");
      }
    },
    [client]
  );

  const start = useCallback(() => begin(), [begin]);
  const reset = useCallback(() => begin(runId ?? undefined), [begin, runId]);

  // ---------------------------------------------------------------- live ticking
  const paused = frozenSeq !== null;
  const finished = snapshot?.state === "completed";
  useEffect(() => {
    if (status !== "live" || !runId || paused || finished) return;
    let cancelled = false;
    let inFlight = false;
    const timer = window.setInterval(
      async () => {
        if (inFlight) return;
        inFlight = true;
        try {
          if (isSim) {
            const r = await client.stepSimulationTurn(runId);
            if (cancelled) return;
            setSnapshot(r.snapshot);
            if (r.newEvents.length) setLastEventAt(Date.now());
            setEvents((prev) => mergeEvents(prev, r.newEvents));
          } else {
            await refresh(runId);
          }
        } catch (e) {
          if (!cancelled) setError(message(e));
        } finally {
          inFlight = false;
        }
      },
      isSim ? 4000 : 1500
    );
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status, runId, paused, finished, isSim, client, refresh]);

  // ---------------------------------------------------------------- derived
  const shownEvents = useMemo(
    () => (frozenSeq === null ? events : events.filter((e) => e.sequence <= frozenSeq)),
    [events, frozenSeq]
  );
  const rows: LogRowView[] = useMemo(() => toRows(shownEvents), [shownEvents]);
  const allRows: LogRowView[] = useMemo(() => toRows(events), [events]);
  const newCount = Math.max(0, allRows.length - rows.length);
  const rowById = useMemo(() => new Map(allRows.map((r) => [r.id, r])), [allRows]);
  const selectedRow = selectedId ? rowById.get(selectedId) ?? null : null;
  const nowMs = rows.length ? rows[rows.length - 1].ms : 0;

  const phase: PhaseKey = selectPhase({ snapshot, pinnedCount: pinned.length, inspected, drawer });
  const cta: Cta = ctaFor(phase, {
    selectedId,
    selectedPinned: !!selectedId && pinned.includes(selectedId),
    pinnedCount: pinned.length,
  });
  const objectives = objectiveStates({ snapshot, pinnedCount: pinned.length, inspected });

  // ---------------------------------------------------------------- actions
  const togglePause = useCallback(() => {
    setFrozenSeq((f) => {
      if (f !== null) return null;
      const last = eventsRef.current[eventsRef.current.length - 1];
      return last ? last.sequence : 0;
    });
  }, []);

  const resume = useCallback(() => setFrozenSeq(null), []);

  const openDrawer = useCallback((d: DrawerName) => setDrawer(d), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      setInspected(true);
      setDrawer((d) => (d === null || d === "inspector" ? "inspector" : d));
    } else {
      setDrawer((d) => (d === "inspector" ? null : d));
    }
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinned((p) => {
      const has = p.includes(id);
      setAnnounce(has ? "Evidence unpinned." : "Evidence pinned.");
      return has ? p.filter((x) => x !== id) : [...p, id];
    });
  }, []);

  const addTerm = useCallback((t: Term) => {
    setTerms((prev) => (prev.some((x) => sameTerm(x, t)) ? prev : [...prev, t]));
  }, []);
  const removeTerm = useCallback((t: Term) => setTerms((prev) => prev.filter((x) => !sameTerm(x, t))), []);
  const clearTerms = useCallback(() => setTerms([]), []);

  const declare = useCallback(
    async (payload: { suspected_actor: string; suspected_session: string; evidence_event_ids: string[]; rationale: string }) => {
      if (!runId) return { ok: false as const, error: "No active run." };
      setBusy("declare");
      try {
        const r = await client.declareIncident(runId, payload);
        setSnapshot(r.snapshot);
        await refresh(runId);
        setSuspect(payload.suspected_session);
        setDrawer("respond");
        setAnnounce("Declaration accepted. Choose a response.");
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: message(e) };
      } finally {
        setBusy(null);
      }
    },
    [client, runId, refresh]
  );

  const apply = useCallback(
    async (action: DefenderAction) => {
      if (!runId || !snapshot?.declaration) return { ok: false as const, error: "Declare the incident first." };
      setBusy("apply");
      const key = (keyRef.current[action] ??= `idem_${runId}_${action}_${Math.random().toString(36).slice(2, 10)}`);
      try {
        const r = await client.applyDefenderAction(runId, {
          action,
          target_handle: snapshot.declaration.suspected_session,
          idempotency_key: key,
        });
        delete keyRef.current[action];
        setSnapshot(r.snapshot);
        setReceipt(r.receipt);
        setVerification(null);
        await refresh(runId);
        setAnnounce(`Response confirmed by the server: ${action.replace(/_/g, " ")}.`);
        return { ok: true as const, receipt: r.receipt };
      } catch (e) {
        return { ok: false as const, error: message(e) };
      } finally {
        setBusy(null);
      }
    },
    [client, runId, snapshot, refresh]
  );

  const verify = useCallback(async () => {
    if (!runId) return;
    setBusy("verify");
    setDrawer("verify");
    try {
      const r = await client.verifyRecovery(runId);
      setSnapshot(r.snapshot);
      setVerification(r.verification);
      await refresh(runId);
      setAnnounce(r.verification.both_passed ? "Both checks passed." : "At least one check failed.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }, [client, runId, refresh]);

  const loadDebrief = useCallback(async () => {
    if (!runId) return;
    setBusy("debrief");
    try {
      const [debrief, replay] = await Promise.all([client.getDebrief(runId), client.getReplay(runId)]);
      setBundle({ debrief, replay });
      setDrawer(null);
      setStatus("debrief");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }, [client, runId]);

  const backToWorkbench = useCallback(() => setStatus("live"), []);

  const runCta = useCallback(() => {
    if (!cta.enabled) return;
    switch (phase) {
      case "observe":
        if (selectedId) togglePin(selectedId);
        break;
      case "investigate":
        if (pinned.length === 0 && selectedId) togglePin(selectedId);
        else setDrawer("declare");
        break;
      case "declare":
        setDrawer("declare");
        break;
      case "contain":
        setDrawer("respond");
        break;
      case "verify":
        void verify();
        break;
      default:
        void loadDebrief();
    }
  }, [cta.enabled, phase, selectedId, pinned.length, togglePin, verify, loadDebrief]);

  return {
    isSim,
    modeLabel: client.modeLabel,
    status,
    error,
    clearError: () => setError(null),
    snapshot,
    events,
    rows,
    allRows,
    rowById,
    newCount,
    nowMs,
    paused,
    togglePause,
    resume,
    pinned,
    togglePin,
    selectedId,
    selectedRow,
    select,
    suspect,
    setSuspect,
    terms,
    addTerm,
    removeTerm,
    clearTerms,
    pivot,
    setPivot,
    drawer,
    openDrawer,
    closeDrawer,
    busy,
    bundle,
    receipt,
    verification,
    announce,
    lastEventAt,
    epoch,
    phase,
    cta,
    objectives,
    inspected,
    start,
    reset,
    declare,
    apply,
    verify,
    loadDebrief,
    backToWorkbench,
    runCta,
    stepOnce: async () => {
      if (!runId) return;
      const r = await client.stepSimulationTurn(runId);
      setSnapshot(r.snapshot);
      setEvents((prev) => mergeEvents(prev, r.newEvents));
    },
    forceFallback: async () => {
      if (!runId) return;
      const r = await client.stepSimulationTurn(runId, true);
      setSnapshot(r.snapshot);
      setEvents((prev) => mergeEvents(prev, r.newEvents));
    },
  };
}

export type Mission = ReturnType<typeof useMission>;
