import { KeyboardEvent, ReactNode, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Pin, Search, X } from "lucide-react";
import { LogRowView, statusClass } from "../../lib/format";
import { Pivot, Term, applyPivot, groupBySession, matchRow, parseTerm, termLabel } from "../../lib/query";
import { Seg } from "../../design/ui";

const GRID_HEAD = ["", "Time", "Level", "Source", "Verb", "Path", "Status", "Session", "User", "Source IP", "Lat.", "Request", ""];

const Row = memo(function Row(props: {
  r: LogRowView;
  selected: boolean;
  pinned: boolean;
  focus: boolean;
  fresh: boolean;
  ai: boolean;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onFocusRow: (id: string) => void;
}) {
  const { r } = props;
  return (
    <div
      id={`row-${r.id}`}
      className={`logrow ${props.selected ? "is-selected" : ""} ${props.pinned ? "is-pinned" : ""} ${props.fresh ? "is-new" : ""} ${props.ai ? "is-ai" : ""}`}
      role="row"
      data-level={r.level}
      data-testid="log-row"
      data-session={r.session}
      data-status={r.status ?? ""}
      data-path={r.path}
      tabIndex={props.focus ? 0 : -1}
      aria-selected={props.selected}
      onClick={() => props.onSelect(r.id)}
      onFocus={() => props.onFocusRow(r.id)}
    >
      <span className="gutter" role="presentation" />
      <span className="t" role="cell">
        {r.time}
      </span>
      <span className={`lvl lvl--${r.level}`} role="cell">
        {r.level}
      </span>
      <span className="src" role="cell" title={r.source}>
        {r.source}
      </span>
      <span className="method" role="cell">
        {r.method}
      </span>
      <span className="path" role="cell" title={r.path}>
        {r.path}
      </span>
      <span className={`status ${statusClass(r.status)}`} role="cell">
        {r.status ?? "-"}
      </span>
      <span className="sess" role="cell">
        {props.ai && (
          <span className="aitag" title="Attributed to the AI adversary by the lens (practice mode)">
            AI
          </span>
        )}
        {r.session}
      </span>
      <span role="cell">{r.user}</span>
      <span className="ip" role="cell">
        {r.ip ?? "-"}
      </span>
      <span role="cell">{r.latency ?? "-"}</span>
      <span role="cell" title={r.rid}>
        {r.rid.replace(/^req_/, "")}
      </span>
      <span role="cell">
        <button
          className="pin"
          aria-pressed={props.pinned}
          aria-label={props.pinned ? `Unpin ${r.rid} from evidence` : `Pin ${r.rid} as evidence`}
          onClick={(e) => {
            e.stopPropagation();
            props.onPin(r.id);
          }}
        >
          <Pin className="icon" style={{ width: 14, height: 14 }} fill={props.pinned ? "currentColor" : "none"} />
        </button>
      </span>
    </div>
  );
});

