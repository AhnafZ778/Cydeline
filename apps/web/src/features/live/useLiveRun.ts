import { useCallback, useEffect, useRef, useState } from "react";
import { api, terminal, type Event, type Snapshot, type Replay } from "./types";
export function useLiveRun(runId: string | null) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [events, setEvents] = useState<Event[]>([]),
    [error, setError] = useState<string | null>(null),
    [connection, setConnection] = useState("connecting"),
    [replay, setReplay] = useState<Replay | null>(null),
    [busy, setBusy] = useState(false);
  const activeRun = useRef(runId);
  activeRun.current = runId;
  const cursor = useRef(0),
    generation = useRef(0);
  const accept = useCallback(
    (s: Snapshot) =>
      setSnapshot((p) =>
        p &&
        p.run_id === s.run_id &&
        (p.state_revision > s.state_revision ||
          (p.state_revision === s.state_revision &&
            (p.workspace.revision > s.workspace.revision ||
              (p.workspace.revision === s.workspace.revision &&
                (p.last_sequence > s.last_sequence ||
                  p.virtual_clock_sec > s.virtual_clock_sec)))))
          ? p
          : s,
      ),
    [],
  );
  const merge = useCallback(
    (incoming: Event[]) =>
      setEvents((p) => {
        const m = new Map(p.map((e) => [e.event_id, e]));
        for (const e of incoming) m.set(e.event_id, e);
        return [...m.values()].sort((a, b) => a.sequence - b.sequence);
      }),
    [],
  );
  const refresh = useCallback(async () => {
    if (runId) {
      const s = await api<Snapshot>("/runs/" + runId);
      if (runId === activeRun.current) accept(s);
      return s;
    }
  }, [runId, accept]);
  useEffect(() => {
    const gen = ++generation.current;
    cursor.current = 0;
    setSnapshot(null);
    setEvents([]);
    setReplay(null);
    setError(null);
    setConnection("connecting");
    if (!runId) return;
    let stream: EventSource | undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const s = await api<Snapshot>("/runs/" + runId);
        if (cancelled || gen !== generation.current) return;
        accept(s);
        let page: {
          events: Event[];
          next_cursor: number | null;
          has_more: boolean;
        };
        let after = 0;
        do {
          page = await api(
            "/runs/" +
              runId +
              "/events?cursor=" +
              after +
              "&through=" +
              s.last_sequence,
          );
          if (cancelled) return;
          merge(page.events);
          after = page.next_cursor ?? after;
        } while (page.has_more);
        cursor.current = after;
        stream = new EventSource(
          "/api/runs/" + runId + "/stream?cursor=" + after,
        );
        stream.onopen = () => setConnection("live");
        stream.onerror = () => setConnection("reconnecting");
        stream.addEventListener("telemetry", (ev) => {
          if (cancelled) return;
          const e = JSON.parse((ev as MessageEvent).data) as Event;
          cursor.current = Math.max(cursor.current, e.sequence);
          merge([e]);
        });
        stream.addEventListener("snapshot", (ev) => {
          if (cancelled) return;
          const s = JSON.parse((ev as MessageEvent).data) as Snapshot;
          accept(s);
          if (terminal(s.state)) {
            setConnection("recorded");
            stream?.close();
            void api<Replay>("/runs/" + runId + "/replay")
              .then((r) => { if (!cancelled && gen === generation.current) setReplay(r); })
              .catch((e) => { if (!cancelled) setError(e.message); });
          }
        });
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setConnection("unavailable");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      stream?.close();
    };
  }, [runId, accept, merge]);
  const act = useCallback(
    async <T>(
      path: string,
      body?: unknown,
      method = "POST",
    ): Promise<T | undefined> => {
      if (!runId) return;
      setBusy(true);
      setError(null);
      try {
        const result = await api<T>(
          "/runs/" + runId + "/" + path,
          method,
          body,
        );
        if (runId !== activeRun.current) return undefined;
        await refresh();
        return result;
      } catch (e) {
        setError((e as Error).message);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [runId, refresh],
  );
  return {
    snapshot: snapshot?.run_id === runId ? snapshot : null,
    events: snapshot?.run_id === runId ? events : [],
    error,
    setError,
    connection,
    replay,
    busy,
    act,
    refresh,
  };
}
