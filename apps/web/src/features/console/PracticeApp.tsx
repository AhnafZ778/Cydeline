import { useEffect } from "react";
import { PAGE_TITLE, type Route } from "../../lib/route";
import { soc, useSoc } from "../../lib/socStore";
import { CaseList, Incident } from "./Cases";
import { Footer, SideNav, TopNav, useTitle } from "./Chrome";
import { ExtApp } from "./ExtSites";
import { Monitoring } from "./Monitoring";
import { Email, Endpoint, Intel, Learn, Logs, Sandbox } from "./Tools";

export function PracticeApp(props: { route: Extract<Route, { kind: "practice" }> }) {
  const page = props.route.page;
  useTitle(page === "cases" && props.route.caseId ? `Incident ${props.route.caseId} - Northstar Practice` : PAGE_TITLE[page]);
  return (
    <div className="soc">
      <a className="skip-link" href="#main">Skip to content</a>
      <TopNav />
      <div className="soc__body">
        <SideNav page={page === "learn" ? "monitoring" : page} />
        <div className="soc__stage">
          <main id="main" tabIndex={-1}>
            {page === "monitoring" && <Monitoring />}
            {page === "logs" && <Logs />}
            {page === "cases" && (props.route.caseId ? <Incident caseId={props.route.caseId} /> : <CaseList />)}
            {page === "endpoint" && <Endpoint />}
            {page === "email" && <Email />}
            {page === "intel" && <Intel />}
            {page === "sandbox" && <Sandbox />}
            {page === "learn" && <Learn />}
          </main>
          <Footer />
        </div>
      </div>
      <Reward />
    </div>
  );
}

export function ExtRoute(props: { route: Extract<Route, { kind: "ext" }> }) {
  return <ExtApp site={props.route.site} query={props.route.query} />;
}

function Reward() {
  const state = useSoc();
  useEffect(() => {
    if (!state.pendingConfetti || state.pendingStreak) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      soc.dismissConfetti();
      return;
    }
    const timer = window.setTimeout(() => soc.dismissConfetti(), 2500);
    return () => window.clearTimeout(timer);
  }, [state.pendingConfetti, state.pendingStreak]);
  return (
    <>
      {state.pendingConfetti && <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ left: `${(index * 53) % 100}%`, animationDelay: `${(index % 6) * 0.08}s` }} />)}</div>}
      {state.pendingStreak && (
        <div className="soc-scrim" role="presentation">
          <div className="soc-modal soc-streak" role="dialog" aria-modal="true" aria-label={`${state.streak + 1} day streak`}>
            <p className="soc-streak__flame" aria-hidden="true">▲</p>
            <h2>{state.streak + 1} Day Streak</h2>
            <p>Practice again tomorrow so the streak does not reset.</p>
            <button type="button" className="btn btn--primary" data-testid="streak-continue" onClick={() => soc.dismissStreak()}>Continue</button>
          </div>
        </div>
      )}
    </>
  );
}
