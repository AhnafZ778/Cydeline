import { ReactElement, useEffect, useRef, useState } from "react";
import { BookOpen, Check, Clock, Keyboard, MoreHorizontal, RotateCcw, Shield, Terminal, Waypoints } from "lucide-react";
import { STEP_LABELS, stepIndex, PhaseKey } from "../../lib/phase";
import { hms } from "../../lib/format";

export function TopBar(props: {
  phase: PhaseKey;
  clockMs: number;
  opponentActive: boolean;
  modeLabel: string;
  isSim: boolean;
  onReset: () => void;
  onShortcuts: () => void;
  onTour: () => void;
  onDev: () => void;
  devUnlocked: boolean;
  onToggleGuide: () => void;
}) {
  const idx = stepIndex(props.phase);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = (icon: ReactElement, label: string, fn: () => void) => (
    <button
      role="menuitem"
      className="menu__item"
      onClick={() => {
        setOpen(false);
        fn();
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark">
          <Shield className="icon" />
        </span>
        <span className="brand__text">Sentinel Loop</span>
      </div>
      <div className="mission-name">
        <strong>The Stolen Session</strong>
        <span>Northstar Analytics · {props.isSim ? "Simulation" : "Live range"}</span>
      </div>
      <button className="btn btn--ghost btn--sm guide-toggle" onClick={props.onToggleGuide} aria-label="Open guide">
        <BookOpen className="icon" /> <span className="guide-toggle__text">Guide</span>
      </button>
      <ol className="stepper" aria-label="Mission progress">
        {STEP_LABELS.map((label, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <li key={label} className={`step ${done ? "is-done" : ""} ${current ? "is-current" : ""}`} aria-current={current ? "step" : undefined}>
              <span className="step__num">{done ? <Check className="icon" style={{ width: 12, height: 12, strokeWidth: 3 }} /> : i + 1}</span>
              <span className="step__label">{label}</span>
            </li>
          );
        })}
      </ol>
      <div className="topbar__right">
        <span className="clock" title="Scenario clock (UTC)">
          <Clock className="icon" />
          <span className="clock__label">{props.clockMs ? hms(props.clockMs, false) : "--:--:--"}</span>
        </span>
        <span
          className={`opponent-chip ${props.opponentActive ? "" : "is-idle"}`}
          title={props.isSim ? "AI adversary (scripted simulation)" : "AI adversary (local model)"}
        >
          <span className="dot" aria-hidden="true" />
          <span className="opponent-chip__text">AI adversary · {props.opponentActive ? "active" : "idle"}</span>
        </span>
        <div className="menu" ref={ref}>
          <button className="btn btn--ghost btn--icon" aria-label="More" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <MoreHorizontal className="icon" />
          </button>
          {open && (
            <div className="menu__panel" role="menu">
              {item(<RotateCcw className="icon" />, "Restart mission", props.onReset)}
              {item(<Waypoints className="icon" />, "Replay the tour", props.onTour)}
              {item(<Keyboard className="icon" />, "Keyboard shortcuts", props.onShortcuts)}
              {props.devUnlocked && <div className="menu__sep" />}
              {props.devUnlocked && item(<Terminal className="icon" />, "Dev tools", props.onDev)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
