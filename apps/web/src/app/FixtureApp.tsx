import { useEffect, useMemo, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { getControlClient } from "../api";
import { useMission } from "./useMission";
import { useAdversary } from "./useAdversary";
import { TopBar } from "../features/shell/TopBar";
import { Landing } from "../features/shell/Landing";
import { WorkbenchHeader } from "../features/shell/WorkbenchHeader";
import { ShortcutsDialog } from "../features/shell/ShortcutsDialog";
import { DevDrawer } from "../features/shell/DevDrawer";
import { GuidePanel } from "../features/guide/GuidePanel";
import { KpiStrip } from "../features/kpi/KpiStrip";
import { AdversaryStrip, BlindStrip, LensToggle } from "../features/flow/AdversaryStrip";
import { ActivityChart, ChartMarker } from "../features/activity/ActivityChart";
import { LogConsole } from "../features/logs/LogConsole";
import { EvidenceTray } from "../features/logs/EvidenceTray";
import { LegacyInspectorDrawer as InspectorDrawer } from "../features/logs/LegacyInspectorDrawer";
import { DeclareDrawer } from "../features/response/DeclareDrawer";
import { RespondDrawer } from "../features/response/RespondDrawer";
import { VerifyDrawer } from "../features/response/VerifyDrawer";
import { Debrief } from "../features/debrief/Debrief";
import { CoachMarks, tourDone } from "../features/tour/CoachMarks";
import { ExtRoute, PracticeApp } from "../features/console/PracticeApp";
import { Pivot, parseTerm } from "../lib/query";
import { parseHash } from "../lib/route";
import { aiFootprint } from "../lib/adversary";

type Panels = { activity: boolean; logs: boolean; coach: boolean };
const PANEL_KEY = "sl.panels";
const PANEL_LABEL: Record<keyof Panels, string> = { activity: "Activity", logs: "Logs", coach: "Coach" };

function loadPanels(): Panels {
  const base: Panels = { activity: true, logs: true, coach: true };
  try {
    const raw = localStorage.getItem(PANEL_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<Panels>;
    return {
      activity: parsed.activity !== false,
      logs: parsed.logs !== false,
      coach: parsed.coach !== false,
    };
  } catch {
    return base;
  }
}

// Original mission workbench and SOC practice console; live additions are routed separately.
export function FixtureApp({ hash }: { hash: string }) {
  const client = useMemo(() => getControlClient(), []);
  const m = useMission(client);
  const adv = useAdversary(m.snapshot, m.epoch, m.paused);

  const [guideCollapsed, setGuideCollapsed] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [tour, setTour] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(() => new URLSearchParams(window.location.search).get("dev") === "1");
  const [panels, setPanels] = useState<Panels>(loadPanels);

  const togglePanel = (key: keyof Panels) => {
    setPanels((cur) => {
      const next = { ...cur, [key]: !cur[key] };
      try {
        localStorage.setItem(PANEL_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  // First-run tour, once the workbench is on screen.
  useEffect(() => {
    if (m.status !== "live" || tourDone()) return;
    const t = window.setTimeout(() => setTour(true), 700);
    return () => window.clearTimeout(t);
  }, [m.status]);

  // Global keys: Esc closes panels, ? opens shortcuts, Ctrl/Cmd+K unlocks dev tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDevUnlocked(true);
        m.openDrawer("dev");
        return;
      }
      if (e.key === "Escape" && !t?.closest?.(".query")) {
        if (guideOpen) setGuideOpen(false);
        else if (m.drawer) m.closeDrawer();
        return;
      }
      if (e.key === "?" && !typing) {
        e.preventDefault();
        setShortcuts(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const footprint = useMemo(() => (adv.lens === "coached" ? aiFootprint(m.rows, adv.decisions) : null), [adv.lens, adv.decisions, m.rows]);

  const snap = m.snapshot;
  const decl = snap?.declaration ?? null;
  const markers: ChartMarker[] = useMemo(() => {
    const out: ChartMarker[] = [];
    if (decl) out.push({ ms: Date.parse(decl.created_at_utc), label: "Declared", tone: "declare" });
    const contain = snap?.applied_actions.find((a) => a.result !== "rejected" && a.action !== "restore_account");
    if (contain) out.push({ ms: Date.parse(contain.applied_at_utc), label: "Contained", tone: "contain" });
    return out;
  }, [decl, snap?.applied_actions]);

  const route = parseHash(hash);
  if (route.kind === "ext") return <ExtRoute route={route} />;
  if (route.kind === "practice") return <PracticeApp route={route} />;

  if (m.status === "landing" || m.status === "starting") {
    return <Landing starting={m.status === "starting"} error={m.error} isSim={m.isSim} onStart={m.start} onConsole={() => { window.location.hash = "#/practice/monitoring"; }} />;
  }

  if (m.status === "debrief") {
    return (
      <>
        <Debrief m={m} />
        <div className="sr-only" aria-live="polite">
          {m.announce}
        </div>
      </>
    );
  }

  const guideJump = (j: { pivot?: Pivot; query?: string }) => {
    if (j.pivot) m.setPivot(j.pivot);
    if (j.query) {
      const t = parseTerm(j.query);
      if (t) m.addTerm(t);
    }
    setGuideOpen(false);
  };

  const drawer = m.drawer;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopBar
        phase={m.phase}
        clockMs={m.nowMs}
        opponentActive={snap?.state === "running" && !m.paused}
        modeLabel={m.modeLabel}
        isSim={m.isSim}
        onReset={m.reset}
        onShortcuts={() => setShortcuts(true)}
        onTour={() => setTour(true)}
        onDev={() => m.openDrawer("dev")}
        devUnlocked={devUnlocked}
        onToggleGuide={() => setGuideOpen((o) => !o)}
      />
      <div className={`main ${guideCollapsed ? "is-guide-collapsed" : ""} ${guideOpen ? "is-guide-open" : ""}`}>
        <div className="guide-scrim" onClick={() => setGuideOpen(false)} />
        <GuidePanel
          phase={m.phase}
          objectives={m.objectives}
          collapsed={guideCollapsed}
          onToggle={() => setGuideCollapsed((c) => !c)}
          onJump={guideJump}
        />
        <main className={`workbench ${drawer ? "has-drawer" : ""}`} id="main" tabIndex={-1}>
          <WorkbenchHeader phase={m.phase} cta={m.cta} busy={m.busy} onCta={m.runCta} />
          {m.error && (
            <div className="banner banner--coral wb-banner" role="alert">
              <TriangleAlert className="icon" />
              <span style={{ flex: 1 }}>{m.error}</span>
              <button className="btn btn--ghost btn--icon btn--sm" aria-label="Dismiss" onClick={m.clearError}>
                <X className="icon" />
              </button>
            </div>
          )}
          <div className="wb-grid">
            <div className="viewbar">
              <p className="viewbar__note">This is the shift: what is happening, then the logs. The attack map waits in the debrief.</p>
              <div className="viewbar__toggles" role="group" aria-label="Shift panels">
                {(Object.keys(PANEL_LABEL) as Array<keyof Panels>).map((key) => (
                  <button key={key} type="button" aria-pressed={panels[key]} data-testid={`panel-${key}`} onClick={() => togglePanel(key)}>
                    {PANEL_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>
            {panels.coach && (
              <section className="card training" aria-label="Training overlay">
                <div className="card__head">
                  <div>
                    <div className="card__title">Training overlay</div>
                    <div className="card__sub">Optional. A real shift does not narrate the attacker. Switch to Blind for a closer simulation.</div>
                  </div>
                  <LensToggle lens={adv.lensPref} locked={adv.lensLocked} onChange={adv.setLens} />
                </div>
                {adv.lens === "coached" ? <AdversaryStrip state={adv.state} decisions={adv.decisions} /> : <BlindStrip />}
              </section>
            )}
            {panels.activity && (
              <div className={`viz-row ${panels.logs ? "" : "is-hero"}`}>
                <KpiStrip rows={m.rows} nowMs={m.nowMs} />
                <section className="card viz" data-tour="activity" aria-label="Activity chart">
                  <ActivityChart rows={m.rows} nowMs={m.nowMs} markers={markers} />
                </section>
              </div>
            )}
            {panels.logs && (
            <LogConsole
              rows={m.rows}
              terms={m.terms}
              pivot={m.pivot}
              paused={m.paused}
              newCount={m.newCount}
              isSim={m.isSim}
              pinned={m.pinned}
              aiRowIds={footprint?.rowIds ?? null}
              selectedId={m.selectedId}
              onAddTerm={m.addTerm}
              onRemoveTerm={m.removeTerm}
              onClearTerms={m.clearTerms}
              onPivot={m.setPivot}
              onSelect={m.select}
              onPin={m.togglePin}
              onTogglePause={m.togglePause}
              tray={<EvidenceTray pinned={m.pinned} rowById={m.rowById} onOpen={m.select} onUnpin={m.togglePin} />}
            />
            )}
            {!panels.activity && !panels.logs && !panels.coach && (
              <section className="card pad shift-empty">
                <p>Every panel is hidden.</p>
                <button
                  className="btn btn--primary"
                  type="button"
                  onClick={() => {
                    const next = { activity: true, logs: true, coach: true };
                    setPanels(next);
                    try {
                      localStorage.setItem(PANEL_KEY, JSON.stringify(next));
                    } catch {
                      /* storage unavailable */
                    }
                  }}
                >
                  Show the shift
                </button>
              </section>
            )}
          </div>
        </main>
      </div>

      {drawer === "inspector" && m.selectedRow && (
        <InspectorDrawer
          row={m.selectedRow}
          allRows={m.allRows}
          pinned={m.pinned.includes(m.selectedRow.id)}
          onClose={() => m.select(null)}
          onPin={() => m.togglePin(m.selectedRow!.id)}
          onSelect={m.select}
          onAddTerm={m.addTerm}
        />
      )}
      {drawer === "declare" && (
        <DeclareDrawer
          rows={m.allRows}
          pinned={m.pinned}
          rowById={m.rowById}
          busy={m.busy === "declare"}
          initial={m.suspect}
          onUnpin={m.togglePin}
          onSubmit={m.declare}
          onClose={m.closeDrawer}
        />
      )}
      {drawer === "respond" && snap && decl && (
        <RespondDrawer
          snapshot={snap}
          receipt={m.receipt}
          busy={m.busy === "apply"}
          onApply={m.apply}
          onPreview={() => undefined}
          onVerify={() => void m.verify()}
          onClose={m.closeDrawer}
        />
      )}
      {drawer === "verify" && (
        <VerifyDrawer
          verification={m.verification ?? snap?.verification ?? null}
          busy={m.busy === "verify"}
          onRun={() => void m.verify()}
          onReopen={() => m.openDrawer("respond")}
          onDebrief={() => void m.loadDebrief()}
          onClose={m.closeDrawer}
        />
      )}
      {drawer === "dev" && <DevDrawer m={m} onClose={m.closeDrawer} />}

      {shortcuts && <ShortcutsDialog onClose={() => setShortcuts(false)} />}
      {tour && <CoachMarks onClose={() => setTour(false)} />}
      <div className="sr-only" aria-live="polite" role="status">
        {m.announce}
      </div>
    </div>
  );
}
