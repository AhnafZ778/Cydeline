import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  ChevronLeft,
  CircleHelp,
  FolderOpen,
  Inbox,
  Monitor,
  Radar,
  ScrollText,
  Search,
  Shield,
  Trophy,
  UserRound,
  BookOpen,
  Activity,
  Users,
} from "lucide-react";
import { type PracticePage } from "../../lib/route";
const NAV: Array<{ page: PracticePage; label: string; icon: typeof Radar }> = [
  { page: "monitoring", label: "Live Monitoring", icon: Radar },
  { page: "logs", label: "Log Management", icon: ScrollText },
  { page: "cases", label: "Case Management", icon: FolderOpen },
  { page: "endpoint", label: "Endpoint Security", icon: Monitor },
  { page: "email", label: "Email Security", icon: Inbox },
  { page: "intel", label: "Threat Intel", icon: Search },
  { page: "sandbox", label: "Sandbox", icon: Box },
];
const TRAINING_NAV = [
  { href: "#/", label: "Mission Library", icon: BookOpen },
  { href: "#/live/progress", label: "My progress", icon: Activity },
  { href: "#/live/profile", label: "My training", icon: UserRound },
  { href: "#/live/instructor", label: "Instructor", icon: Users },
];
export function TopNav() {
  const [help, setHelp] = useState(false);
  return (
    <header className="soc__nav">
      <a className="soc__brand" href="#/">
        <span className="brand__mark">
          <Shield className="icon" />
        </span>
        <span>Northstar</span>
      </a>
      <nav className="soc__links" aria-label="Practice">
        <a href="#/">Home</a>
        <a href="#/practice/learn">Learn</a>
        <a href="#/practice/monitoring">Practice</a>
        <a href="#/live/progress">My progress</a>
        <a href="#/live/profile">My training</a>
        <a href="#/live/instructor">Instructor</a>
      </nav>
      <div className="soc__account">
        <a aria-label="Progress" href="#/live/progress">
          <Trophy className="icon" />
        </a>
        <button
          type="button"
          aria-label="Help"
          aria-expanded={help}
          onClick={() => setHelp(!help)}
        >
          <CircleHelp className="icon" />
        </button>
        <a href="#/live/profile" aria-label="Account">
          <UserRound className="icon" />
        </a>
        {help && (
          <div className="soc__pop" role="dialog" aria-label="Help">
            <p>
              Take ownership in Live Monitoring, investigate logs, then create a
              case and follow its playbook. Response and recovery checks change
              actual access in this fictional company. Final feedback appears
              after the exercise ends.
            </p>
            <button className="btn btn--sm" onClick={() => setHelp(false)}>
              Close help
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
export function SideNav(props: {
  page?: PracticePage;
  activeHref?: string;
  runId?: string | null;
  children?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("soc-sidebar-collapsed") === "true",
  );
  useEffect(() => {
    const change = (e: StorageEvent) => {
      if (e.key === "soc-sidebar-collapsed")
        setCollapsed(e.newValue === "true");
    };
    window.addEventListener("storage", change);
    return () => window.removeEventListener("storage", change);
  }, []);
  return (
    <nav
      className={"soc__side " + (collapsed ? "is-collapsed" : "")}
      aria-label="Practice tools"
    >
      <button
        type="button"
        className="soc__collapse"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => {
          setCollapsed(!collapsed);
          localStorage.setItem("soc-sidebar-collapsed", String(!collapsed));
        }}
      >
        <ChevronLeft className="icon" />
      </button>
      {NAV.map(({ page, label, icon: Icon }) => (
        <a
          key={page}
          href={
            props.runId
              ? "#/live/" + props.runId + "/" + page
              : "#/practice/" + page
          }
          title={label}
          aria-current={props.page === page ? "page" : undefined}
        >
          <Icon className="icon" />
          <span>{label}</span>
        </a>
      ))}
      {TRAINING_NAV.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={href}
          title={label}
          aria-current={props.activeHref === href ? "page" : undefined}
        >
          <Icon className="icon" />
          <span>{label}</span>
        </a>
      ))}
      {props.children}
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
            <a key={link} href="#/practice/learn">
              {link}
            </a>
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
