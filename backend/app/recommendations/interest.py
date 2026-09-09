"""Recommending by stated interest.

Listed topic, description hit and partial word overlap are weighted 1.5/0.8/0.4,
normalised by the number of interests named.
"""
from __future__ import annotations

import re
from typing import Iterable

from .context import Course, PlanContext
from .strategy import Suggestion

_ANY_WORD = re.compile(r"\b\w+\b")

# How much of a multi-word interest must appear before the course counts as covering it.
_PARTIAL_MATCH_SHARE = 0.5


class InterestStrategy:
    name = "interest"

    def suggest(self, plan: PlanContext, candidate: Course) -> Iterable[Suggestion]:
        if not plan.interests:
            return

        meta = candidate.meta
        matched_skills = meta.skills & plan.interests
        matched_desc = {i for i in plan.interests if i in meta.raw_desc}

        partial: set[str] = set()
        for interest in plan.interests:
            words = {w for w in _ANY_WORD.findall(interest) if len(w) > 3}
            if words and len(words & meta.keywords) >= len(words) * _PARTIAL_MATCH_SHARE:
                partial.add(interest)

        if not (matched_skills or matched_desc or partial):
            return

        score = (
            len(matched_skills) * 1.5 + len(matched_desc) * 0.8 + len(partial) * 0.4
        ) / max(1, len(plan.interests))
        score = min(1.0, max(0.4, score))

        # Sorted before slicing: set iteration order varies per process, and this
        # text reaches the student.
        parts = []
        if matched_skills:
            parts.append(f"focuses on {', '.join(sorted(matched_skills)[:3])}")
        elif matched_desc or partial:
            everything = matched_skills | matched_desc | partial
            parts.append(f"covers topics related to {', '.join(sorted(everything)[:2])}")

        yield Suggestion(score, "Matches your interests: " + " and ".join(parts))
