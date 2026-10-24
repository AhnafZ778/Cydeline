import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X, Pin } from "lucide-react";
import { api, terminal, type Event } from "./types";
import { useRun, useDraft } from "./RunContext";
type LogLine = {
  id: string;
  time: string;
  epoch: number;
  type: string;
  src: string;
  sport: string;
  dst: string;
  dport: string;
  action: string;
  raw: string;
};
const LOG_FIELDS: Array<{
  id: string;
  label: string;
  kind: "text" | "number";
  get: (line: LogLine) => string;
}> = [
  { id: "type", label: "Type", kind: "text", get: (line) => line.type },
  {
    id: "source_address",
    label: "Source address",
    kind: "number",
    get: (line) => line.src,
  },
  {
    id: "source_port",
    label: "Source port",
    kind: "number",
    get: (line) => line.sport,
  },
  {
    id: "destination_address",
    label: "Destination address",
    kind: "number",
    get: (line) => line.dst,
  },
  {
    id: "destination_port",
    label: "Destination port",
    kind: "number",
    get: (line) => line.dport,
  },
  { id: "raw_log", label: "Raw log", kind: "text", get: (line) => line.raw },
];

const LOG_OPS = ["contains", "is", "is not"] as const;
const PAGE_SIZE = 7;
const RANGE_MS: Record<string, number | null> = {
  "All time": null,
  "Last 24 hours": 86_400_000,
  "Last 7 days": 7 * 86_400_000,
};

export function eventLine(line: LogLine): string {
  return `[${line.time}] source_address=${line.src} source_port=${line.sport} destination_address=${line.dst} destination_port=${line.dport} raw_log={${line.raw}}`;
}

