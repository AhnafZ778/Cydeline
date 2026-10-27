import { useEffect, useState, type ReactNode } from "react";
import { Box, ChevronLeft, CircleHelp, FolderOpen, Inbox, Monitor, Radar, ScrollText, Search, Shield, BookOpen, Ellipsis } from "lucide-react";
import { type PracticePage } from "../../lib/route";
import { ModeSwitch } from "../live/ModeSwitch";

const PRIMARY = [
  { page: "monitoring", label: "Monitor", icon: Radar },
  { page: "logs", label: "Logs", icon: ScrollText },
  { page: "cases", label: "Cases", icon: FolderOpen },
  { page: "sandbox", label: "Workspace", icon: Box },
] as const;
const MORE = [
  { page: "endpoint", label: "Endpoint Security", icon: Monitor },
  { page: "email", label: "Email Security", icon: Inbox },
  { page: "intel", label: "Threat Intel", icon: Search },
  { page: "learn", label: "Learning desk", icon: BookOpen },
] as const;

export function TopNav() {
  const [help, setHelp] = useState(false);
  return <header className="soc__nav">
    <a className="soc__brand" href="#/"><span className="brand__mark"><Shield className="icon" /></span><span>Northstar</span></a>
    <div className="soc__account">
      <details className="header-resources"><summary>Resources</summary><nav aria-label="Training resources"><a href="#/">Mission Library</a><a href="#/live/progress">My progress</a><a href="#/live/profile">My training</a></nav></details>
      <button type="button" aria-label="Help" aria-expanded={help} onClick={() => setHelp(!help)}><CircleHelp className="icon" /></button>
      <ModeSwitch />
      {help && <div className="soc__pop" role="dialog" aria-label="Help"><p>Take ownership in Monitor, investigate Logs, then create a Case and follow its playbook. More tools holds supporting evidence, the company briefing and learning references.</p><button className="btn btn--sm" onClick={() => setHelp(false)}>Close help</button></div>}
    </div>
  </header>;
}

export function SideNav(props: { page?: PracticePage; activeHref?: string; runId?: string | null; children?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("soc-sidebar-collapsed") === "true");
  useEffect(() => {
    const change = (e: StorageEvent) => { if (e.key === "soc-sidebar-collapsed") setCollapsed(e.newValue === "true"); };
    window.addEventListener("storage", change); return () => window.removeEventListener("storage", change);
  }, []);
  const link = ({page, label, icon: Icon}: {page: string; label: string; icon: typeof Radar}) => <a key={page} href={props.runId ? "#/live/" + props.runId + "/" + page : "#/practice/" + page} title={label} aria-label={label} aria-current={props.page === page || props.activeHref?.endsWith("/" + page) ? "page" : undefined}><Icon className="icon" /><span>{label}</span></a>;
  return <nav className={"soc__side " + (collapsed ? "is-collapsed" : "")} aria-label="Practice tools">
    <button type="button" className="soc__collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => { setCollapsed(!collapsed); localStorage.setItem("soc-sidebar-collapsed", String(!collapsed)); }}><ChevronLeft className="icon" /></button>
    {PRIMARY.map(link)}
    <details className="side-more"><summary title="More tools" aria-label="More tools"><Ellipsis className="icon" /><span>More tools</span></summary><div className="side-more__links">{MORE.map(link)}{props.children}</div></details>
  </nav>;
}

export function Footer() { return <footer className="soc__foot lean-footer"><span>Northstar · Isolated learning range</span></footer>; }
export function useTitle(title: string) { useEffect(() => { const previous = document.title; document.title = title; return () => { document.title = previous; }; }, [title]); }
