"""The parts of a rule-check payload that mean the same thing to both programmes.

There is little of it: the two curricula share the wire format and not much else,
so anything programme-specific stays with the checker that owns it.
"""
from __future__ import annotations

from typing import Any, Tuple


def resolve_semester_load_limits(
    payload: dict[str, Any], default_max: float, default_recommended: float
) -> Tuple[float, float]:
    """The per-semester credit ceiling and recommended load for this request.

    The payload wins over the curriculum defaults, since a student may change
    both. A malformed limit falls back rather than making the plan uncheckable,
    and the recommended load is capped at the ceiling to avoid a warning on
    every plan.
    """
    try:
        max_ects = float(payload.get("maxEctsPerSemester"))
    except (TypeError, ValueError):
        max_ects = default_max
    try:
        recommended_ects = float(payload.get("recommendedEctsPerSemester"))
    except (TypeError, ValueError):
        recommended_ects = default_recommended

    if max_ects <= 0:
        max_ects = default_max
    if recommended_ects <= 0:
        recommended_ects = default_recommended
    if recommended_ects > max_ects:
        recommended_ects = max_ects
    return max_ects, recommended_ects