export function LiveLogs({ onInspect }: { onInspect: (id: string) => void }) {
  const m = useRun(),
    s = m.snapshot!;
  const LOGS = useMemo<LogLine[]>(
    () =>
      m.events
        .map((e) => ({
          id: e.event_id,
          time: e.timestamp_utc,
          epoch: Date.parse(e.timestamp_utc),
          type: e.event_type,
          src: e.network?.src_ip ?? "Unavailable",
          sport: "Unavailable",
          dst: "Unavailable",
          dport: "Unavailable",
          action: e.outcome ?? "Recorded",
          raw: JSON.stringify(e),
        }))
        .reverse(),
    [m.events],
  );
  const RANGE_NOW = LOGS[0]?.epoch ?? Date.now();
  const [result, setResult] = useState<Set<string> | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mode, setMode] = useDraft<"basic" | "pro">(
    s.run_id,
    "logs-mode",
    "basic",
  );
  const [range, setRange] = useDraft(s.run_id, "logs-range", "All time");
  const [pro, setPro] = useDraft(s.run_id, "logs-pro", "");
  const [appliedPro, setAppliedPro] = useDraft(s.run_id, "logs-appliedPro", "");
  const [column, setColumn] = useDraft(
    s.run_id,
    "logs-column",
    LOG_FIELDS[1].id,
  );
  const [op, setOp] = useDraft<(typeof LOG_OPS)[number]>(
    s.run_id,
    "logs-op",
    "contains",
  );
  const [value, setValue] = useDraft(s.run_id, "logs-value", "");
  const [applied, setApplied] = useDraft<{
    column: string;
    op: (typeof LOG_OPS)[number];
    value: string;
  } | null>(s.run_id, "logs-applied", null);
  const [builder, setBuilder] = useDraft(s.run_id, "logs-builder", false);
  const [fieldsOpen, setFieldsOpen] = useDraft(
    s.run_id,
    "logs-fieldsOpen",
    true,
  );
  const [page, setPage] = useDraft(s.run_id, "logs-page", 0);
  const [openKey, setOpenKey] = useDraft<string | null>(
    s.run_id,
    "logs-openKey",
    null,
  );
  const valueRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (builder && mode === "basic") valueRef.current?.focus();
  }, [builder, column, mode]);

  useEffect(() => {
    let cancel = false;
    if (!appliedPro) {
      setResult(null);
      setSearchError(null);
      return;
    }
    void api<{ events: Event[] }>("/runs/" + s.run_id + "/queries", "POST", {
      query: appliedPro,
    })
      .then((r) => {
        if (!cancel) {
          setResult(new Set(r.events.map((e) => e.event_id)));
          setSearchError(null);
        }
      })
      .catch((e) => {
        if (!cancel) {
          setResult(new Set());
          setSearchError(e.message);
        }
      });
    return () => {
      cancel = true;
    };
  }, [s.run_id, appliedPro, m.events.length]);
  const rows = useMemo(() => {
    const span = RANGE_MS[range];
    return LOGS.filter((line) => {
      if (span != null && RANGE_NOW - line.epoch > span) return false;
      if (mode === "pro")
        return result === null ? !appliedPro : result.has(line.id);
      if (!applied) return true;
      return fieldMatch(line, applied.column, applied.op, applied.value);
    });
  }, [mode, range, applied, appliedPro, LOGS, result, RANGE_NOW]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = rows.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const newest = rows[0]?.time ?? "no released events";

  const runBasic = (event: FormEvent) => {
    event.preventDefault();
    const next = value.trim();
    setApplied(next ? { column, op, value: next } : null);
    setBuilder(Boolean(next));
    setPage(0);
  };

  return (
    <section className="lm" aria-label="Log management">
      <header className="lm__top">
        <h1>New Search</h1>
        <div className="lm__mode" role="group" aria-label="Search mode">
          <button
            type="button"
            className={mode === "basic" ? "is-on" : ""}
            onClick={() => setMode("basic")}
          >
            Basic
          </button>
          <button
            type="button"
            className={mode === "pro" ? "is-on" : ""}
            onClick={() => setMode("pro")}
          >
            Pro
          </button>
        </div>
      </header>
      <form
        className="lm__bar"
        onSubmit={
          mode === "basic"
            ? runBasic
            : (event) => {
                event.preventDefault();
                setAppliedPro(pro.trim());
                setPage(0);
              }
        }
      >
        {mode === "basic" && applied ? (
          <p className="lm__sentence">
            {fieldLabel(applied.column)} {applied.op} “{applied.value}”
          </p>
        ) : (
          <input
            aria-label={mode === "basic" ? "Search logs" : "Pro query"}
            placeholder="Enter search here..."
            value={mode === "basic" ? "" : pro}
            readOnly={mode === "basic"}
            onFocus={() => mode === "basic" && setBuilder(true)}
            onChange={(event) => setPro(event.target.value)}
          />
        )}
        <select
          aria-label="Time range"
          value={range}
          onChange={(event) => {
            setRange(event.target.value);
            setPage(0);
          }}
        >
          {Object.keys(RANGE_MS).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button type="submit" className="lm__go" aria-label="Search">
          <Search className="icon" />
        </button>
      </form>
      <div className="live-tags soc-search-extras">
        <button
          className="btn btn--sm"
          disabled={!pro.trim() || m.busy || terminal(s.state)}
          onClick={() =>
            void m.act(
              "workspace",
              {
                revision: s.workspace.revision,
                saved_queries: [
                  ...s.workspace.saved_queries,
                  { name: pro.trim(), query: pro.trim() },
                ],
              },
              "PATCH",
            )
          }
        >
          Save search
        </button>
        {s.workspace.saved_queries.map((q, i) => (
          <button
            className="live-filter"
            key={i}
            onClick={() => {
              setMode("pro");
              setPro(q.query);
              setAppliedPro(q.query);
              setPage(0);
            }}
          >
            {q.name}
          </button>
        ))}
        <span>
          Pro: user:, session:, ip:, path:, status:, type:, outcome: or original
          field=value aliases.
        </span>
      </div>
      {searchError && <p role="alert">{searchError}</p>}
      <div className="lm__meta">
        <p>
          <span className="lm__tick" aria-hidden="true">
            ✓
          </span>{" "}
          {rows.length} events (before {newest})
        </p>
        <Pager page={safePage} pages={pages} onPage={setPage} />
      </div>
      <div className={`lm__body ${fieldsOpen ? "" : "is-fields-hidden"}`}>
        {fieldsOpen && (
          <aside className="lm__fields" aria-label="Interesting fields">
            <button
              type="button"
              className="lm__hide"
              onClick={() => setFieldsOpen(false)}
            >
              ‹ Hide Fields
            </button>
            <h2>Interesting fields</h2>
            <ul>
              {LOG_FIELDS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={column === item.id && builder ? "is-on" : ""}
                    onClick={() => {
                      setMode("basic");
                      setColumn(item.id);
                      setBuilder(true);
                    }}
                  >
                    <i aria-hidden="true">
                      {item.kind === "number" ? "#" : "a"}
                    </i>
                    {item.id}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
        <div className="lm__events">
          {!fieldsOpen && (
            <button
              type="button"
              className="lm__hide"
              onClick={() => setFieldsOpen(true)}
            >
              › Show Fields
            </button>
          )}
          <div className="lm__eventhead">
            <span className="lm__dot" aria-hidden="true" /> Event
          </div>
          {mode === "basic" && builder && (
            <div className="lm__builder">
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => {
                  setApplied(null);
                  setValue("");
                  setBuilder(false);
                  setPage(0);
                }}
              >
                <X className="icon" />
              </button>
              <label className="lm__field">
                <span>Column</span>
                <select
                  aria-label="Column"
                  value={column}
                  onChange={(event) => setColumn(event.target.value)}
                >
                  {LOG_FIELDS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lm__field lm__field--op">
                <span>Operator</span>
                <select
                  aria-label="Operator"
                  value={op}
                  onChange={(event) =>
                    setOp(event.target.value as (typeof LOG_OPS)[number])
                  }
                >
                  {LOG_OPS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="lm__field">
                <span>Value</span>
                <input
                  ref={valueRef}
                  aria-label="Value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
            </div>
          )}
          <ul className="lm__list">
            {slice.map((line) => {
              const key = line.id;
              const open = openKey === key;
              return (
                <li key={key} className={open ? "is-open" : ""}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenKey(open ? null : key)}
                  >
                    <ChevronDown className="icon" />
                    <span className="mono">{eventLine(line)}</span>
                  </button>
                  {open && (
                    <>
                      <div className="soc-log-actions">
                        <button
                          className="btn btn--sm"
                          onClick={() => onInspect(line.id)}
                        >
                          Inspect event
                        </button>
                        <button
                          className="btn btn--sm"
                          disabled={m.busy || terminal(s.state)}
                          aria-pressed={s.workspace.evidence_ids.includes(
                            line.id,
                          )}
                          onClick={() =>
                            void m.act(
                              "workspace",
                              {
                                revision: s.workspace.revision,
                                evidence_ids: s.workspace.evidence_ids.includes(
                                  line.id,
                                )
                                  ? s.workspace.evidence_ids.filter(
                                      (id) => id !== line.id,
                                    )
                                  : [...s.workspace.evidence_ids, line.id],
                              },
                              "PATCH",
                            )
                          }
                        >
                          <Pin className="icon" />
                          {s.workspace.evidence_ids.includes(line.id)
                            ? "Unpin evidence"
                            : "Pin as evidence"}
                        </button>
                      </div>
                      <pre className="mono">
                        {JSON.stringify(JSON.parse(line.raw), null, 2)}
                      </pre>
                    </>
                  )}
                </li>
              );
            })}
            {slice.length === 0 && (
              <li className="lm__none">No events for this search.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

function fieldLabel(id: string): string {
  return LOG_FIELDS.find((item) => item.id === id)?.label ?? id;
}

function fieldMatch(
  line: LogLine,
  column: string,
  op: (typeof LOG_OPS)[number],
  value: string,
): boolean {
  const field = LOG_FIELDS.find((item) => item.id === column);
  const got = (field ? field.get(line) : eventLine(line)).toLowerCase();
  const want = value.toLowerCase();
  if (op === "is") return got === want;
  if (op === "is not") return got !== want;
  return got.includes(want);
}

function Pager(props: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  const nums = pagerNums(props.page, props.pages);
  return (
    <nav className="lm__pager" aria-label="Event pages">
      <button
        type="button"
        aria-label="Previous page"
        disabled={props.page === 0}
        onClick={() => props.onPage(props.page - 1)}
      >
        ‹
      </button>
      {nums.map((num, index) =>
        num === "…" ? (
          <span key={`gap-${index}`}>…</span>
        ) : (
          <button
            key={num}
            type="button"
            aria-current={num === props.page + 1 ? "page" : undefined}
            onClick={() => props.onPage(Number(num) - 1)}
          >
            {num}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Next page"
        disabled={props.page >= props.pages - 1}
        onClick={() => props.onPage(props.page + 1)}
      >
        ›
      </button>
    </nav>
  );
}

function pagerNums(page: number, pages: number): Array<number | "…"> {
  if (pages <= 6) return Array.from({ length: pages }, (_, index) => index + 1);
  const current = page + 1;
  const out: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(pages - 1, current + 1);
  if (start > 2) out.push("…");
  for (let n = start; n <= end; n += 1) out.push(n);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}