export function LogConsole(props: {
  rows: LogRowView[];
  terms: Term[];
  pivot: Pivot;
  paused: boolean;
  newCount: number;
  isSim: boolean;
  pinned: string[];
  aiRowIds?: Set<string> | null;
  selectedId: string | null;
  onAddTerm: (t: Term) => void;
  onRemoveTerm: (t: Term) => void;
  onClearTerms: () => void;
  onPivot: (p: Pivot) => void;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onTogglePause: () => void;
  tray?: ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const seen = useRef<number | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const base = props.rows.filter((r) => matchRow(r, props.terms));
    return applyPivot(base, props.pivot);
  }, [props.rows, props.terms, props.pivot]);

  const groups = useMemo(() => (props.pivot === "bysession" ? groupBySession(filtered) : null), [filtered, props.pivot]);
  const flat = useMemo(() => (groups ? groups.flatMap((g) => g.rows) : filtered), [groups, filtered]);

  // Highlight newly arrived rows once.
  useEffect(() => {
    const max = props.rows.reduce((m, r) => Math.max(m, r.seq), 0);
    if (seen.current === null) {
      seen.current = max;
      return;
    }
    const prev = seen.current;
    seen.current = max;
    const next = new Set(props.rows.filter((r) => r.seq > prev).map((r) => r.seq));
    setFresh(next);
  }, [props.rows]);

  // Tail-follow while the learner is at the bottom.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || props.pivot === "bysession") return;
    if (stick.current) el.scrollTop = el.scrollHeight;
  }, [flat.length, props.pivot]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    stick.current = near;
    setAtBottom(near);
  };

  const jumpLatest = () => {
    const el = listRef.current;
    if (!el) return;
    stick.current = true;
    el.scrollTop = el.scrollHeight;
    setAtBottom(true);
  };

  const effectiveFocus = flat.some((r) => r.id === focusId) ? focusId : flat.length ? flat[flat.length - 1].id : null;

  const moveFocus = (delta: number) => {
    if (!flat.length) return;
    const idx = Math.max(0, flat.findIndex((r) => r.id === effectiveFocus));
    const next = flat[Math.min(flat.length - 1, Math.max(0, idx + delta))];
    setFocusId(next.id);
    stick.current = false;
    requestAnimationFrame(() => document.getElementById(`row-${next.id}`)?.focus({ preventScroll: false }));
  };

  // Global log hotkeys. Ignored while typing.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      const inList = !!t?.closest?.(".loglist");
      if (e.key === "j" || (inList && e.key === "ArrowDown")) {
        e.preventDefault();
        moveFocus(1);
      } else if (e.key === "k" || (inList && e.key === "ArrowUp")) {
        e.preventDefault();
        moveFocus(-1);
      } else if (e.key === "Enter" && inList && effectiveFocus && t?.classList.contains("logrow")) {
        e.preventDefault();
        props.onSelect(effectiveFocus);
      } else if (e.key === "p" && effectiveFocus) {
        const id = props.selectedId && !inList ? props.selectedId : effectiveFocus;
        props.onPin(id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const commit = () => {
    const parts = draft.split(/\s+/).filter(Boolean);
    for (const p of parts) {
      const t = parseTerm(p);
      if (t) props.onAddTerm(t);
    }
    setDraft("");
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      if (draft.trim()) {
        e.preventDefault();
        commit();
      }
    } else if (e.key === "Backspace" && draft === "" && props.terms.length) {
      props.onRemoveTerm(props.terms[props.terms.length - 1]);
    } else if (e.key === "Escape") {
      if (draft) setDraft("");
      else inputRef.current?.blur();
    }
  };

  const total = props.rows.length;
  const filtersActive = props.terms.length > 0 || props.pivot !== "all";

  const renderRow = (r: LogRowView) => (
    <Row
      key={r.id}
      r={r}
      selected={r.id === props.selectedId}
      pinned={props.pinned.includes(r.id)}
      focus={r.id === effectiveFocus}
      fresh={fresh.has(r.seq)}
      ai={!!props.aiRowIds?.has(r.id)}
      onSelect={props.onSelect}
      onPin={props.onPin}
      onFocusRow={setFocusId}
    />
  );

  return (
    <section className="card console" aria-label="Log console" data-tour="logs">
      <div className="console__head">
        <div className="console__title">
          <div>
            <div className="card__title">Logs</div>
            <div className="card__sub">northstar-api · access log · UTC</div>
          </div>
        </div>
        <label className="query" onClick={() => inputRef.current?.focus()}>
          <Search className="icon" style={{ color: "var(--ink-3)", width: 15, height: 15 }} />
          <span className="sr-only">Filter logs</span>
          {props.terms.map((t) => (
            <span className="chip chip--brand chip--removable" key={termLabel(t)}>
              {termLabel(t)}
              <button type="button" aria-label={`Remove filter ${termLabel(t)}`} onClick={(e) => { e.preventDefault(); props.onRemoveTerm(t); }}>
                <X className="icon" style={{ width: 12, height: 12 }} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onInputKey}
            onBlur={() => draft.trim() && commit()}
            placeholder={props.terms.length ? "Add filter" : "Filter: user:eli  status:4xx  path:/docs*   ( / )"}
            spellCheck={false}
            autoComplete="off"
            aria-label="Filter logs. Use key:value terms such as session, user, status, path, ip."
          />
        </label>
        <Seg
          label="Log view"
          value={props.pivot}
          onChange={props.onPivot}
          options={[
            { value: "all", label: "All" },
            { value: "denied", label: "Denied" },
            { value: "restricted", label: "Restricted" },
            { value: "bysession", label: "By session" },
          ]}
        />
        <button className={`live-toggle ${props.paused ? "is-paused" : ""}`} onClick={props.onTogglePause} aria-pressed={props.paused} data-testid="live-toggle">
          <span className="dot" aria-hidden="true" />
          {props.paused ? (props.isSim ? "Scenario paused" : "Display paused") : "Live"}
          {props.paused && props.newCount > 0 && <span className="new-pill">{props.newCount} new</span>}
        </button>
      </div>

      {props.tray}
      <div className="logs">
        <div className="loglist" ref={listRef} onScroll={onScroll} role="table" aria-label="Access log lines" aria-rowcount={flat.length}>
          <div className="logs__inner">
            <div className="loghead" role="row">
              {GRID_HEAD.map((h, i) => (
                <span key={i} role="columnheader" aria-label={h || undefined}>
                  {h}
                </span>
              ))}
            </div>
            {flat.length === 0 ? (
              <div className="logs__empty" role="row">
                {total === 0 ? (
                  <>
                    <strong>Waiting for the first request...</strong>
                    <span>Log lines appear here as people use northstar-api.</span>
                  </>
                ) : (
                  <>
                    <strong>No log lines match these filters.</strong>
                    <button className="btn btn--sm" onClick={() => { props.onClearTerms(); props.onPivot("all"); }}>
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            ) : groups ? (
              groups.map((g) => (
                <div key={g.session} role="rowgroup">
                  <div className="loggroup" role="row">
                    <strong className="mono">{g.session}</strong>
                    <span>{g.user}</span>
                    <span>{g.rows.length} requests</span>
                    <span>
                      {g.distinctIps.length} source IP{g.distinctIps.length === 1 ? "" : "s"}
                      {g.distinctIps.length > 0 && <span className="mono"> · {g.distinctIps.join(", ")}</span>}
                    </span>
                  </div>
                  {g.rows.map(renderRow)}
                </div>
              ))
            ) : (
              flat.map(renderRow)
            )}
          </div>
        </div>
      </div>

      <div className="logs__foot">
        <span>
          {flat.length === total ? `${total} lines` : `${flat.length} of ${total} lines`}
          {filtersActive && (
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: 8, height: 22 }} onClick={() => { props.onClearTerms(); props.onPivot("all"); }}>
              Clear filters
            </button>
          )}
        </span>
        <span className="logs__keys">
          {!atBottom && props.pivot !== "bysession" ? (
            <button className="btn btn--sm" style={{ height: 22 }} onClick={jumpLatest}>
              <ArrowDown className="icon" style={{ width: 12, height: 12 }} /> Latest
            </button>
          ) : (
            <>
              <span className="kbd">j</span> <span className="kbd">k</span> move · <span className="kbd">Enter</span> inspect · <span className="kbd">p</span> pin · <span className="kbd">/</span> filter
            </>
          )}
        </span>
      </div>
    </section>
  );
}
