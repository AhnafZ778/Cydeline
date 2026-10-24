import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function ConsoleModal({
  title,
  onClose,
  children,
  wide = false,
  pop = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  pop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current!;
    const items = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ),
      );
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? items()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const all = items(),
          first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className={"soc-scrim " + (pop ? "is-pop" : "")} onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          "soc-modal " + (wide ? "is-wide " : "") + (pop ? "is-pop" : "")
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="soc-icon soc-modal__x"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="icon" />
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
export function Severity({ value }: { value: string }) {
  return (
    <span className={"sev sev--" + value.toLowerCase()}>
      <i aria-hidden="true" />
      {value}
    </span>
  );
}
