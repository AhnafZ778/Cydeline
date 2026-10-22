import { LogRowView } from "./format";

/**
 * Tiny log-query language: `key:value` terms plus free text. Prefix `-` negates.
 * Keys: session, user, status, path, ip, level, source, method, req, id.
 */
export interface Term {
  key: string | null;
  value: string;
  negate: boolean;
}

const KEY_ALIASES: Record<string, string> = {
  sess: "session",
  session: "session",
  user: "user",
  status: "status",
  path: "path",
  ip: "ip",
  src_ip: "ip",
  level: "level",
  lvl: "level",
  source: "source",
  src: "source",
  method: "method",
  verb: "method",
  req: "req",
  rid: "req",
  id: "id",
};

export function parseTerm(raw: string): Term | null {
  let text = raw.trim();
  if (!text) return null;
  let negate = false;
  if (text.startsWith("-") && text.length > 1) {
    negate = true;
    text = text.slice(1);
  }
  const m = /^([a-z_]+):(.+)$/i.exec(text);
  if (m) {
    const key = KEY_ALIASES[m[1].toLowerCase()];
    if (key) return { key, value: m[2], negate };
  }
  return { key: null, value: text, negate };
}

export function termLabel(t: Term): string {
  return `${t.negate ? "-" : ""}${t.key ? `${t.key}:` : ""}${t.value}`;
}

export function sameTerm(a: Term, b: Term): boolean {
  return a.key === b.key && a.value === b.value && a.negate === b.negate;
}

function like(field: string, pattern: string): boolean {
  const f = field.toLowerCase();
  const p = pattern.toLowerCase();
  if (p.includes("*")) {
    const re = new RegExp(
      "^" + p.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$"
    );
    return re.test(f);
  }
  return f.includes(p);
}

function statusMatches(status: number | null, value: string): boolean {
  if (status === null) return false;
  const v = value.toLowerCase();
  if (v === "denied" || v === "error") return status >= 400;
  const range = /^([1-5])xx$/.exec(v);
  if (range) return Math.floor(status / 100) === Number(range[1]);
  const cmp = /^(>=|<=|>|<)(\d{3})$/.exec(v);
  if (cmp) {
    const n = Number(cmp[2]);
    switch (cmp[1]) {
      case ">=":
        return status >= n;
      case "<=":
        return status <= n;
      case ">":
        return status > n;
      default:
        return status < n;
    }
  }
  return String(status) === v;
}

function termMatches(row: LogRowView, t: Term): boolean {
  switch (t.key) {
    case "session":
      return like(row.session, t.value);
    case "user":
      return like(row.user, t.value);
    case "status":
      return statusMatches(row.status, t.value);
    case "path":
      return like(row.path, t.value);
    case "ip":
      return row.ip !== null && like(row.ip, t.value);
    case "level":
      return row.level.toLowerCase() === t.value.toLowerCase();
    case "source":
      return like(row.source, t.value);
    case "method":
      return row.method.toLowerCase() === t.value.toLowerCase();
    case "req":
      return like(row.rid, t.value);
    case "id":
      return like(row.id, t.value);
    default: {
      const hay = `${row.time} ${row.level} ${row.source} ${row.method} ${row.path} ${row.status ?? ""} ${row.session} ${row.user} ${row.ip ?? ""} ${row.rid}`;
      return like(hay, t.value.includes("*") ? t.value : `*${t.value}*`);
    }
  }
}

export function matchRow(row: LogRowView, terms: Term[]): boolean {
  return terms.every((t) => termMatches(row, t) !== t.negate);
}

export type Pivot = "all" | "denied" | "restricted" | "bysession";

export function applyPivot(rows: LogRowView[], pivot: Pivot): LogRowView[] {
  switch (pivot) {
    case "denied":
      return rows.filter((r) => r.status !== null && r.status >= 400);
    case "restricted":
      return rows.filter((r) => r.restricted);
    default:
      return rows;
  }
}

export interface SessionGroup {
  session: string;
  user: string;
  rows: LogRowView[];
  distinctIps: string[];
}

export function groupBySession(rows: LogRowView[]): SessionGroup[] {
  const map = new Map<string, SessionGroup>();
  for (const r of rows) {
    let g = map.get(r.session);
    if (!g) {
      g = { session: r.session, user: r.user, rows: [], distinctIps: [] };
      map.set(r.session, g);
    }
    g.rows.push(r);
    if (r.ip && !g.distinctIps.includes(r.ip)) g.distinctIps.push(r.ip);
  }
  return [...map.values()];
}
