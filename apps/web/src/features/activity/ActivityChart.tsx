import { useMemo, useState } from "react";
import { LogRowView, hms } from "../../lib/format";
import { bucketActivity } from "../../lib/activity";
import { Seg } from "../../design/ui";

export interface ChartMarker {
  ms: number;
  label: string;
  tone: "declare" | "contain";
}

const W = 420;
const H = 190;
const L = 28;
const R = 6;
const T = 8;
const B = 22;
const BUCKET_SEC = 15;
const COUNT = 24;
const CATS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)"];

type Mode = "outcome" | "session";

export function ActivityChart(props: { rows: LogRowView[]; nowMs: number; markers: ChartMarker[] }) {
  const [mode, setMode] = useState<Mode>("outcome");
  const buckets = useMemo(() => bucketActivity(props.rows, props.nowMs, BUCKET_SEC, COUNT), [props.rows, props.nowMs]);
  const sessions = useMemo(() => {
    const totals = new Map<string, number>();
    for (const b of buckets) for (const [s, n] of Object.entries(b.bySession)) totals.set(s, (totals.get(s) ?? 0) + n);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [buckets]);

  const totals = buckets.map((b) => b.ok + b.denied);
  const max = Math.max(4, ...totals) + 1;
  const bw = (W - L - R) / COUNT;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const empty = totals.every((t) => t === 0);
  const first = buckets[0].start;
  const span = COUNT * BUCKET_SEC * 1000;

  const label = (ms: number) => hms(ms, false).slice(0, 5);

  return (
    <>
      <div className="card__head">
        <div>
          <div className="card__title">Activity</div>
          <div className="card__sub">Requests per {BUCKET_SEC} seconds</div>
        </div>
        <Seg
          label="Chart grouping"
          value={mode}
          onChange={setMode}
          options={[
            { value: "outcome", label: "By outcome" },
            { value: "session", label: "By session" },
          ]}
        />
      </div>
      <div className="viz__body">
        <div className="chart">
          {empty && <div className="chart__empty">Waiting for traffic...</div>}
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Requests over time, ${mode === "outcome" ? "allowed versus refused" : "by session"}. Latest bucket: ${totals[COUNT - 1]} requests.`}>
            <defs>
              <pattern id="hatch-denied" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="#fff" />
                <line x1="0" y1="0" x2="0" y2="5" stroke="#dc2626" strokeWidth="2" />
              </pattern>
            </defs>
            {[0, 0.5, 1].map((f) => {
              const yy = T + (H - T - B) * f;
              return (
                <g key={f}>
                  <line className="chart__grid" x1={L} x2={W - R} y1={yy} y2={yy} />
                  <text className="chart__axis" x={L - 6} y={yy + 3} textAnchor="end">
                    {Math.round(max * (1 - f))}
                  </text>
                </g>
              );
            })}
            {buckets.map((b, i) => {
              const x = L + i * bw + 1.5;
              const w = bw - 3;
              if (mode === "outcome") {
                return (
                  <g key={b.start}>
                    {b.ok > 0 && <rect x={x} y={y(b.ok)} width={w} height={H - B - y(b.ok)} rx={2} fill="var(--teal-bright)" />}
                    {b.denied > 0 && (
                      <rect x={x} y={y(b.ok + b.denied)} width={w} height={y(b.ok) - y(b.ok + b.denied)} rx={2} fill="url(#hatch-denied)" stroke="var(--coral)" strokeWidth={1} />
                    )}
                  </g>
                );
              }
              let acc = 0;
              return (
                <g key={b.start}>
                  {sessions.map((s, si) => {
                    const n = b.bySession[s] ?? 0;
                    if (!n) return null;
                    const top = y(acc + n);
                    const h = y(acc) - top;
                    acc += n;
                    return <rect key={s} x={x} y={top} width={w} height={h} rx={1.5} fill={CATS[Math.min(si, CATS.length - 1)]} />;
                  })}
                </g>
              );
            })}
            {props.markers
              .filter((m) => m.ms >= first && m.ms <= first + span)
              .map((m) => {
                const x = L + ((m.ms - first) / span) * (W - L - R);
                const contain = m.tone === "contain";
                return (
                  <g key={`${m.label}-${m.ms}`}>
                    <line className={`chart__marker ${contain ? "chart__marker--contain" : ""}`} x1={x} x2={x} y1={T} y2={H - B} />
                    <text className={`chart__marker-label ${contain ? "chart__marker-label--contain" : ""}`} x={x - 4} y={T + 10} textAnchor="end">
                      {m.label}
                    </text>
                  </g>
                );
              })}
            {[0, 8, 16, 23].map((i) => (
              <text key={i} className="chart__axis" x={L + i * bw} y={H - 6}>
                {label(buckets[i].start)}
              </text>
            ))}
          </svg>
          {mode === "session" && (
            <div className="legend" style={{ padding: "4px 0 0" }}>
              {sessions.slice(0, 4).map((s, i) => (
                <span className="legend__item" key={s}>
                  <span className="swatch" style={{ background: CATS[i] }} />
                  <span className="mono">{s}</span>
                </span>
              ))}
            </div>
          )}
          {mode === "outcome" && (
            <div className="legend" style={{ padding: "4px 0 0" }}>
              <span className="legend__item">
                <span className="swatch swatch--ok" />
                allowed
              </span>
              <span className="legend__item">
                <span className="swatch swatch--denied" />
                refused (4xx)
              </span>
              {props.markers.length > 0 && (
                <span className="legend__item">
                  <span className="swatch swatch--suspect" />
                  your actions
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
