"""The recommendation channel protocol.

A channel is asked about one candidate and answers with reasons, or nothing; the
engine decides which channel claims a course. Channels are built fresh per
evaluation, so per-plan setup can happen in the constructor.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Protocol, runtime_checkable

from .context import Course, PlanContext


@dataclass(frozen=True)
class Suggestion:
    """One channel's reason for putting one candidate forward."""

    score: float
    evidence: str


@runtime_checkable
class Strategy(Protocol):
    """A recommendation channel."""

    name: str

    def suggest(self, plan: PlanContext, candidate: Course) -> Iterable[Suggestion]:
        """The reasons this channel has for recommending `candidate`."""
        ...
