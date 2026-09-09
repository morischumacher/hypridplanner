"""Recommending by the catalogue's curated similarity links, read backwards from
the student's history. The score is fixed and high because the links are hand-written.
"""
from __future__ import annotations

from typing import Iterable

from .context import Course, PlanContext
from .strategy import Suggestion

_CURATED_SCORE = 0.85


class SimilarityStrategy:
    name = "similarity"

    def suggest(self, plan: PlanContext, candidate: Course) -> Iterable[Suggestion]:
        for taken in plan.history:
            for link in taken.meta.similar_courses:
                if link["code"] == candidate.code:
                    yield Suggestion(
                        _CURATED_SCORE,
                        f"similar to {taken.name} ({link['evidence']})",
                    )
                    break
