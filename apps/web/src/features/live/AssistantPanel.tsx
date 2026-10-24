import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Check, Sparkles, TriangleAlert } from "lucide-react";
import {
  api,
  terminal,
  type AssistantTurn,
  type Event,
  type Snapshot,
} from "./types";
import { LearningReferences } from "./LearningViews";
import {
  MAX_ASSISTANT_EVIDENCE,
  REVIEW_LABEL,
  citationProblems,
  clock,
  releasedEvidence,
  title,
  toggleSelection,
} from "./logic";

type Props = {
  snapshot: Snapshot;
  events: Event[];
  onInspect: (id: string) => void;
};

const REVIEW_CHOICES: [AssistantTurn["review_status"], string][] = [
  ["corroborated", "Corroborated by other evidence"],
  ["disputed", "Disputed by the evidence"],
  ["needs_more_evidence", "Needs more evidence"],
];

export function AssistantPanel({ snapshot: s, events, onInspect }: Props) {
  const locked = s.mode === "assessment";
  const ended = terminal(s.state);
  const released = useMemo(() => releasedEvidence(events), [events]);
  const pinnedReleased = useMemo(
    () =>
      released
        .filter((e) => s.workspace.evidence_ids.includes(e.event_id))
        .map((e) => e.event_id),
    [released, s.workspace.evidence_ids],
  );
  const [turns, setTurns] = useState<AssistantTurn[]>([]),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [question, setQuestion] = useState(""),
    [level, setLevel] = useState("explain"),
    [asking, setAsking] = useState(false),
    [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (locked) return;
    let cancelled = false;
    api<{ turns: AssistantTurn[] }>("/runs/" + s.run_id + "/assistant")
      .then((r) => {
        if (!cancelled) setTurns(r.turns);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [s.run_id, locked]);

  const ask = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setAsking(true);
      setError(null);
      try {
        const turn = await api<AssistantTurn>(
          "/runs/" + s.run_id + "/assistant",
          "POST",
          {
            event_ids: selected,
            question: question.trim(),
            level,
          },
        );
        setTurns((t) => [...t, turn]);
        setQuestion("");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setAsking(false);
      }
    },
    [s.run_id, selected, question, level],
  );

  if (locked)
    return (
      <><section className="card live-pad" aria-labelledby="assistant-title">
        <h2 id="assistant-title">Evidence assistant</h2>
        <p role="status">
          The evidence assistant is unavailable during assessments so your
          result reflects your own analysis.
        </p>
      </section><LearningReferences /></>
    );

  return (
    <>
      <section
        className="card live-pad live-assistant"
        aria-labelledby="assistant-title"
      >
        <div className="live-section-head">
          <h2 id="assistant-title">Evidence assistant</h2>
          <span className="live-badge ai">
            <Sparkles size={13} /> Practice only · local model
          </span>
        </div>
        <p>
          Select the events you want explained. Your question retrieves an authored
          lesson for the local model to select. The answer pairs that lesson with
          exact values from your selected events or saved worksheet. Review those
          values against the logs; the assistant cannot act on the range. Using
          assistance is recorded and does not deduct practice points.
        </p>
        <form onSubmit={ask}>
          <label htmlFor="assistant-level">Assistance level</label>
          <select id="assistant-level" value={level} onChange={e => setLevel(e.target.value)} disabled={ended || asking}>
            <option value="explain">Explain · interpret a field or concept</option>
            <option value="nudge">Nudge · suggest an investigation question</option>
            <option value="guide">Guide · offer a query pattern</option>
          </select>
          <fieldset className="live-picker">
            <legend>
              Evidence to explain{" "}
              <span className="live-muted" aria-live="polite">
                · {selected.length} of {MAX_ASSISTANT_EVIDENCE} selected
              </span>
            </legend>
            <div className="live-tags">
              <button
                type="button"
                className="btn btn--sm"
                disabled={!pinnedReleased.length}
                onClick={() =>
                  setSelected(pinnedReleased.slice(0, MAX_ASSISTANT_EVIDENCE))
                }
              >
                Use my pinned evidence ({pinnedReleased.length})
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                disabled={!selected.length}
                onClick={() => setSelected([])}
              >
                Clear selection
              </button>
            </div>
            {!released.length ? (
              <p className="live-muted">
                No target activity has been released yet. Events appear here as
                company systems record them.
              </p>
            ) : (
              <ul
                className="live-picker__list"
                aria-label="Released target events"
              >
                {released
                  .slice(-40)
                  .reverse()
                  .map((e) => {
                    const checked = selected.includes(e.event_id);
                    const full =
                      !checked && selected.length >= MAX_ASSISTANT_EVIDENCE;
                    return (
                      <li
                        key={e.event_id}
                        className={checked ? "selected" : ""}
                      >
                        <label>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={full}
                            onChange={() =>
                              setSelected((x) => toggleSelection(x, e.event_id))
                            }
                          />
                          <span className="mono">
                            {clock(e.virtual_clock_sec)}
                          </span>
                          <span>{e.actor_id}</span>
                          <span className="mono">
                            {e.session_handle ?? "—"}
                          </span>
                          <span className="mono">
                            {e.network
                              ? e.network.http_method + " " + e.network.path
                              : title(e.event_type)}
                          </span>
                          <span className="live-badge">
                            {e.network?.status_code ?? e.outcome ?? "recorded"}
                          </span>
                        </label>
                      </li>
                    );
                  })}
              </ul>
            )}
          </fieldset>
          <label htmlFor="assistant-question">
            Question about the selected evidence
          </label>
          <textarea
            id="assistant-question"
            value={question}
            maxLength={1000}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="For example: What do these requests have in common, and what else would I check?"
          />
          <div className="live-tags">
            <button
              className="btn btn--primary"
              disabled={ended || asking || !selected.length || !question.trim()}
            >
              {asking ? "Asking the local model…" : "Ask assistant"}
            </button>
            {!selected.length && (
              <span className="live-muted">Select at least one event.</span>
            )}
            {ended && (
              <span className="live-muted">
                This shift has ended. Recorded answers are read only.
              </span>
            )}
          </div>
        </form>
        {error && (
          <div className="live-error" role="alert">
            <TriangleAlert size={16} />
            <span>
              {error}{" "}
              <span className="live-muted">
                Your selection and notes are unchanged. You can try again.
              </span>
            </span>
          </div>
        )}
      </section>
      <LearningReferences />

      <section className="card live-pad" aria-labelledby="assistant-history">
        <h2 id="assistant-history">Assistant answers</h2>
        {!loaded && <p role="status">Loading earlier answers…</p>}
        {loaded && !turns.length && (
          <p className="live-muted">
            No questions asked yet. Answers stay unverified until you review
            them.
          </p>
        )}
        {turns
          .slice()
          .reverse()
          .map((t) => (
            <Turn
              key={t.id}
              turn={t}
              runId={s.run_id}
              readOnly={ended}
              onInspect={onInspect}
              onAsk={(q) => setQuestion(q)}
              onReviewed={(u) =>
                setTurns((all) => all.map((x) => (x.id === u.id ? u : x)))
              }
            />
          ))}
      </section>
    </>
  );
}

