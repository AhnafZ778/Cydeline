import { useMemo, useState } from "react";
import { Check, Copy, Filter, Pin, PinOff } from "lucide-react";
import { Drawer, Kbd } from "../../design/ui";
import { LogRowView, statusClass } from "../../lib/format";
import { Term } from "../../lib/query";

export function LegacyInspectorDrawer(props: {
  row: LogRowView;
  allRows: LogRowView[];
  pinned: boolean;
  onClose: () => void;
  onPin: () => void;
  onSelect: (id: string) => void;
  onAddTerm: (t: Term) => void;
}) {
  const { row } = props;
  const [copied, setCopied] = useState(false);
  const related = useMemo(() => props.allRows.filter((r) => r.session === row.session).slice(-8), [props.allRows, row.session]);
  const json = useMemo(() => JSON.stringify(row.event, null, 2), [row.event]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable: the text is still selectable */
    }
  };

  const fields: Array<[string, string, string?]> = [
    ["status", String(row.status ?? "-"), statusClass(row.status)],
    ["session", row.session],
    ["user", row.event.actor_id],
    ["source ip", row.ip ?? "-"],
    ["user agent", row.ua ?? "-"],
    ["latency", row.latency ?? "-"],
    ["bytes", row.bytes !== null ? String(row.bytes) : "-"],
    ["resource", row.event.resource_id ?? "-"],
    ["source", row.source],
    ["event id", row.id],
  ];

  return (
    <Drawer
      label="Event inspector"
      eyebrow="Inspector"
      titleMono
      title={`${row.method} ${row.path}`}
      subtitle={`${row.time} UTC · ${row.rid}`}
      onClose={props.onClose}
      foot={
        <>
          <span className="muted" style={{ fontSize: "var(--fs-12)" }}>
            Press <Kbd>p</Kbd> to {props.pinned ? "unpin" : "pin"}
          </span>
          <button className={`btn ${props.pinned ? "" : "btn--primary"}`} onClick={props.onPin} aria-pressed={props.pinned}>
            {props.pinned ? <PinOff className="icon" /> : <Pin className="icon" />}
            {props.pinned ? "Unpin evidence" : "Pin as evidence"}
          </button>
        </>
      }
    >
      <section>
        <div className="eyebrow section-label">Fields</div>
        <dl className="fields">
          {fields.map(([k, v, cls]) => (
            <div style={{ display: "contents" }} key={k}>
              <dt>{k}</dt>
              <dd className={cls ? `status ${cls}` : undefined}>{v}</dd>
            </div>
          ))}
        </dl>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn--sm" onClick={() => props.onAddTerm({ key: "session", value: row.session, negate: false })}>
            <Filter className="icon" /> Filter to {row.session}
          </button>
          {row.ip && (
            <button className="btn btn--sm" onClick={() => props.onAddTerm({ key: "ip", value: row.ip!, negate: false })}>
              <Filter className="icon" /> Filter to {row.ip}
            </button>
          )}
        </div>
      </section>

      <section>
        <div className="eyebrow section-label">Same session &middot; {row.session}</div>
        <div className="related">
          {related.map((r) => (
            <button key={r.id} className={r.id === row.id ? "is-current" : ""} onClick={() => props.onSelect(r.id)} aria-current={r.id === row.id}>
              <span>{r.time.slice(0, 8)}</span>
              <span className={`status ${statusClass(r.status)}`}>{r.status ?? "-"}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.ip ? `${r.ip} · ` : ""}
                {r.path}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="eyebrow section-label">Raw event</div>
        <pre className="json" tabIndex={0} aria-label="Raw event JSON">
          <button className="btn btn--sm json__copy" onClick={copy} aria-label="Copy raw event JSON">
            {copied ? <Check className="icon" /> : <Copy className="icon" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {json}
        </pre>
      </section>
    </Drawer>
  );
}
