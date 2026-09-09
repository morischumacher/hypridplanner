"""Discards recommendations the curriculum would refuse.

Each candidate is tried against the rule checker as if added. Only violations the
candidate itself introduces count, measured against the plan's existing result.
"""
from __future__ import annotations

import logging
from typing import Any

from .context import PlanContext

logger = logging.getLogger(__name__)

RESULT_LIMIT = 15

# Rule checking is expensive, and anything past this rank cannot reach the result.
_CHECK_LIMIT = 100

# A semester past any the student uses, so a candidate's credits are judged on
# their own rather than on whichever semester it landed in.
_LATE_TRIAL_LANE = 99


def _payload(plan: PlanContext, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    planned = plan.planned_courses + [extra] if extra else plan.planned_courses
    return {"plannedCourses": planned, "doneCourses": plan.done_courses}


def _lane_of(course: dict[str, Any]) -> int:
    try:
        return int(course.get("laneIndex", 0))
    except (TypeError, ValueError):
        return 0


def _trial_lanes(plan: PlanContext) -> tuple[int, ...]:
    """The semesters a candidate is tried in, in order.

    The late lane alone would refuse any course a planned course needs first, so
    the earliest lane in use is tried too. Between them both orderings are covered.
    """
    lanes = [_lane_of(c) for c in plan.planned_courses + plan.done_courses]
    if not lanes:
        return (_LATE_TRIAL_LANE,)
    return (_LATE_TRIAL_LANE, min(lanes))


def _trial_course(row: dict[str, Any], lane: int) -> dict[str, Any]:
    return {
        "code": row.get("code"),
        "name": row.get("title") or row.get("name"),
        "ects": row.get("ects"),
        "category": row.get("category") or row.get("type"),
        "examSubject": row.get("exam_subject") or row.get("examSubject") or "",
        "laneIndex": lane,
    }


def filter_by_rules(
    plan: PlanContext, recommendations: list[dict[str, Any]], rule_checker: Any
) -> list[dict[str, Any]]:
    """Keep the recommendations that introduce no new complaint, best first."""
    try:
        base = rule_checker.evaluate(_payload(plan))
    except Exception:
        # Without a baseline, every existing complaint would be charged to the
        # candidate, so the filter stands down rather than reject everything.
        logger.exception("rule checker could not evaluate the plan; recommendations are unfiltered")
        return recommendations[:RESULT_LIMIT]

    base_errors = base.errors or []
    base_warnings = base.stats.get("warnings", [])

    variants: dict[str, list[dict[str, Any]]] = {}
    for candidate in plan.candidates:
        variants.setdefault(candidate.code, []).append(candidate.row)

    lanes = _trial_lanes(plan)
    kept: list[dict[str, Any]] = []
    for recommendation in recommendations[:_CHECK_LIMIT]:
        rows = variants.get(recommendation["courseCode"], [])
        if not rows:
            # Nothing to place, so nothing to object to.
            kept.append(recommendation)
            continue
        if any(
            _is_acceptable(plan, row, lane, rule_checker, base_errors, base_warnings)
            for lane in lanes
            for row in rows
        ):
            kept.append(recommendation)
        if len(kept) >= RESULT_LIMIT:
            break
    return kept


def _is_acceptable(
    plan: PlanContext,
    row: dict[str, Any],
    lane: int,
    rule_checker: Any,
    base_errors: list[str],
    base_warnings: list[str],
) -> bool:
    try:
        result = rule_checker.evaluate(_payload(plan, _trial_course(row, lane)))
    except Exception:
        logger.exception("rule checker could not judge candidate %r", row.get("code"))
        return False

    if result.ok:
        return True
    new_errors = [e for e in (result.errors or []) if e not in base_errors]
    new_warnings = [w for w in (result.stats.get("warnings", []) or []) if w not in base_warnings]
    return not new_errors and not new_warnings
