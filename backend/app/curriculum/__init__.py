"""The curriculum as data: one JSON document per programme, beside this module.

JSON has no sets or tuples, and both matter here (membership tests, ordered prefix
matching), so they are stored as tagged objects and restored on load.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent

BACHELOR = "033 521"
MASTER = "066 937"

_FILENAMES = {BACHELOR: "bachelor.json", MASTER: "master.json"}


def _restore(value: Any) -> Any:
    if isinstance(value, dict):
        if "__set__" in value and len(value) == 1:
            return set(_restore(item) for item in value["__set__"])
        if "__tuple__" in value and len(value) == 1:
            return tuple(_restore(item) for item in value["__tuple__"])
        return {key: _restore(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_restore(item) for item in value]
    return value


@dataclass(frozen=True)
class Curriculum:
    """One programme's regulations."""

    program_code: str
    constants: dict[str, Any]
    data: dict[str, Any]

    def __getattr__(self, name: str) -> Any:
        """Read a curriculum entry as if it were an attribute."""
        try:
            return self.data[name]
        except KeyError:
            pass
        try:
            return self.constants[name]
        except KeyError as error:
            raise AttributeError(
                f"'{name}' is not part of the {self.program_code} curriculum"
            ) from error


@lru_cache(maxsize=None)
def load(program_code: str) -> Curriculum:
    """The curriculum for a programme code. Cached: the files never change at runtime."""
    try:
        filename = _FILENAMES[program_code]
    except KeyError as error:
        raise KeyError(f"no curriculum for programme '{program_code}'") from error

    document = json.loads((HERE / filename).read_text(encoding="utf-8"))
    return Curriculum(
        program_code=program_code,
        constants=document["constants"],
        data=_restore(document["data"]),
    )
