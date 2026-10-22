export type Host = {
  id: string;
  name: string;
  user: string;
  ip: string;
  os: "Windows 11" | "Linux";
  processes: { name: string; verdict: string }[];
  files: { path: string; hash: string; verdict: string }[];
  net: { remote: string; verdict: string }[];
  browser: { when: string; url: string }[];
  commands: { when: string; command: string }[];
};

export const HOSTS: Host[] = [
  {
    id: "ws-priya",
    name: "WS-PRIYA",
    user: "Priya Shah",
    ip: "172.16.20.44",
    os: "Windows 11",
    processes: [
      { name: "outlook.exe", verdict: "clean" },
      { name: "msedge.exe", verdict: "opened voucher.zip" },
    ],
    files: [{ path: "C:\\Users\\Priya\\Downloads\\voucher.zip", hash: "c91e4a70b2d84f11aa09e6c35d77b018", verdict: "not quarantined" }],
    net: [{ remote: "198.51.100.77:443", verdict: "allowed" }],
    browser: [{ when: "03:44 PM", url: "http://northstar-perks.example/claim" }],
    commands: [{ when: "03:44 PM", command: "outlook.exe /f voucher.zip" }],
  },
  {
    id: "ws-jonah",
    name: "WS-JONAH",
    user: "Jonah Adeyemi",
    ip: "172.16.20.51",
    os: "Windows 11",
    processes: [
      { name: "chrome.exe", verdict: "clean" },
      { name: "Desk Helper", verdict: "not quarantined" },
    ],
    files: [{ path: "DeskHelper.crx", hash: "9cc61ab2e45d80f31477c0aa12de88b4", verdict: "not quarantined" }],
    net: [{ remote: "203.0.113.44:443", verdict: "allowed" }],
    browser: [{ when: "10:03 AM", url: "https://cdn.desk-helper.example/collect" }],
    commands: [{ when: "10:03 AM", command: "chrome.exe --load-extension DeskHelper" }],
  },
  {
    id: "ws-finance",
    name: "WS-FINANCE",
    user: "Lina Ortiz",
    ip: "172.16.20.80",
    os: "Windows 11",
    processes: [{ name: "ledger.exe", verdict: "memory does not match the file" }],
    files: [{ path: "C:\\Users\\Lina\\AppData\\Local\\Temp\\hh.exe", hash: "9cc61ab2e45d80f31477c0aa12de88b4", verdict: "not quarantined" }],
    net: [{ remote: "203.0.113.12:443", verdict: "blocked by proxy" }],
    browser: [],
    commands: [{ when: "11:20 AM", command: "ledger.exe --update" }],
  },
  {
    id: "vpn-03",
    name: "VPN-03",
    user: "gateway",
    ip: "198.51.100.10",
    os: "Linux",
    processes: [{ name: "openvpn", verdict: "clean" }],
    files: [],
    net: [{ remote: "203.0.113.90:1194", verdict: "denied" }],
    browser: [],
    commands: [{ when: "06:40 AM", command: "auth fail x12 action=blocked" }],
  },
  {
    id: "mail-01",
    name: "MAIL-01",
    user: "service",
    ip: "172.16.20.5",
    os: "Linux",
    processes: [{ name: "postfix", verdict: "clean" }],
    files: [],
    net: [{ remote: "172.16.20.30:25", verdict: "internal" }],
    browser: [],
    commands: [],
  },
  {
    id: "web-01",
    name: "WEB-01",
    user: "www",
    ip: "172.16.20.20",
    os: "Linux",
    processes: [{ name: "nginx", verdict: "clean" }],
    files: [],
    net: [{ remote: "203.0.113.50:443", verdict: "403" }],
    browser: [],
    commands: [],
  },
];

