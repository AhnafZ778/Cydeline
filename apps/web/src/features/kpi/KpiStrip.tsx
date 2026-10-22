import { useMemo } from "react";
import { LogRowView } from "../../lib/format";
import { Kpi, computeKpis } from "../../lib/activity";

function Tile(props: { label: string; kpi: Kpi; unit?: string; tone?: "teal" | "coral" | "muted"; deltaLabel?: (d: number) => string; warnUp?: boolean }) {
  const max = Math.max(1, ...props.kpi.ticks);
  const d = props.kpi.delta;
  const label = props.deltaLabel ? props.deltaLabel(d) : d === 0 ? "steady" : `${d > 0 ? "+" : ""}${d}`;
  const cls = d > 0 ? (props.warnUp ? "delta--warn" : "delta--up") : "";
  return (
    <div className="card kpi">
      <div className="kpi__label">
        <span>{props.label}</span>
        <span className={`delta ${cls}`} aria-label={`change ${label}`}>
          {label}
        </span>
      </div>
      <div className="kpi__row">
        <span className="kpi__value">{props.kpi.value}</span>
        <span className={`kpi__ticks ${props.tone ? `kpi__ticks--${props.tone}` : ""}`} aria-hidden="true">
          {props.kpi.ticks.map((v, i) => (
            <i key={i} style={{ height: Math.max(3, (v / max) * 28) }} />
          ))}
        </span>
      </div>
    </div>
  );
}

export function KpiStrip({ rows, nowMs }: { rows: LogRowView[]; nowMs: number }) {
  const k = useMemo(() => computeKpis(rows, nowMs), [rows, nowMs]);
  return (
    <div className="kpis" role="group" aria-label="Key numbers">
      <Tile label="Requests / min" kpi={k.reqPerMin} />
      <Tile label="Refused (4xx), 5 min" kpi={k.denied5m} tone="coral" />
      <Tile label="Active sessions" kpi={k.activeSessions} tone="muted" />
      <Tile label="Vault requests, 5 min" kpi={k.vault} tone="teal" />
    </div>
  );
}
