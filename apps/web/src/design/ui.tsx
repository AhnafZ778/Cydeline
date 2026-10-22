import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Drawer(props: {
  label: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  foot?: ReactNode;
  children: ReactNode;
  titleMono?: boolean;
}) {
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    head.current?.focus({ preventScroll: true });
  }, []);
  return (
    <aside className="drawer" aria-label={props.label}>
      <div className="drawer__head">
        <div style={{ minWidth: 0 }}>
          {props.eyebrow && <span className="eyebrow">{props.eyebrow}</span>}
          <h2
            ref={head}
            tabIndex={-1}
            style={props.titleMono ? { fontFamily: "var(--font-mono)", fontSize: "var(--fs-16)", wordBreak: "break-all" } : undefined}
          >
            {props.title}
          </h2>
          {props.subtitle && <p>{props.subtitle}</p>}
        </div>
        <button className="btn btn--ghost btn--icon" aria-label="Close panel" onClick={props.onClose}>
          <X className="icon" />
        </button>
      </div>
      <div className="drawer__body">{props.children}</div>
      {props.foot && <div className="drawer__foot">{props.foot}</div>}
    </aside>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="kbd">{children}</span>;
}

export function Chip(props: { tone?: "brand" | "teal" | "coral" | "amber" | "indigo"; children: ReactNode; title?: string }) {
  return (
    <span className={`chip ${props.tone ? `chip--${props.tone}` : ""}`} title={props.title}>
      {props.children}
    </span>
  );
}

/** Glossary term: dotted underline with an accessible tooltip. */
export function Term({ children, hint }: { children: ReactNode; hint: string }) {
  return (
    <abbr className="term" title={hint}>
      {children}
    </abbr>
  );
}

export function Seg<T extends string>(props: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o.value} aria-pressed={props.value === o.value} onClick={() => props.onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Modal dialog with focus trap, Esc to close and focus restore. */
export function Modal(props: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = box.current;
    const auto = el?.querySelector<HTMLElement>("[data-autofocus]");
    (auto ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        props.onClose();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const f = Array.from(el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((n) => !n.hasAttribute("disabled"));
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={props.label ?? props.title} tabIndex={-1} ref={box}>
        <h2>{props.title}</h2>
        {props.children}
        {props.actions && <div className="dialog__actions">{props.actions}</div>}
      </div>
    </div>
  );
}