export type LogLine = {
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

function log(time: string, epoch: number, type: string, src: string, sport: string, dst: string, dport: string, action: string, raw: string): LogLine {
  return { time, epoch, type, src, sport, dst, dport, action, raw };
}

export const LOGS: LogLine[] = [
  log("Oct, 22, 2026, 03:39 PM", 1761147540000, "smtp", "198.51.100.77", "25", "172.16.20.5", "25", "allowed", "from=<rewards@northstar-perks.example> to=<priya.shah@northstar.example> subject=Cafeteria credit file=voucher.zip"),
  log("Oct, 22, 2026, 03:44 PM", 1761147840000, "dns", "172.16.20.44", "53410", "172.16.20.2", "53", "allowed", "A northstar-perks.example -> 198.51.100.77"),
  log("Oct, 22, 2026, 03:44 PM", 1761147851000, "https", "172.16.20.44", "51422", "198.51.100.77", "443", "allowed", "GET /claim 200"),
  log("Oct, 22, 2026, 10:04 AM", 1761127440000, "dns", "172.16.20.51", "61200", "172.16.20.2", "53", "allowed", "A cdn.desk-helper.example -> 203.0.113.44"),
  log("Oct, 22, 2026, 10:04 AM", 1761127452000, "https", "172.16.20.51", "61208", "203.0.113.45", "443", "allowed", "POST /collect 200"),
  log("Oct, 22, 2026, 06:40 AM", 1761115200000, "vpn", "203.0.113.90", "44100", "198.51.100.10", "1194", "blocked", "AUTH FAIL x12 action=blocked"),
  log("Oct, 22, 2026, 11:21 AM", 1761132060000, "https", "172.16.20.80", "49820", "203.0.113.12", "443", "blocked", "POST /beacon host=ledger-update.example"),
  log("Oct, 22, 2026, 07:12 PM", 1761160320000, "smtp", "172.16.20.5", "25", "172.16.20.30", "25", "allowed", "forward service@northstar.example -> shared-it@northstar.example"),
  log("Oct, 21, 2026, 09:18 PM", 1761074280000, "https", "172.16.20.44", "51002", "203.0.113.44", "443", "allowed", "POST https://cdn.desk-helper.example/collect 200"),
  log("Oct, 20, 2026, 03:28 PM", 1760966880000, "http", "203.0.113.90", "4188", "172.16.20.20", "80", "blocked", "GET https://intranet.northstar.example/files/share 401"),
  log("Oct, 18, 2026, 08:05 PM", 1760810700000, "http", "203.0.113.50", "55210", "172.16.20.20", "443", "blocked", "POST https://share.northstar.example/_layouts/elevate 403"),
  log("Oct, 16, 2026, 11:47 PM", 1760651220000, "http", "172.16.20.51", "44012", "172.16.20.20", "80", "allowed", "GET http://10-net.internal/scan 200 change=CHG-1904"),
  log("Oct, 15, 2026, 03:55 AM", 1760493300000, "https", "172.16.20.51", "50110", "198.51.100.20", "443", "allowed", "GET https://status.northstar.example/health 200"),
  log("Oct, 12, 2026, 09:56 PM", 1760298960000, "https", "198.51.100.20", "443", "172.16.20.20", "443", "allowed", "GET https://status.northstar.example/admin/health 200 monitor=uptime"),
  log("Oct, 09, 2026, 06:06 AM", 1759989960000, "https", "172.16.20.44", "49811", "203.0.113.12", "443", "blocked", "POST https://ledger-update.example/beacon denied"),
  log("Sep, 30, 2026, 01:16 AM", 1759194960000, "https", "172.16.20.51", "39001", "203.0.113.44", "443", "allowed", "GET /miner.js 200"),
  log("Sep, 22, 2026, 04:24 AM", 1758511440000, "https", "172.16.20.80", "41002", "203.0.113.12", "443", "allowed", "GET /hh.exe 200"),
  log("Aug, 29, 2026, 10:28 PM", 1756506480000, "http", "172.16.20.44", "47741", "198.51.100.77", "80", "allowed", "Request URL: http://northstar-perks.example/claim Request Method: GET"),
  log("Aug, 29, 2026, 10:32 PM", 1756506720000, "https", "172.16.20.44", "57441", "198.51.100.77", "443", "blocked", "Request URL: http://northstar-perks.example/claim"),
  log("Aug, 29, 2026, 11:00 PM", 1756508400000, "smtp", "198.51.100.77", "25", "172.16.20.5", "25", "allowed", "Sender Mail: rewards@northstar-perks.example Destination Mail: priya.shah@northstar.example"),
  log("Feb, 06, 2021, 12:42 PM", 1612615320000, "https", "172.16.20.51", "23812", "203.0.113.44", "443", "allowed", "URL: https://cdn.desk-helper.example/collect"),
  log("Feb, 06, 2021, 03:40 AM", 1612582800000, "https", "172.16.20.80", "56442", "203.0.113.12", "443", "blocked", "Firewall Action: Blocked"),
  log("Sep, 06, 2021, 01:36 PM", 1630935360000, "http", "172.16.20.44", "23123", "198.51.100.10", "80", "blocked", "Device Action: Blocked"),
  log("Sep, 04, 2021, 08:07 PM", 1630786020000, "http", "203.0.113.90", "443", "172.16.20.20", "22", "allowed", "Username: admin"),
  log("Oct, 11, 2020, 09:41 PM", 1602452460000, "https", "172.16.20.44", "41121", "198.51.100.77", "443", "allowed", "URL: http://northstar-perks.example/claim"),
  log("Dec, 11, 2020, 09:02 PM", 1607720520000, "smtp", "198.51.100.77", "25", "172.16.20.5", "25", "allowed", "Sender Mail: rewards@northstar-perks.example Destination Mail: priya.shah@northstar.example"),
  log("Jan, 02, 2021, 03:39 PM", 1609601940000, "smtp", "198.51.100.77", "25", "172.16.20.5", "25", "blocked", "Device Action: Blocked subject=Cafeteria credit"),
  log("May, 13, 2024, 09:22 AM", 1715592120000, "smtp", "198.51.100.77", "25", "172.16.20.5", "25", "blocked", "subject=Payroll voucher Device Action: Blocked"),
].sort((a, b) => b.epoch - a.epoch);

export type MailItem = {
  id: string;
  box: string;
  from: string;
  to: string;
  subject: string;
  when: string;
  smtp: string;
  body: string;
  finalAction: "Allowed" | "Blocked" | "Unknown";
  attachment: string;
  attachmentHash: string;
  password: string;
  link: string;
};

export const MAIL: MailItem[] = [
  {
    id: "mail-voucher",
    box: "Priya Shah",
    from: "rewards@northstar-perks.example",
    to: "priya.shah@northstar.example",
    subject: "Cafeteria credit",
    when: "02 Jan 2021, 03:39 PM",
    smtp: "198.51.100.77",
    body: "Priya, your cafeteria credit expires today. Download the voucher and open it. Password: infected",
    finalAction: "Allowed",
    attachment: "c91e4a70b2d84f11aa09e6c35d77b018.zip",
    attachmentHash: "c91e4a70b2d84f11aa09e6c35d77b018",
    password: "infected",
    link: "http://northstar-perks.example/claim",
  },
  {
    id: "mail-it",
    box: "Priya Shah",
    from: "it@northstar.example",
    to: "priya.shah@northstar.example",
    subject: "VPN maintenance window",
    when: "22 Oct 2026, 07:40 AM",
    smtp: "172.16.20.5",
    body: "The VPN gateway restarts at 21:00. No action is required.",
    finalAction: "Allowed",
    attachment: "",
    attachmentHash: "",
    password: "",
    link: "",
  },
  {
    id: "mail-payroll",
    box: "Priya Shah",
    from: "rewards@northstar-perks.example",
    to: "priya.shah@northstar.example",
    subject: "Payroll voucher",
    when: "13 May 2024, 09:22 AM",
    smtp: "198.51.100.77",
    body: "The gateway quarantined this copy before the mailbox stored it.",
    finalAction: "Blocked",
    attachment: "",
    attachmentHash: "",
    password: "",
    link: "http://northstar-perks.example/claim",
  },
];

export type IntelRow = { value: string; type: string; tag: string; source: string; detail: string };

export const INTEL: IntelRow[] = [
  { value: "northstar-perks.example", type: "domain", tag: "phishing", source: "Mail feed", detail: "Lookalike of the company cafeteria. Registered yesterday." },
  { value: "198.51.100.77", type: "ip", tag: "phishing", source: "Mail gateway", detail: "SMTP source of the voucher message. Not a Northstar address." },
  { value: "cdn.desk-helper.example", type: "domain", tag: "malware", source: "Sandbox", detail: "Called by Desk Helper immediately after install." },
  { value: "203.0.113.44", type: "ip", tag: "malware", source: "DNS", detail: "Address for cdn.desk-helper.example." },
  { value: "203.0.113.12", type: "ip", tag: "malware", source: "Block list", detail: "Beacon address used by the finance laptop." },
  { value: "203.0.113.90", type: "ip", tag: "scan", source: "VPN", detail: "Source of the password spray. No successful login." },
  { value: "status.northstar.example", type: "domain", tag: "internal", source: "Company DNS", detail: "Northstar status page. New registrar this month." },
  { value: "198.51.100.20", type: "ip", tag: "internal", source: "NetOps", detail: "Uptime checker for the status page." },
  { value: "c91e4a70b2d84f11aa09e6c35d77b018", type: "hash", tag: "phishing", source: "Sandbox", detail: "MD5 of the voucher archive. Password is in the mail body." },
  { value: "9cc61ab2e45d80f31477c0aa12de88b4", type: "hash", tag: "malware", source: "Endpoint", detail: "MD5 shared by Desk Helper and hh.exe." },
];

export const SHELL: Record<string, Record<string, string>> = {
  "ws-priya": {
    whoami: "northstar\\priya.shah",
    hostname: "WS-PRIYA",
    ipconfig: "IPv4 172.16.20.44",
    tasklist: "outlook.exe\nmsedge.exe",
  },
  "ws-jonah": {
    whoami: "northstar\\jonah.adeyemi",
    hostname: "WS-JONAH",
    ipconfig: "IPv4 172.16.20.51",
    tasklist: "chrome.exe",
  },
  "ws-finance": {
    whoami: "northstar\\lina.ortiz",
    hostname: "WS-FINANCE",
    ipconfig: "IPv4 172.16.20.80",
    tasklist: "ledger.exe  (image hash mismatch)",
  },
  "vpn-03": { whoami: "root", hostname: "VPN-03", ipconfig: "IPv4 198.51.100.10", tasklist: "openvpn" },
  "mail-01": { whoami: "postfix", hostname: "MAIL-01", ipconfig: "IPv4 172.16.20.5", tasklist: "postfix" },
  "web-01": { whoami: "www-data", hostname: "WEB-01", ipconfig: "IPv4 172.16.20.20", tasklist: "nginx" },
};

export type ExtHit = {
  query: string;
  title: string;
  malicious: boolean;
  ratio: string;
  vendors: { name: string; verdict: string }[];
  summary: string;
  relations: string[];
  ip?: { reports: number; confidence: number; isp: string; usage: string; asn: string; hostname: string; country: string; resolvedFrom?: string };
};

export const EXT: ExtHit[] = [
  {
    query: "http://northstar-perks.example/claim",
    title: "northstar-perks.example/claim",
    malicious: true,
    ratio: "9/72",
    vendors: [
      { name: "Northstar Lab", verdict: "phishing" },
      { name: "Harbor Scan", verdict: "malicious" },
      { name: "Quiet AV", verdict: "clean" },
    ],
    summary: "Credential-harvest page imitating the company cafeteria.",
    relations: ["198.51.100.77", "rewards@northstar-perks.example"],
  },
  {
    query: "c91e4a70b2d84f11aa09e6c35d77b018",
    title: "voucher.zip",
    malicious: true,
    ratio: "14/70",
    vendors: [
      { name: "Crowdline Falcon", verdict: "trojan.generic" },
      { name: "MetaFence", verdict: "phishing" },
    ],
    summary: "Archive. The sample asks for a password and then opens the claim link.",
    relations: ["http://northstar-perks.example/claim"],
  },
  {
    query: "9cc61ab2e45d80f31477c0aa12de88b4",
    title: "DeskHelper.crx",
    malicious: true,
    ratio: "22/70",
    vendors: [
      { name: "Crowdline Falcon", verdict: "trojan.generic" },
      { name: "MetaFence", verdict: "pup" },
    ],
    summary: "Browser extension that posts open tabs to cdn.desk-helper.example.",
    relations: ["cdn.desk-helper.example", "203.0.113.44"],
  },
  {
    query: "198.51.100.77",
    title: "198.51.100.77",
    malicious: true,
    ratio: "6/70",
    vendors: [{ name: "IP Check", verdict: "reported" }],
    summary: "Reported for phishing mail.",
    relations: ["northstar-perks.example"],
    ip: { reports: 40, confidence: 86, isp: "Example Transit", usage: "Data center", asn: "AS64500", hostname: "mail.northstar-perks.example", country: "Example Region" },
  },
  {
    query: "203.0.113.90",
    title: "203.0.113.90",
    malicious: true,
    ratio: "3/70",
    vendors: [{ name: "IP Check", verdict: "scanner" }],
    summary: "Many failed logins, no successful session.",
    relations: [],
    ip: { reports: 12, confidence: 40, isp: "Example Hosting", usage: "Data center", asn: "AS64501", hostname: "scan.example", country: "Example Region" },
  },
  {
    query: "203.0.113.44",
    title: "203.0.113.44",
    malicious: true,
    ratio: "11/70",
    vendors: [{ name: "IP Check", verdict: "malware" }],
    summary: "Hosting for cdn.desk-helper.example.",
    relations: ["cdn.desk-helper.example"],
    ip: { reports: 33, confidence: 91, isp: "Example Cloud", usage: "Content delivery", asn: "AS64502", hostname: "cdn.desk-helper.example", country: "Example Region" },
  },
  {
    query: "203.0.113.12",
    title: "203.0.113.12",
    malicious: true,
    ratio: "8/70",
    vendors: [{ name: "IP Check", verdict: "c2" }],
    summary: "Beacon endpoint on the company block list.",
    relations: ["ledger-update.example"],
    ip: { reports: 18, confidence: 77, isp: "Example Cloud", usage: "Data center", asn: "AS64503", hostname: "ledger-update.example", country: "Example Region" },
  },
  {
    query: "203.0.113.50",
    title: "203.0.113.50",
    malicious: true,
    ratio: "2/70",
    vendors: [{ name: "IP Check", verdict: "suspicious" }],
    summary: "Source of the SharePoint elevate attempt.",
    relations: [],
    ip: { reports: 4, confidence: 25, isp: "Example Broadband", usage: "Residential", asn: "AS64504", hostname: "pool.example", country: "Example Region" },
  },
  {
    query: "cdn.desk-helper.example",
    title: "cdn.desk-helper.example",
    malicious: true,
    ratio: "11/70",
    vendors: [{ name: "IP Check", verdict: "malware" }],
    summary: "Domain used by the untrusted extension.",
    relations: ["203.0.113.44"],
    ip: { reports: 33, confidence: 91, isp: "Example Cloud", usage: "Content delivery", asn: "AS64502", hostname: "cdn.desk-helper.example", country: "Example Region", resolvedFrom: "cdn.desk-helper.example" },
  },
  {
    query: "status.northstar.example",
    title: "status.northstar.example",
    malicious: false,
    ratio: "0/70",
    vendors: [{ name: "IP Check", verdict: "clean" }],
    summary: "Company status page.",
    relations: ["198.51.100.20"],
    ip: { reports: 0, confidence: 0, isp: "Northstar NetOps", usage: "Corporate", asn: "AS64510", hostname: "status.northstar.example", country: "Home region", resolvedFrom: "status.northstar.example" },
  },
  {
    query: "198.51.100.20",
    title: "198.51.100.20",
    malicious: false,
    ratio: "0/70",
    vendors: [{ name: "IP Check", verdict: "clean" }],
    summary: "Uptime checker. No abuse reports.",
    relations: ["status.northstar.example"],
    ip: { reports: 0, confidence: 0, isp: "Northstar NetOps", usage: "Corporate", asn: "AS64510", hostname: "monitor.northstar.example", country: "Home region" },
  },
];

export function extLookup(query: string): ExtHit | undefined {
  const needle = query.trim().toLowerCase();
  return EXT.find((hit) => hit.query.toLowerCase() === needle);
}
