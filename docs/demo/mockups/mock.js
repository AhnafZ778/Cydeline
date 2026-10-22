/* U0 hi-fi mockup helpers. The DOM/class names here are the spec for apps/web components. */
const P = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};
const icon = (n, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

const STEPS = ["Observe", "Investigate", "Declare", "Contain", "Verify"];
function topbar(current /* 0..4 */, doneAll = false) {
  const steps = STEPS.map((s, i) => {
    const cls = doneAll || i < current ? "is-done" : i === current ? "is-current" : "";
    const num = doneAll || i < current ? icon("check") : i + 1;
    return `<li class="step ${cls}"><span class="step__num">${num}</span><span class="step__label">${s}</span></li>`;
  }).join("");
  return `
  <header class="topbar">
    <div class="brand"><span class="brand__mark">${icon("shield")}</span>Sentinel Loop</div>
    <div class="mission-name"><strong>The Stolen Session</strong><span>Northstar Analytics · Practice</span></div>
    <ol class="stepper" aria-label="Mission progress">${steps}</ol>
    <div class="topbar__right">
      <span class="clock" title="Scenario clock">${icon("clock")}<span class="clock__label">07:04:33</span></span>
      <span class="opponent-chip"><span class="dot"></span><span class="opponent-chip__text">AI adversary · active</span></span>
      <button class="btn btn--ghost btn--icon" aria-label="More">${icon("more")}</button>
    </div>
  </header>`;
}

const D = {
  rows: [
    ["07:04:02.114", "INFO", "target-access", "GET", "/api/v1/docs", 200, "sess_E1", "eli", "198.51.100.41", "22ms", "req_0112"],
    ["07:04:05.871", "INFO", "target-access", "GET", "/api/v1/docs/ops_roster.xlsx", 200, "sess_P1", "priya", "198.51.100.77", "31ms", "req_0113"],
    ["07:04:09.340", "WARN", "target-access", "GET", "/api/v1/docs/old_budget.xlsx", 404, "sess_E1", "eli", "198.51.100.41", "9ms", "req_0114"],
    ["07:04:12.118", "INFO", "target-access", "GET", "/api/v1/session", 200, "sess_A", "maya", "203.0.113.57", "38ms", "req_0115", "pin"],
    ["07:04:14.902", "INFO", "target-access", "GET", "/api/v1/docs/q3_forecast.csv", 304, "sess_A", "maya", "198.51.100.23", "14ms", "req_0116"],
    ["07:04:18.377", "INFO", "target-access", "GET", "/api/v1/docs/brand_kit.zip", 200, "sess_P1", "priya", "198.51.100.77", "57ms", "req_0117"],
    ["07:04:21.640", "INFO", "target-access", "GET", "/api/v1/vault/docs", 200, "sess_A", "maya", "203.0.113.57", "44ms", "req_0118", "pin"],
    ["07:04:24.086", "INFO", "target-access", "GET", "/api/v1/docs", 200, "sess_E1", "eli", "198.51.100.41", "19ms", "req_0119"],
    ["07:04:27.513", "INFO", "target-access", "GET", "/api/v1/docs/ops_roster.xlsx", 304, "sess_P1", "priya", "198.51.100.77", "11ms", "req_0120"],
    ["07:04:33.205", "INFO", "target-access", "HEAD", "/api/v1/vault/docs/doc_finance_07", 200, "sess_A", "maya", "203.0.113.57", "12ms", "req_0121", "sel"],
  ],
};

function statusCls(s) {
  return s >= 500 ? "status--5xx" : s === 403 ? "status--denied" : s >= 400 ? "status--4xx" : "";
}
function logRow(r, extra = "") {
  const [t, lvl, src, m, p, st, ses, usr, ip, lat, rid, flag] = r;
  const cls = [flag === "sel" ? "is-selected" : "", flag === "pin" ? "is-pinned" : "", extra].join(" ");
  return `<div class="logrow ${cls}" role="row" data-level="${lvl}">
    <span class="gutter"></span><span class="t">${t}</span><span class="lvl lvl--${lvl}">${lvl}</span>
    <span class="src">${src}</span><span class="method">${m}</span><span class="path">${p}</span>
    <span class="status ${statusCls(st)}">${st}</span><span class="sess">${ses}</span><span>${usr}</span>
    <span class="ip">${ip}</span><span>${lat}</span><span>${rid}</span>
    <button class="pin" aria-label="Pin as evidence">${icon("pin")}</button></div>`;
}
const LOGHEAD = `<div class="loghead" role="row"><span></span><span>Time</span><span>Level</span><span>Source</span><span>Verb</span><span>Path</span><span>Status</span><span>Session</span><span>User</span><span>Source IP</span><span>Lat.</span><span>Request</span><span></span></div>`;

function kpi(label, value, ticks, delta, deltaCls, tickCls = "") {
  const max = Math.max(...ticks, 1);
  const t = ticks.map((v) => `<i style="height:${Math.max(3, (v / max) * 28)}px"></i>`).join("");
  return `<div class="card kpi"><div class="kpi__label"><span>${label}</span><span class="delta ${deltaCls}">${delta}</span></div>
    <div class="kpi__row"><span class="kpi__value">${value}</span><span class="kpi__ticks ${tickCls}">${t}</span></div></div>`;
}

function chartSvg({ ok, denied, markers = [] }) {
  const W = 420, H = 190, L = 28, B = 22, T = 8;
  const n = ok.length, bw = (W - L - 6) / n, max = Math.max(...ok.map((v, i) => v + denied[i])) + 1;
  const y = (v) => T + (H - T - B) * (1 - v / max);
  let g = "";
  [0, 0.5, 1].forEach((f) => {
    const yy = T + (H - T - B) * f;
    g += `<line class="chart__grid" x1="${L}" x2="${W - 6}" y1="${yy}" y2="${yy}"/>`;
    g += `<text class="chart__axis" x="${L - 6}" y="${yy + 3}" text-anchor="end">${Math.round(max * (1 - f))}</text>`;
  });
  let bars = "";
  ok.forEach((v, i) => {
    const x = L + i * bw + 1.5, w = bw - 3;
    bars += `<rect x="${x}" y="${y(v)}" width="${w}" height="${H - B - y(v)}" rx="2" fill="#14b8a6"/>`;
    if (denied[i]) bars += `<rect x="${x}" y="${y(v + denied[i])}" width="${w}" height="${y(v) - y(v + denied[i])}" rx="2" fill="url(#hatch)" stroke="#dc2626" stroke-width="1"/>`;
  });
  let m = "";
  markers.forEach(([idx, label, cls]) => {
    const x = L + idx * bw;
    m += `<line class="chart__marker ${cls}" x1="${x}" x2="${x}" y1="${T}" y2="${H - B}"/><text class="chart__marker-label ${cls ? "chart__marker-label--contain" : ""}" x="${x + 4}" y="${T + 10}">${label}</text>`;
  });
  const ticks = ["07:00", "07:02", "07:04", "07:06"].map((t, i) => `<text class="chart__axis" x="${L + (i * (W - L - 6)) / 3.2}" y="${H - 6}">${t}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Requests over time"><defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff"/><line x1="0" y1="0" x2="0" y2="5" stroke="#dc2626" stroke-width="2"/></pattern></defs>${g}${bars}${m}${ticks}</svg>`;
}

/* System map: columns SOURCE | SESSION | northstar-api routes */
function mapSvg({ suspect = true, denied = false, affected = [], revoked = false, packet = true } = {}) {
  const node = (cls, x, y, w, h, label, sub, extra = "") => `
    <g class="node ${cls} ${extra}" tabindex="0" role="button" aria-label="${label}">
      <rect class="node__halo" x="${x - 4}" y="${y - h / 2 - 4}" width="${w + 8}" height="${h + 8}" rx="14"/>
      <rect class="node__box" x="${x}" y="${y - h / 2}" width="${w}" height="${h}" rx="10"/>
      <text class="node__label" x="${x + 12}" y="${y - (sub ? 1 : -4)}">${label}</text>
      ${sub ? `<text class="node__sub" x="${x + 12}" y="${y + 12}">${sub}</text>` : ""}
    </g>`;
  const edge = (x1, y1, x2, y2, w, cls = "") => {
    const xm = (x1 + x2) / 2;
    return `<path class="edge ${cls}" stroke-width="${w}" d="M${x1} ${y1} C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}"/>`;
  };
  const aff = (id) => (affected.includes(id) ? "is-affected" : "");
  const sa = `${suspect ? "is-suspect" : ""} ${revoked ? "is-revoked" : ""} ${aff("sess_A")}`;
  return `<svg viewBox="0 0 640 262" role="img" aria-label="System map: source IPs, sessions and API routes">
  <text class="map__col" x="12" y="18">Source IP</text><text class="map__col" x="218" y="18">Session</text><text class="map__col" x="456" y="18">northstar-api</text>
  ${edge(144, 62, 218, 62, 1.5, "edge--idle")}${edge(144, 112, 218, 112, 1.5, "edge--idle")}
  ${edge(144, 162, 218, 187, 2)}${edge(144, 212, 218, 187, 3)}
  ${edge(322, 62, 456, 62, 1.5)}${edge(322, 62, 456, 124, 2)}${edge(322, 112, 456, 124, 2.5)}
  ${edge(322, 187, 456, 62, 1.5)}${edge(322, 187, 456, 124, 2)}${edge(322, 187, 456, 205, denied ? 3 : 4, denied ? "edge--denied" : "")}
  ${packet ? `<circle class="packet" r="4"><animateMotion dur="1.6s" repeatCount="indefinite" path="M144 212 C181 212 181 187 218 187 L322 187 C389 187 389 205 456 205"/></circle>` : ""}
  ${node("node--ip", 12, 62, 132, 34, "198.51.100.41", "first seen 06:12")}
  ${node("node--ip", 12, 112, 132, 34, "198.51.100.77", "first seen 06:30")}
  ${node("node--ip", 12, 162, 132, 34, "198.51.100.23", "first seen 06:02")}
  ${node("node--ip", 12, 212, 132, 34, "203.0.113.57", "first seen 07:04")}
  ${node("node--session", 218, 62, 104, 34, "sess_E1", "eli")}
  ${node("node--session", 218, 112, 104, 34, "sess_P1", "priya")}
  ${node("node--session", 218, 187, 104, 38, "sess_A", suspect ? "maya · suspect" : "maya", sa)}
  ${node("node--service", 456, 62, 128, 40, "/session", "auth")}
  ${node("node--resource", 456, 124, 128, 40, "/docs", "shared files")}
  ${node("node--vault", 456, 205, 128, 40, "/vault  🔒", "restricted", aff("vault"))}
</svg>`;
}
