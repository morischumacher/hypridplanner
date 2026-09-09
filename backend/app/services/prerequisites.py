"""The curriculum's prerequisite relations between two named courses.

The compliance engine already enforces these relations, and since the curriculum
was separated from the rule engine they live as data in `app/curriculum`. This
module does not hold a second copy of them. It reads the same documents the
checkers read and shapes them into the source-target pairs a view can draw, so
the engine and the graph cannot disagree about what the curriculum says.

`kind` says what the relation costs a student who ignores it:

    "hard" the relation is enforced. Planning the target first is rejected.
    "soft" the relation is advisory and the engine knows it. Planning the target
           first is permitted and produces a warning.

The two are served together, and the graph tells them apart by drawing them
differently, so an edge states not only that an ordering exists but whether it
binds. The split falls between the programmes rather than within them: the
Master's two are enforced, the Bachelor's two are advisory.

The curricula state one further kind of ordering, the expected prior knowledge a
module names ("Erwartete Vorkenntnisse"). It carries no consequence in the
compliance engine and is not served here, because an edge with no consequence
would be the one edge on the canvas a student could not act on.

The numbers are small and the smallness is the point: what the curricula mostly
encode are eligibility gates, the introductory phase (StEOP) and the
core-before-elective condition inside a focus area, which are conditions on a
plan rather than edges between two courses, and which the compliance engine
reports separately.
"""
from __future__ import annotations

from typing import Any

from ..curriculum import BACHELOR, MASTER, load

BACHELOR_PROGRAM_CODE = BACHELOR.replace(" ", "")
MASTER_PROGRAM_CODE = MASTER.replace(" ", "")

_BY_NORMALISED_CODE = {BACHELOR_PROGRAM_CODE: BACHELOR, MASTER_PROGRAM_CODE: MASTER}

# The master curriculum accepts the catalogue's abbreviations as aliases of the
# written-out names, because a plan may carry either. They name the same two
# relations, so they are not drawn a second time.
_MASTER_EDGE_ALIASES = {"FOE", "SDS"}


def normalise_program_code(value: str | None) -> str:
    return (value or "").strip().replace(" ", "")


def prerequisite_relations(program_code: str | None) -> list[dict[str, str]]:
    """Every prerequisite relation of one programme, as source -> target pairs.

    The source is the course that is expected first. Returns an empty list for a
    programme that encodes none, which is a real answer rather than a missing one.
    """
    code = _BY_NORMALISED_CODE.get(normalise_program_code(program_code))
    if code is None:
        return []

    curriculum = load(code)
    relations: list[dict[str, str]] = []

    for source, target in _entry(curriculum, "soft_prereqs", ()):
        relations.append({"source": source, "target": target, "kind": "soft"})

    for target, sources in _entry(curriculum, "prerequisites", {}).items():
        if target in _MASTER_EDGE_ALIASES:
            continue
        for source in sources:
            relations.append({"source": source, "target": target, "kind": "hard"})

    return relations


def _entry(curriculum: Any, name: str, default: Any) -> Any:
    """One curriculum entry, or `default` for a programme that does not carry it."""
    return getattr(curriculum, name, default)
