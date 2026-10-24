import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { HOSTS, INTEL, LOGS, MAIL, SHELL, type Host, type LogLine } from "../../content/console";
import { extHref } from "../../lib/route";
import { soc, useSoc } from "../../lib/socStore";
import { Modal, Sev } from "./Monitoring";

const LOG_FIELDS: Array<{ id: string; label: string; kind: "text" | "number"; get: (line: LogLine) => string }> = [
  { id: "type", label: "Type", kind: "text", get: (line) => line.type },
  { id: "source_address", label: "Source address", kind: "number", get: (line) => line.src },
  { id: "source_port", label: "Source port", kind: "number", get: (line) => line.sport },
  { id: "destination_address", label: "Destination address", kind: "number", get: (line) => line.dst },
  { id: "destination_port", label: "Destination port", kind: "number", get: (line) => line.dport },
  { id: "raw_log", label: "Raw log", kind: "text", get: (line) => line.raw },
];

const LOG_OPS = ["contains", "is", "is not"] as const;
const PAGE_SIZE = 7;
const RANGE_MS: Record<string, number | null> = { "All time": null, "Last 24 hours": 86_400_000, "Last 7 days": 7 * 86_400_000 };
const RANGE_NOW = LOGS[0]?.epoch ?? Date.now();

export function eventLine(line: LogLine): string {
  return `[${line.time}] source_address=${line.src} source_port=${line.sport} destination_address=${line.dst} destination_port=${line.dport} raw_log={${line.raw}}`;
}

