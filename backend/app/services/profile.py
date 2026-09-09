"""The per-programme profile.

Programme and start term are locks rather than settings: the start term sets the
winter/summer parity of every lane, so moving it would invalidate placements.
The start term also creates the profile row, so saving interests before one
exists is refused rather than creating a half-formed profile.
"""
from __future__ import annotations

import json
from typing import Any

from ..domain.errors import (
    InvalidRequest,
    ProgrammeLocked,
    SetupIncomplete,
    StartTermLocked,
    StorageFailure,
)
from ..repositories import UnitOfWorkFactory

# The defaults differ: the settings screen has no peer channel to show, the
# recommender has one to run.
SETTINGS_TOGGLES = {
    "interest": True,
    "similarity": True,
    "sequence": True,
    "completed": True,
    "internship": True,
}
RECOMMENDER_TOGGLES = {**SETTINGS_TOGGLES, "peer": True}


def read_toggles(raw: Any, default: dict[str, bool]) -> dict[str, Any]:
    """Toggles come back as a dict or as JSON text, depending on the driver."""
    if raw is None:
        return default
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except ValueError:
            return default
    return default


def normalise_programme(value: Any) -> str:
    code = str(value or "").strip()
    if not code:
        raise InvalidRequest("program_code is required")
    return code


class ProfileService:
    def __init__(self, unit_of_work: UnitOfWorkFactory) -> None:
        self._unit_of_work = unit_of_work

    async def get(self, user_id: str, program_code: str) -> dict[str, Any]:
        code = normalise_programme(program_code)
        async with self._unit_of_work.read() as work:
            locked_programme = await work.profiles.first_programme(user_id)
            profile = await work.profiles.get(user_id, code)
            overrides = await work.course_term_overrides.list(user_id, code)

        return {
            "program_code": code,
            "start_term": (
                {"season": profile["season"], "year": profile["year"]} if profile else None
            ),
            "interests": (profile["interests"] if profile and profile["interests"] else []),
            "career_direction": profile["career_direction"] if profile else None,
            "recommendation_toggles": read_toggles(
                profile["recommendation_toggles"] if profile else None,
                dict(SETTINGS_TOGGLES),
            ),
            "start_term_locked": bool(profile),
            "locked_program_code": (
                str(locked_programme).strip()
                if locked_programme and str(locked_programme).strip()
                else None
            ),
            "course_term_overrides": {
                str(row["course_code"]).strip(): str(row["term_availability"]).strip().lower()
                for row in overrides
                if str(row["course_code"]).strip()
            },
        }

    async def set_start_term(
        self, user_id: str, program_code: str, season: str, year: int
    ) -> None:
        code = normalise_programme(program_code)
        async with self._unit_of_work.write() as work:
            # Taken before reading the lock, so two concurrent first-time setups
            # cannot both see an unlocked account.
            await work.users.lock(user_id)

            locked = await work.profiles.first_programme(user_id)
            if locked and str(locked).strip() and str(locked).strip() != code:
                raise ProgrammeLocked(
                    f"Study program is locked to {str(locked).strip()} after initial setup."
                )

            if await work.profiles.create_start_term(user_id, code, season, year):
                return

            existing = await work.profiles.get_start_term(user_id, code)
            if not existing:
                raise StorageFailure("Could not persist start semester.")

            unchanged = (
                str(existing["season"]).strip().lower() == str(season).strip().lower()
                and int(existing["year"]) == int(year)
            )
            if not unchanged:
                raise StartTermLocked("Start semester is locked after first setup.")

    async def set_course_terms(
        self, user_id: str, program_code: str, updates: list[dict[str, str]]
    ) -> int:
        code = normalise_programme(program_code)
        if not updates:
            return 0
        async with self._unit_of_work.write() as work:
            for update in updates:
                course_code = str(update.get("course_code") or "").strip()
                if not course_code:
                    continue
                await work.course_term_overrides.upsert(
                    user_id, code, course_code, update["term_availability"]
                )
        # Counts what was asked for, not what was written, as the endpoint has
        # always reported.
        return len(updates)

    async def set_recommendation_profile(
        self,
        user_id: str,
        program_code: str,
        interests: list[str],
        career_direction: str | None,
        toggles: dict[str, Any],
    ) -> None:
        code = normalise_programme(program_code)
        async with self._unit_of_work.write() as work:
            updated = await work.profiles.update_recommendation_profile(
                user_id, code, interests, career_direction, toggles
            )
        if not updated:
            raise SetupIncomplete(
                "Please complete initial setup (start semester) before saving profile."
            )

    async def recommendation_inputs(
        self, user_id: str, program_code: str
    ) -> tuple[list[str], str, dict[str, Any]]:
        """Interests, career direction and channel toggles, with defaults filled in."""
        async with self._unit_of_work.read() as work:
            profile = await work.profiles.get_recommendation_inputs(user_id, program_code)
        if not profile:
            return [], "", dict(RECOMMENDER_TOGGLES)
        return (
            profile["interests"] or [],
            profile["career_direction"] or "",
            read_toggles(profile["recommendation_toggles"], dict(RECOMMENDER_TOGGLES)),
        )
