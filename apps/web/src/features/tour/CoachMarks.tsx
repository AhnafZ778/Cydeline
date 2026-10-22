import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TOUR } from "../../content/guide";

const KEY = "sl.tour.done";

export function tourDone(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markTourDone() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

function visibleTarget(name: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

/** Four short steps pointing at the real UI. Skippable, keyboard operable, remembers completion. */
export function CoachMarks({ onClose }: { onClose: () => void }) {
  const steps = useMemo(() => TOUR.filter((t) => visibleTarget(t.target)), []);
  const [i, setI] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const step = steps[i];

  const finish = () => {
    markTourDone();
    onClose();
  };

  useLayoutEffect(() => {
    if (!step) return;
    const el = visibleTarget(step.target);
    if (!el) return;
    el.scrollIntoView({ block: "nearest", behavior: "auto" });
    el.classList.add("tour-target");
    const place = () => {
      const r = el.getBoundingClientRect();
      const w = 300;
      const h = box.current?.offsetHeight ?? 160;
      let left = Math.min(window.innerWidth - w - 12, Math.max(12, r.left + 16));
      let top = r.bottom + 14;
      if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 14);
      if (top < 12 || (r.top < 12 && r.bottom > window.innerHeight - 12)) top = Math.max(12, Math.min(window.innerHeight - h - 12, r.top + 24));
      if (window.innerWidth - r.right > w + 24 && r.width < 420) left = r.right + 16;
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      el.classList.remove("tour-target");
    };
  }, [step]);

  useEffect(() => {
    box.current?.focus();
  }, [i]);

  useEffect(() => {
    if (steps.length === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!step) return null;
  const last = i === steps.length - 1;

  return (
    <div
      className="coach"
      role="dialog"
      aria-label={`Tour step ${i + 1} of ${steps.length}: ${step.title}`}
      tabIndex={-1}
      ref={box}
      style={{ top: pos?.top ?? -999, left: pos?.left ?? -999 }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          finish();
        }
      }}
    >
      <span className="eyebrow">
        Tour · {i + 1} of {steps.length}
      </span>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      <div className="coach__foot">
        <button className="btn btn--ghost btn--sm" onClick={finish}>
          Skip tour
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {i > 0 && (
            <button className="btn btn--sm" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button className="btn btn--primary btn--sm" onClick={() => (last ? finish() : setI(i + 1))} data-testid="tour-next">
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