export function Logs() {
  const [mode, setMode] = useState<"basic" | "pro">("basic");
  const [range, setRange] = useState("All time");
  const [pro, setPro] = useState("");
  const [appliedPro, setAppliedPro] = useState("");
  const [column, setColumn] = useState(LOG_FIELDS[1].id);
  const [op, setOp] = useState<(typeof LOG_OPS)[number]>("contains");
  const [value, setValue] = useState("");
  const [applied, setApplied] = useState<{ column: string; op: (typeof LOG_OPS)[number]; value: string } | null>(null);
  const [builder, setBuilder] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(true);
  const [page, setPage] = useState(0);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (builder && mode === "basic") valueRef.current?.focus(); }, [builder, column, mode]);

  const rows = useMemo(() => {
    const span = RANGE_MS[range];
    return LOGS.filter((line) => {
      if (span != null && RANGE_NOW - line.epoch > span) return false;
      if (mode === "pro") return proMatch(line, appliedPro);
      if (!applied) return true;
      return fieldMatch(line, applied.column, applied.op, applied.value);
    });
  }, [mode, range, applied, appliedPro]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const newest = rows[0]?.time ?? LOGS[0].time;

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
          <button type="button" className={mode === "basic" ? "is-on" : ""} onClick={() => setMode("basic")}>Basic</button>
          <button type="button" className={mode === "pro" ? "is-on" : ""} onClick={() => setMode("pro")}>Pro</button>
        </div>
      </header>
      <form className="lm__bar" onSubmit={mode === "basic" ? runBasic : (event) => { event.preventDefault(); setAppliedPro(pro.trim()); setPage(0); }}>
        {mode === "basic" && applied ? (
          <p className="lm__sentence">{fieldLabel(applied.column)} {applied.op} “{applied.value}”</p>
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
        <select aria-label="Time range" value={range} onChange={(event) => { setRange(event.target.value); setPage(0); }}>
          {Object.keys(RANGE_MS).map((item) => <option key={item}>{item}</option>)}
        </select>
        <button type="submit" className="lm__go" aria-label="Search"><Search className="icon" /></button>
      </form>
      <div className="lm__meta">
        <p><span className="lm__tick" aria-hidden="true">✓</span> {rows.length} events (before {newest})</p>
        <Pager page={safePage} pages={pages} onPage={setPage} />
      </div>
      <div className={`lm__body ${fieldsOpen ? "" : "is-fields-hidden"}`}>
        {fieldsOpen && (
          <aside className="lm__fields" aria-label="Interesting fields">
            <button type="button" className="lm__hide" onClick={() => setFieldsOpen(false)}>‹ Hide Fields</button>
            <h2>Interesting fields</h2>
            <ul>
              {LOG_FIELDS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={column === item.id && builder ? "is-on" : ""}
                    onClick={() => { setMode("basic"); setColumn(item.id); setBuilder(true); }}
                  >
                    <i aria-hidden="true">{item.kind === "number" ? "#" : "a"}</i>
                    {item.id}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
        <div className="lm__events">
          {!fieldsOpen && <button type="button" className="lm__hide" onClick={() => setFieldsOpen(true)}>› Show Fields</button>}
          <div className="lm__eventhead"><span className="lm__dot" aria-hidden="true" /> Event</div>
          {mode === "basic" && builder && (
            <div className="lm__builder">
              <button type="button" aria-label="Clear filter" onClick={() => { setApplied(null); setValue(""); setBuilder(false); setPage(0); }}><X className="icon" /></button>
              <label className="lm__field">
                <span>Column</span>
                <select aria-label="Column" value={column} onChange={(event) => setColumn(event.target.value)}>
                  {LOG_FIELDS.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
                </select>
              </label>
              <label className="lm__field lm__field--op">
                <span>Operator</span>
                <select aria-label="Operator" value={op} onChange={(event) => setOp(event.target.value as (typeof LOG_OPS)[number])}>
                  {LOG_OPS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="lm__field">
                <span>Value</span>
                <input ref={valueRef} aria-label="Value" value={value} onChange={(event) => setValue(event.target.value)} />
              </label>
            </div>
          )}
          <ul className="lm__list">
            {slice.map((line) => {
              const key = `${line.epoch}-${line.sport}-${line.raw.slice(0, 12)}`;
              const open = openKey === key;
              return (
                <li key={key} className={open ? "is-open" : ""}>
                  <button type="button" aria-expanded={open} onClick={() => setOpenKey(open ? null : key)}>
                    <ChevronDown className="icon" />
                    <span className="mono">{eventLine(line)}</span>
                  </button>
                  {open && <pre className="mono">{line.raw}</pre>}
                </li>
              );
            })}
            {slice.length === 0 && <li className="lm__none">No events for this search.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}

function fieldLabel(id: string): string {
  return LOG_FIELDS.find((item) => item.id === id)?.label ?? id;
}

function fieldMatch(line: LogLine, column: string, op: (typeof LOG_OPS)[number], value: string): boolean {
  const field = LOG_FIELDS.find((item) => item.id === column);
  const got = (field ? field.get(line) : eventLine(line)).toLowerCase();
  const want = value.toLowerCase();
  if (op === "is") return got === want;
  if (op === "is not") return got !== want;
  return got.includes(want);
}

function proMatch(line: LogLine, query: string): boolean {
  if (!query) return true;
  const text = eventLine(line).toLowerCase();
  return query.split(/\s+/).every((part) => {
    const [key, ...rest] = part.split("=");
    if (!rest.length) return text.includes(part.toLowerCase());
    return fieldMatch(line, key, "contains", rest.join("="));
  });
}

function Pager(props: { page: number; pages: number; onPage: (page: number) => void }) {
  const nums = pagerNums(props.page, props.pages);
  return (
    <nav className="lm__pager" aria-label="Event pages">
      <button type="button" aria-label="Previous page" disabled={props.page === 0} onClick={() => props.onPage(props.page - 1)}>‹</button>
      {nums.map((num, index) => num === "…" ? <span key={`gap-${index}`}>…</span> : (
        <button key={num} type="button" aria-current={num === props.page + 1 ? "page" : undefined} onClick={() => props.onPage(Number(num) - 1)}>{num}</button>
      ))}
      <button type="button" aria-label="Next page" disabled={props.page >= props.pages - 1} onClick={() => props.onPage(props.page + 1)}>›</button>
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

const EP_TABS = [
  { id: "processes", label: "Processes" },
  { id: "files", label: "Files" },
  { id: "network", label: "Network" },
  { id: "browser", label: "Browser history" },
] as const;

type EpTab = (typeof EP_TABS)[number]["id"];

export function Endpoint() {
  const state = useSoc();
  const [query, setQuery] = useState("");
  const [hostId, setHostId] = useState(HOSTS[0].id);
  const [tab, setTab] = useState<EpTab>("processes");
  const [dir, setDir] = useState<1 | -1>(1);
  const [ask, setAsk] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const host = HOSTS.find((item) => item.id === hostId) ?? HOSTS[0];
  const matches = HOSTS.filter((item) => `${item.name} ${item.user} ${item.ip}`.toLowerCase().includes(query.trim().toLowerCase()));
  const contained = state.contained.includes(host.id);
  const index = EP_TABS.findIndex((item) => item.id === tab);
  const counts: Record<EpTab, number> = {
    processes: host.processes.length,
    files: host.files.length,
    network: host.net.length,
    browser: host.browser.length + host.commands.length,
  };

  const pick = (next: EpTab) => {
    const to = EP_TABS.findIndex((item) => item.id === next);
    if (to === index) return;
    setDir(to > index ? 1 : -1);
    setTab(next);
  };

  return (
    <section className="ep" aria-label="Endpoint security">
      <header className="ep__head">
        <div>
          <h1>Endpoint security</h1>
          <p>Hosts on the Northstar network.</p>
        </div>
        <input aria-label="Search hosts" placeholder="Search host, user, or address" value={query} onChange={(event) => setQuery(event.target.value)} />
      </header>
      <div className="ep__body">
        <ul className="ep__hosts">
          {matches.map((item) => {
            const held = state.contained.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === host.id ? "is-on" : ""}
                  onClick={() => { setHostId(item.id); setTab("processes"); setDir(1); }}
                >
                  <b>{item.name}</b>
                  <span className="mono">{item.ip}</span>
                  <em className={held ? "is-held" : ""}>{held ? "Contained" : item.user}</em>
                </button>
              </li>
            );
          })}
          {matches.length === 0 && <li className="ep__none">No hosts match.</li>}
        </ul>
        <article key={host.id} className="ep__detail">
          <header className="ep__top">
            <div>
              <h2>{host.name}</h2>
              <p>{host.user}</p>
            </div>
            <div className="ep__actions">
              <button type="button" className="btn btn--primary" onClick={() => setAsk(host.id)}>{contained ? "Release containment" : "Contain"}</button>
              <button type="button" className={`btn ${preparing ? "is-busy" : ""}`} disabled={preparing} onClick={() => prepare(host.id, setPreparing)}>{preparing ? "Preparing lab…" : "Go to lab"}</button>
            </div>
          </header>
          <dl className="ep__facts">
            <div><dt>Host</dt><dd>{host.name}</dd></div>
            <div><dt>User</dt><dd>{host.user}</dd></div>
            <div><dt>Address</dt><dd className="mono">{host.ip}</dd></div>
            <div><dt>OS</dt><dd>{host.os}</dd></div>
            <div><dt>Containment</dt><dd className={contained ? "is-held" : ""}>{contained ? "Contained" : "Not contained"}</dd></div>
          </dl>
          <div className="ep__tabs" role="tablist" aria-label="Host telemetry">
            <span className="ep__thumb" data-i={index} aria-hidden="true" />
            {EP_TABS.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "is-on" : ""} onClick={() => pick(item.id)}>
                {item.label}
                <span className="mono">{counts[item.id]}</span>
              </button>
            ))}
          </div>
          <div className="ep__stage">
            <div key={tab} className={`ep__sheet ${dir > 0 ? "is-next" : "is-prev"}`} role="tabpanel">
              <HostTab host={host} tab={tab} />
            </div>
          </div>
          {state.connected === host.id && <Shell hostId={host.id} />}
        </article>
      </div>
      {ask && (
        <Modal title={contained ? `Release ${host.name}` : `Contain ${host.name}`} pop onClose={() => setAsk(null)}>
          <p>{contained ? "Return this host to the network." : "Isolate this host from the network."}</p>
          <div className="soc__modal-actions">
            <button type="button" className="btn btn--primary" onClick={() => { soc.contain(ask); setAsk(null); }}>Continue</button>
            <button type="button" className="btn btn--danger" onClick={() => setAsk(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function HostTab(props: { host: Host; tab: string }) {
  if (props.tab === "processes") {
    return <table className="soc-table ep__table"><thead><tr><th>Process</th><th>Result</th></tr></thead><tbody>{props.host.processes.map((item) => <tr key={item.name}><td className="mono">{item.name}</td><td><Verdict value={item.verdict} /></td></tr>)}</tbody></table>;
  }
  if (props.tab === "files") {
    return <table className="soc-table ep__table"><thead><tr><th>File</th><th>MD5</th><th>Result</th></tr></thead><tbody>{props.host.files.map((item) => <tr key={item.path}><td className="mono">{item.path}</td><td className="mono">{item.hash}</td><td><Verdict value={item.verdict} /></td></tr>)}{props.host.files.length === 0 && <tr><td colSpan={3}>No files</td></tr>}</tbody></table>;
  }
  if (props.tab === "network") {
    return <table className="soc-table ep__table"><thead><tr><th>Remote</th><th>Result</th></tr></thead><tbody>{props.host.net.map((item) => <tr key={item.remote}><td className="mono">{item.remote}</td><td><Verdict value={item.verdict} /></td></tr>)}</tbody></table>;
  }
  return (
    <>
      <table className="soc-table ep__table"><thead><tr><th>When</th><th>URL</th></tr></thead><tbody>{props.host.browser.map((item) => <tr key={item.url}><td>{item.when}</td><td className="mono">{item.url}</td></tr>)}{props.host.browser.length === 0 && <tr><td colSpan={2}>No browser history</td></tr>}</tbody></table>
      <table className="soc-table ep__table"><thead><tr><th>When</th><th>Command</th></tr></thead><tbody>{props.host.commands.map((item) => <tr key={item.command}><td>{item.when}</td><td className="mono">{item.command}</td></tr>)}{props.host.commands.length === 0 && <tr><td colSpan={2}>No commands</td></tr>}</tbody></table>
    </>
  );
}

function Verdict(props: { value: string }) {
  const calm = /clean|allowed|quarantined/i.test(props.value) && !/not quarantined/i.test(props.value);
  return <span className={`ep__verdict ${calm ? "is-calm" : "is-hot"}`}>{props.value}</span>;
}

function prepare(hostId: string, setPreparing: (value: boolean) => void) {
  setPreparing(true);
  window.setTimeout(() => {
    soc.connect(hostId);
    setPreparing(false);
  }, 800);
}

export function Shell(props: { hostId: string }) {
  const shell = useSoc().shell;
  const [command, setCommand] = useState("");
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const key = command.trim().toLowerCase();
    const output = SHELL[props.hostId]?.[key] ?? "not available in this practice image. Try whoami, hostname, ipconfig, tasklist.";
    soc.command(command, output);
    setCommand("");
  };
  return (
    <div className="soc__term">
      <pre>{shell.join("\n")}</pre>
      <form onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="shell-command">Command</label>
        <input id="shell-command" className="mono" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="whoami" autoComplete="off" />
      </form>
    </div>
  );
}

export function Email() {
  const deleted = useSoc().deletedMail;
  const [query, setQuery] = useState("");
  const [detailed, setDetailed] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [attach, setAttach] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const rows = MAIL.filter((mail) => {
    if (detailed) {
      if (from && !mail.from.toLowerCase().includes(from.toLowerCase())) return false;
      if (to && !mail.to.toLowerCase().includes(to.toLowerCase())) return false;
      if (subject && !mail.subject.toLowerCase().includes(subject.toLowerCase())) return false;
      if (attach && !mail.attachment) return false;
      return true;
    }
    const blob = `${mail.from} ${mail.to} ${mail.subject} ${mail.smtp}`.toLowerCase();
    return blob.includes(query.trim().toLowerCase());
  });
  const mail = MAIL.find((item) => item.id === open);
  return (
    <section className="soc__panel" aria-label="Email security">
      <header className="soc__panel-head">
        <h1>Email security</h1>
        <input aria-label="Search mail" placeholder="Sender, recipient, subject" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="button" className="btn btn--sm" aria-pressed={detailed} onClick={() => setDetailed(!detailed)}>Detailed search</button>
      </header>
      {detailed && (
        <form className="soc__builder" onSubmit={(event) => event.preventDefault()}>
          <input aria-label="From" placeholder="From" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input aria-label="To" placeholder="To" value={to} onChange={(event) => setTo(event.target.value)} />
          <input aria-label="Subject" placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <label><input type="checkbox" checked={attach} onChange={(event) => setAttach(event.target.checked)} /> Has attachment</label>
        </form>
      )}
      {!mail && (
        <table className="soc-table">
          <thead><tr><th>From</th><th>To</th><th>Subject</th><th>Date</th><th>Final action</th></tr></thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="is-click" onClick={() => setOpen(item.id)}>
                <td className="mono">{item.from}</td>
                <td className="mono">{item.to}</td>
                <td>{item.subject}</td>
                <td>{item.when}</td>
                <td>{deleted.includes(item.id) ? "Deleted" : item.finalAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {mail && (
        <article className="soc__mail">
          <button type="button" className="btn btn--sm" onClick={() => setOpen(null)}>Back to list</button>
          <h2>{mail.subject}</h2>
          <p>From <span className="mono">{mail.from}</span> to <span className="mono">{mail.to}</span></p>
          <p>SMTP <span className="mono">{mail.smtp}</span> · Final action {mail.finalAction}</p>
          <p>{mail.body}</p>
          {mail.attachment && (
            <p>
              Attachment{" "}
              <a className="mono" href={extHref("detonate", mail.attachmentHash)} target="_blank" rel="noreferrer">{mail.attachment}</a>
              {mail.password ? ` · Password: ${mail.password}` : ""}
            </p>
          )}
          {mail.link && <p>Link <a className="mono" href={extHref("multiscan", mail.link)} target="_blank" rel="noreferrer">{mail.link}</a></p>}
          <button type="button" className="btn btn--danger btn--sm" disabled={deleted.includes(mail.id)} onClick={() => soc.deleteMail(mail.id)}>
            {deleted.includes(mail.id) ? "Deleted" : "Delete from mailbox"}
          </button>
        </article>
      )}
    </section>
  );
}

export function Intel() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const rows = needle ? INTEL.filter((row) => `${row.value} ${row.tag} ${row.detail}`.toLowerCase().includes(needle)) : INTEL;
  const tags = ["phishing", "malware", "scan", "internal"];
  return (
    <section className="soc__panel" aria-label="Threat intel">
      <header className="soc__panel-head"><h1>Threat intel</h1></header>
      <div className="soc__tiles">
        {tags.map((tag) => (
          <button key={tag} type="button" onClick={() => setQuery(tag)}>
            <b className="mono">{INTEL.filter((row) => row.tag === tag).length}</b>
            <span>{tag}</span>
          </button>
        ))}
      </div>
      <input aria-label="Look up an indicator" placeholder="Domain, address, or hash" value={query} onChange={(event) => setQuery(event.target.value)} />
      <table className="soc-table">
        <thead><tr><th>Indicator</th><th>Type</th><th>Tag</th><th>Source</th><th>Detail</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.value}><td className="mono">{row.value}</td><td>{row.type}</td><td>{row.tag}</td><td>{row.source}</td><td>{row.detail}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export { WindowsSandbox as Sandbox } from "./WindowsSandbox";

export function Learn() {
  return (
    <section className="soc__panel soc__learn" aria-label="Learn">
      <h1>How a shift works</h1>
      <p>Take an alert from the main channel. That puts it on you. Create a case, then run the playbook with the other tools open beside it.</p>
      <p>The playbook does not tell you if an answer is right. Close the alert with a true or false positive and a note. The closed channel shows the score and, after that, the official write-up.</p>
      <p>Northstar, the addresses, and the scanners on this console are fictional. Nothing here calls the public internet.</p>
      <p className="sev sev--low"><Sev value="Low" /> severity is always a word plus a mark.</p>
    </section>
  );
}
