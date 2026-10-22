import { useEffect, useState } from "react";
import { Box, ChevronLeft, CircleHelp, Flame, FolderOpen, Inbox, Monitor, Radar, ScrollText, Search, Shield, Trophy, UserRound } from "lucide-react";
import { practiceHref, type PracticePage } from "../../lib/route";
import { pointsOf } from "../../lib/socLogic";
import { soc, useSoc } from "../../lib/socStore";

const NAV: Array<{ page: PracticePage; label: string; icon: typeof Radar }> = [
  { page: "monitoring", label: "Monitoring", icon: Radar },
  { page: "logs", label: "Log Management", icon: ScrollText },
  { page: "cases", label: "Case Management", icon: FolderOpen },
  { page: "endpoint", label: "Endpoint Security", icon: Monitor },
  { page: "email", label: "Email Security", icon: Inbox },
  { page: "intel", label: "Threat Intel", icon: Search },
  { page: "sandbox", label: "Sandbox", icon: Box },
];

export function TopNav() {
  const state = useSoc();
  const [menu, setMenu] = useState<"trophy" | "help" | "user" | null>(null);
  const points = pointsOf(state);
  const closed = state.closedOrder.length;
  return (
    <header className="soc__nav">
      <a className="soc__brand" href="#/practice/monitoring">
        <span className="brand__mark"><Shield className="icon" /></span>
        <span>Northstar</span>
      </a>
      <nav className="soc__links" aria-label="Practice">
        <a href="#/">Home</a>
        <a href="#/practice/learn">Learn</a>
        <a href="#/practice/monitoring" aria-current="page">Practice</a>
        <a href="#/">Challenge</a>
        <button type="button" onClick={() => setMenu(menu === "help" ? null : "help")}>Help</button>
      </nav>
      <div className="soc__account">
        <button type="button" className="soc__streak" onClick={() => setMenu(menu === "trophy" ? null : "trophy")} aria-label={`${state.streak} day streak, ${points} points`}>
          <Flame className="icon" />
          <span className="mono">{state.streak}</span>
        </button>
        <button type="button" aria-label="Progress" onClick={() => setMenu(menu === "trophy" ? null : "trophy")}><Trophy className="icon" /></button>
        <button type="button" aria-label="Help" onClick={() => setMenu(menu === "help" ? null : "help")}><CircleHelp className="icon" /></button>
        <button type="button" aria-label="Account and role" onClick={() => setMenu(menu === "user" ? null : "user")}><UserRound className="icon" /></button>
        {menu === "trophy" && (
          <div className="soc__pop" role="dialog" aria-label="Progress">
            <p><b className="mono">{points}</b> points</p>
            <p><b className="mono">{state.streak}</b> day streak</p>
            <p><b className="mono">{closed}</b> alerts closed</p>
          </div>
        )}
        {menu === "help" && (
          <div className="soc__pop" role="dialog" aria-label="Help">
            <p>Work the alert in Monitoring, then the case playbook. Other tools open in new tabs. The score appears when you close the alert.</p>
            <p>This queue is fictional Northstar data.</p>
          </div>
        )}
        {menu === "user" && (
          <div className="soc__pop" role="dialog" aria-label="Role">
            <p>Role</p>
            <button type="button" className={state.role === "analyst" ? "is-on" : ""} onClick={() => soc.role("analyst")}>SOC Analyst</button>
            <button type="button" className={state.role === "responder" ? "is-on" : ""} onClick={() => soc.role("responder")}>Incident Responder</button>
            <button type="button" data-testid="reset-practice" onClick={() => soc.reset()}>Reset practice</button>
          </div>
        )}
      </div>
    </header>
  );
}

export function SideNav(props: { page: PracticePage }) {
  const collapsed = useSoc().collapsed;
  return (
    <nav className={`soc__side ${collapsed ? "is-collapsed" : ""}`} aria-label="Practice tools">
      <button type="button" className="soc__collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => soc.collapse()}>
        <ChevronLeft className="icon" />
      </button>
      {NAV.map((item) => {
        const Icon = item.icon;
        const on = props.page === item.page;
        return (
          <a key={item.page} href={practiceHref(item.page)} aria-current={on ? "page" : undefined} title={item.label}>
            <Icon className="icon" />
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export function Footer() {
  const cols: Array<{ title: string; links: string[] }> = [
    { title: "Resources", links: ["Blog", "ATT&CK map", "Dictionary"] },
    { title: "Community", links: ["Forum", "Contribute"] },
    { title: "Roles", links: ["SOC Analyst", "Incident Responder"] },
    { title: "Support", links: ["Help", "Contact"] },
  ];
  return (
    <footer className="soc__foot">
      {cols.map((col) => (
        <div key={col.title}>
          <h2>{col.title}</h2>
          {col.links.map((link) => (
            <a key={link} href="#/practice/learn">{link}</a>
          ))}
        </div>
      ))}
    </footer>
  );
}

export function useTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
