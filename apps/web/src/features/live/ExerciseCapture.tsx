import { useEffect, useRef, useState } from "react";
import type { eventWithTime } from "@rrweb/types";
import { api } from "./types";

export function ExerciseCapture({ runId }: { runId: string }) {
  const [enabled, setEnabled] = useState(false), [message, setMessage] = useState("");
  const stopped = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false, queue: eventWithTime[] = [], index = 0, flushing = false, captureId = "";
    const flush = async () => {
      if (flushing || !queue.length || !captureId || cancelled) return;
      flushing = true; const batch = queue.splice(0, 1000);
      try { await api("/runs/" + runId + "/capture", "POST", { capture_id: captureId, index, events: batch }); index++; }
      catch { if (!cancelled) { void api("/runs/" + runId + "/capture-consent", "POST", {accepted: false, gap: true, capture_id: captureId}).catch(() => {}); setMessage("Recording stopped after a connection or storage error. This creates a visible gap; your exercise continues. Enable it again to start a new segment."); setEnabled(false); } }
      finally { flushing = false; }
    };
    void import("@rrweb/record").then(async ({record}) => {
      if (cancelled) return;
      const state = await api<{capture_id: string}>("/runs/" + runId + "/capture-consent", "POST", {accepted: true});
      if (cancelled) { void api("/runs/" + runId + "/capture-consent", "POST", {accepted: false, capture_id: state.capture_id}).catch(() => {}); return; }
      captureId = state.capture_id;
      stopped.current = record({
        emit: event => { if (queue.length >= 2000) { void api("/runs/" + runId + "/capture-consent", "POST", {accepted: false, gap: true, capture_id: captureId}).catch(() => {}); setMessage("Recording stopped because its buffer filled. The exercise continues."); setEnabled(false); return; } queue.push(event); },
        maskAllInputs: true, blockSelector: "input,textarea,[contenteditable],.rr-block,.learning-worksheet,.soc-case-notes,[data-private]",
        inlineStylesheet: true, recordCanvas: false, recordCrossOriginIframes: false, collectFonts: false, inlineImages: false, slimDOMOptions: "all",
        sampling: { mousemove: 100, scroll: 150, input: "last" }, mousemoveWait: 100,
      });
      setMessage("Exercise-tab recording is on. Instructors and assigned observers can see this tab and its cursor; inputs and private notes are blocked.");
      void flush();
    }).catch(e => { if (!cancelled) { setMessage(e.message); setEnabled(false); } });
    const timer = setInterval(() => void flush(), 250);
    return () => { cancelled = true; clearInterval(timer); stopped.current?.(); stopped.current = undefined; if (captureId) void api("/runs/" + runId + "/capture-consent", "POST", {accepted: false, capture_id: captureId}).catch(() => {}); };
  }, [runId, enabled]);
  return <details className="rr-block capture-notice" aria-label="Exercise recording consent"><summary>{enabled ? "● Recording exercise tab" : "Exercise recording · optional"}</summary><p>Let your instructor and assigned observers watch this exercise tab and cursor. Browser inputs and notes are blocked. No personal desktop, camera, microphone, or keystroke log is captured. Recorded content stays local for seven days.</p><button className="btn" onClick={() => { if (enabled) setMessage("Recording is off. Your exercise continues."); setEnabled(x => !x); }}>{enabled ? "Stop recording" : "Allow exercise-tab recording"}</button>{message && <p role="status">{message}</p>}</details>;
}
