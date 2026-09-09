"""Loading and saving a plan.

The plan is one JSON document per user rather than a row per placed course: the
frontend owns its shape and rewrites it whole on every change.
"""
from __future__ import annotations

from typing import Any

from ..repositories import UnitOfWorkFactory


class PlannerService:
    def __init__(self, unit_of_work: UnitOfWorkFactory) -> None:
        self._unit_of_work = unit_of_work

    async def load(self, user_id: str) -> dict[str, Any]:
        async with self._unit_of_work.read() as work:
            return await work.planner_state.get(user_id)

    async def save(self, user_id: str, state: dict[str, Any]) -> None:
        async with self._unit_of_work.write() as work:
            await work.planner_state.save(user_id, state or {})