function Turn({
  turn: t,
  runId,
  onInspect,
  onAsk,
  onReviewed,
  readOnly,
}: {
  turn: AssistantTurn;
  runId: string;
  onInspect: (id: string) => void;
  onAsk: (q: string) => void;
  onReviewed: (t: AssistantTurn) => void;
  readOnly: boolean;
}) {
  const problems = citationProblems(t);
  const [status, setStatus] = useState<AssistantTurn["review_status"]>(
      t.review_status === "unreviewed"
        ? "needs_more_evidence"
        : t.review_status,
    ),
    [note, setNote] = useState(t.review_note),
    [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(false);
  async function review(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onReviewed(
        await api<AssistantTurn>(
          "/runs/" + runId + "/assistant/" + t.id + "/review",
          "POST",
          { status, note: note.trim() },
        ),
      );
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <article
      className="live-turn"
      aria-label={"Assistant answer to: " + t.question}
    >
      <div className="live-section-head">
        <h3>{t.question}</h3>
        <span
          className={
            "live-badge " +
            (t.review_status === "unreviewed"
              ? "warn"
              : t.review_status === "corroborated"
                ? "good"
                : "")
          }
        >
          {REVIEW_LABEL[t.review_status]}
        </span>
      </div>
      {problems.length ? (
        <div className="live-error" role="alert">
          <TriangleAlert size={16} />
          <span>
            This answer cited evidence you did not select, so it is not shown.{" "}
            {problems[0]}
          </span>
        </div>
      ) : (
        <>
          <ol className="live-claims">
            {t.analysis.claims.map((c, i) => (
              <li key={i}>
                <p>{c.text}</p>
                {c.supports?.map((cite, j) => <blockquote key={j}><p>{cite.quote}</p><cite>{cite.source_id} · {cite.field}</cite></blockquote>)}
                <div className="live-tags">
                  {c.evidence_ids.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="live-filter"
                      onClick={() => onInspect(id)}
                      aria-label={"Open cited evidence " + id}
                    >
                      Evidence <span className="mono">{id.slice(-6)}</span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {t.query_pattern && <p><strong>Query to try:</strong> <code>{t.query_pattern}</code><br />{t.query_explanation}</p>}
          <p>
            <strong>Question to test next:</strong> {t.analysis.next_question}{" "}
            <button
              type="button"
              className="live-filter"
              onClick={() => onAsk(t.analysis.next_question)}
            >
              Use as my next question
            </button>
          </p>
        </>
      )}
      <p className="live-muted">
        Model <span className="mono">{t.model_id}</span> · {t.latency_ms} ms ·
        explains {t.evidence_ids.length} selected events. Natural-language
        claims are not verified by the range.
      </p>
      <form className="live-review" onSubmit={review}>
        <label htmlFor={"review-status-" + t.id}>Your review</label>
        <select
          id={"review-status-" + t.id}
          value={status}
          disabled={readOnly}
          onChange={(e) =>
            setStatus(e.target.value as AssistantTurn["review_status"])
          }
        >
          {REVIEW_CHOICES.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <label htmlFor={"review-note-" + t.id}>
          What in the logs supports your review?
        </label>
        <textarea
          id={"review-note-" + t.id}
          value={note}
          disabled={readOnly}
          maxLength={2000}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
        />
        <div className="live-tags">
          <button className="btn" disabled={readOnly || saving || !note.trim()}>
            {saving
              ? "Saving…"
              : t.review_status === "unreviewed"
                ? "Save review"
                : "Update review"}
          </button>
          {saved && (
            <span className="live-muted" role="status">
              <Check size={13} /> Review saved
            </span>
          )}
        </div>
        {error && (
          <p className="live-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </article>
  );
}
