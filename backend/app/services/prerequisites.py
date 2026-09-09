"""The curriculum's prerequisite relations between two named courses.

Read from the same documents in `app/curriculum` the rule checkers read, so the
engine and the graph cannot disagree. `kind` is "hard" when planning the target
first is rejected and "soft" when it is only warned about. Expected prior
knowledge ("Erwartete Vorkenntnisse") carries no consequence in the engine and
is not served here.
"""
from __future__ import annotations

from typing import Any

from ..curriculum import BACHELOR, MASTER, load

BACHELOR_PROGRAM_CODE = BACHELOR.replace(" ", "")
MASTER_PROGRAM_CODE = MASTER.replace(" ", "")

_BY_NORMALISED_CODE = {BACHELOR_PROGRAM_CODE: BACHELOR, MASTER_PROGRAM_CODE: MASTER}


def normalise_program_code(value: str | None) -> str:
    return (value or "").strip().replace(" ", "")


def prerequisite_relations(program_code: str | None) -> list[dict[str, str]]:
    """Every prerequisite relation of one programme, as source -> target pairs.

    The source is the course expected first. Empty for a programme encoding none.
    """
    code = _BY_NORMALISED_CODE.get(normalise_program_code(program_code))
    if code is None:
        return []

    curriculum = load(code)
    relations: list[dict[str, str]] = []

    for source, target in _entry(curriculum, "soft_prereqs", ()):
        relations.append({"source": source, "target": target, "kind": "soft"})

    # The master curriculum states each relation twice, written out and as course
    # codes, because a plan may carry either. Both forms are served: only the one
    # matching the catalogue resolves to a node pair, and the caller drops the
    # duplicate when both do.
    for target, sources in _entry(curriculum, "prerequisites", {}).items():
        for source in sources:
            relations.append({"source": source, "target": target, "kind": "hard"})

    return relations


def _entry(curriculum: Any, name: str, default: Any) -> Any:
    return getattr(curriculum, name, default)
