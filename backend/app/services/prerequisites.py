"""The curriculum's enforced prerequisite relations, read from the curriculum itself.

The compliance engine already enforces these relations, and since the curriculum
was separated from the rule engine they live as data in `app/curriculum`. This
module does not hold a second copy of them. It reads the same documents the
checkers read and shapes them into the source-target pairs a view can draw, so
the engine and the graph cannot disagree about what the curriculum says.

Only the enforced relations are served, and `kind` is always "hard": planning the
target before the source is rejected. An edge drawn from this list therefore
carries one meaning, and a student never has to ask of a given edge whether it
binds. The advisory orderings the bachelor checker warns on, and the expected
prior knowledge the curricula state per module, are not edges here; they reach
the student through the Dashboard, where they are stated with their consequence.

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

    for target, sources in _entry(curriculum, "prerequisites", {}).items():
        if target in _MASTER_EDGE_ALIASES:
            continue
        for source in sources:
            relations.append({"source": source, "target": target, "kind": "hard"})

    return relations


def _entry(curriculum: Any, name: str, default: Any) -> Any:
    """One curriculum entry, or `default` for a programme that does not carry it."""
    return getattr(curriculum, name, default)
