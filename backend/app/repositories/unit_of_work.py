"""The unit of work: a connection or transaction with every repository bound to it.

`UnitOfWork` is the protocol services depend on, so tests can stub it.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator, Protocol

import asyncpg

from ..infrastructure.database import Database
from .catalog import CatalogRepository
from .planner_state import PlannerStateRepository
from .profiles import CourseTermOverrideRepository, ProfileRepository
from .users import SessionRepository, UserRepository


class UnitOfWork(Protocol):
    users: UserRepository
    sessions: SessionRepository
    planner_state: PlannerStateRepository
    catalog: CatalogRepository
    profiles: ProfileRepository
    course_term_overrides: CourseTermOverrideRepository


class PostgresUnitOfWork:
    def __init__(self, connection: asyncpg.Connection) -> None:
        self.users = UserRepository(connection)
        self.sessions = SessionRepository(connection)
        self.planner_state = PlannerStateRepository(connection)
        self.catalog = CatalogRepository(connection)
        self.profiles = ProfileRepository(connection)
        self.course_term_overrides = CourseTermOverrideRepository(connection)


class UnitOfWorkFactory:
    """Opens units of work against a database."""

    def __init__(self, database: Database) -> None:
        self._database = database

    @asynccontextmanager
    async def read(self) -> AsyncIterator[UnitOfWork]:
        async with self._database.connection() as connection:
            yield PostgresUnitOfWork(connection)

    @asynccontextmanager
    async def write(self) -> AsyncIterator[UnitOfWork]:
        """A unit of work whose statements commit together."""
        async with self._database.transaction() as connection:
            yield PostgresUnitOfWork(connection)
