import { LogRowView, isTargetRequest } from "./format";

export interface Bucket {
  start: number; // epoch ms
  ok: number;
  denied: number;
  bySession: Record<string, number>;
}

/** Fixed-width time buckets ending at `nowMs`, counting target requests only. */
export function bucketActivity(rows: LogRowView[], nowMs: number, bucketSec = 15, count = 24): Bucket[] {
  const w = bucketSec * 1000;
  const end = Math.ceil((nowMs + 1) / w) * w;
  const first = end - count * w;
  const buckets: Bucket[] = Array.from({ length: count }, (_, i) => ({
    start: first + i * w,
    ok: 0,
    denied: 0,
    bySession: {},
  }));
  for (const r of rows) {
    if (!isTargetRequest(r) || r.ms < first || r.ms >= end) continue;
    const b = buckets[Math.floor((r.ms - first) / w)];
    if (r.status !== null && r.status >= 400) b.denied += 1;
    else b.ok += 1;
    b.bySession[r.session] = (b.bySession[r.session] ?? 0) + 1;
  }
  return buckets;
}

export interface Kpi {
  value: number;
  delta: number;
  ticks: number[];
}

export interface KpiSet {
  reqPerMin: Kpi;
  denied5m: Kpi;
  activeSessions: Kpi;
  vault: Kpi;
}

function inWindow(rows: LogRowView[], fromMs: number, toMs: number): LogRowView[] {
  return rows.filter((r) => isTargetRequest(r) && r.ms > fromMs && r.ms <= toMs);
}

export function computeKpis(rows: LogRowView[], nowMs: number): KpiSet {
  const bucketsOf = (pred: (r: LogRowView) => boolean): number[] => {
    const out: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const to = nowMs - i * 15000;
      out.push(inWindow(rows, to - 15000, to).filter(pred).length);
    }
    return out;
  };

  const cur1 = inWindow(rows, nowMs - 60000, nowMs);
  const prev1 = inWindow(rows, nowMs - 120000, nowMs - 60000);
  const cur5d = inWindow(rows, nowMs - 300000, nowMs).filter((r) => r.status !== null && r.status >= 400);
  const prev5d = inWindow(rows, nowMs - 600000, nowMs - 300000).filter((r) => r.status !== null && r.status >= 400);
  const curSess = new Set(inWindow(rows, nowMs - 120000, nowMs).map((r) => r.session));
  const prevSess = new Set(inWindow(rows, nowMs - 240000, nowMs - 120000).map((r) => r.session));
  const curVault = inWindow(rows, nowMs - 300000, nowMs).filter((r) => r.restricted);
  const prevVault = inWindow(rows, nowMs - 600000, nowMs - 300000).filter((r) => r.restricted);

  return {
    reqPerMin: { value: cur1.length, delta: cur1.length - prev1.length, ticks: bucketsOf(() => true) },
    denied5m: { value: cur5d.length, delta: cur5d.length - prev5d.length, ticks: bucketsOf((r) => r.status !== null && r.status >= 400) },
    activeSessions: { value: curSess.size, delta: curSess.size - prevSess.size, ticks: bucketsOf(() => true).map(() => curSess.size) },
    vault: { value: curVault.length, delta: curVault.length - prevVault.length, ticks: bucketsOf((r) => r.restricted) },
  };
}
