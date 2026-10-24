"""Learner progress derived only from valid, completed attempts.

Branches, aborts, technical failures and model-fallback runs are listed with the reason
they are excluded and never enter an average. Conditions (assessment, independent
practice, coached practice) are reported separately: their scores are not comparable
and are never pooled.
"""

from __future__ import annotations

import statistics
from collections import defaultdict

DIMENSIONS = (
    "recognition",
    "containment",
    "verification",
    "continuity",
    "proportionality",
    "timeliness",
)
POLICY = (
    "Competency uses finished, unbranched attempts in which the local model ran as designed. "
    "Conditions are reported separately because their scores are not comparable."
)


def condition(run):
    if run["mode"] == "assessment":
        return "assessment"
    return "practice-" + (
        "independent" if run["assistance"] == "independent" else "coached"
    )


def exclusion(run, score):
    """Why an attempt cannot count toward competency, or None when it counts."""
    if run.get("branch_from"):
        return "Practice branch: a retry from a checkpoint, not an independent attempt."
    if run["outcome"] == "aborted" or run.get("terminal_reason") == "aborted":
        return "Ended early without completing the shift."
    if run["outcome"] == "technical_failure" or run["state"] == "technical_failure":
        return "Technical failure on the range."
    if run["state"] not in {"completed", "timed_out"}:
        return "Shift still in progress."
    if score is None:
        return "No recorded score."
    if score.get("fallback_used"):
        return "The local model was unavailable for part of this run, so the adversary was not as designed."
    return None


def attempt_view(run, score):
    reason = exclusion(run, score)
    return {
        "run_id": run["run_id"],
        "scenario_id": run["scenario_id"],
        "scenario_version": run["scenario_version"],
        "assistance": run["assistance"],
        "mode": run["mode"],
        "condition": condition(run),
        "state": run["state"],
        "outcome": run["outcome"],
        "owner": run["owner"],
        "branch": bool(run.get("branch_from")),
        "ended_at": run.get("ended_at"),
        "counts_toward_progress": reason is None,
        "exclusion_reason": reason,
        "score": score,
    }


def _pct(score, name):
    d = next((x for x in score["breakdown"] if x["dimension"] == name), None)
    return (
        None
        if d is None or not d["max_points"]
        else 100 * d["awarded"] / d["max_points"]
    )


def summarize(attempts):
    counted = [a for a in attempts if a["counts_toward_progress"]]
    by_condition = {}
    for name in sorted({a["condition"] for a in counted}):
        mine = [a for a in counted if a["condition"] == name]
        dims = {}
        for dim in DIMENSIONS:
            values = [v for a in mine if (v := _pct(a["score"], dim)) is not None]
            dims[dim] = {
                "average_pct": round(sum(values) / len(values)) if values else None,
                "attempts": len(values),
            }
        by_condition[name] = {
            "attempts": len(mine),
            "mean_score": round(
                statistics.mean(a["score"]["score_total"] for a in mine), 1
            ),
            "dimensions": dims,
        }
    scenarios = defaultdict(list)
    for a in counted:
        scenarios[(a["scenario_id"], a["scenario_version"])].append(a)
    by_scenario = [
        {
            "scenario_id": sid,
            "scenario_version": version,
            "attempts": len(rows),
            "mean_score": round(
                statistics.mean(a["score"]["score_total"] for a in rows), 1
            ),
            "outcomes": {
                o: sum(a["outcome"] == o for a in rows)
                for o in sorted({a["outcome"] for a in rows})
            },
        }
        for (sid, version), rows in sorted(scenarios.items())
    ]
    latencies = [
        a["score"]["model_provenance"]["median_latency_ms"]
        for a in counted
        if a["score"].get("model_provenance", {}).get("total_decisions")
    ]
    adversary = {
        "attempts": len(counted),
        "objective_reached": sum(
            a["outcome"] == "attacker_objective_reached" for a in counted
        ),
        "median_decision_latency_ms": round(statistics.median(latencies))
        if latencies
        else None,
        "excluded_for_model_fallback": sum(
            bool(a["score"] and a["score"].get("fallback_used"))
            and not a["counts_toward_progress"]
            and not a["branch"]
            for a in attempts
        ),
    }
    return {
        "policy": POLICY,
        "counted": len(counted),
        "excluded": len(attempts) - len(counted),
        "competency": by_condition,
        "by_scenario": by_scenario,
        "adversary": adversary,
    }
