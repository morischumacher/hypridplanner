"""Schema migrations, forward-only.

A migration is a SQL file named `YYYYMMDDHHMM_slug.sql`, so lexical order is
chronological and parallel work cannot collide on an identifier. Each applied file
is recorded with a checksum, and later edits are reported as drift.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

import asyncpg

# Creates the ledger and remaps the old sequential filenames. Not a migration,
# and deliberately not matched by the *.sql scan below.
LEDGER = "_ledger.psql"


class MigrationDrift(RuntimeError):
    """An already-applied migration no longer matches the file on disk."""


def checksum(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def migrations_directory(configured: str) -> str:
    """Resolve the migrations directory relative to the backend package root."""
    if os.path.isabs(configured):
        return configured
    return str(Path(__file__).resolve().parents[2] / configured)


async def _verify(
    connection: asyncpg.Connection, applied: dict[str, str | None], files: dict[str, str]
) -> None:
    """Compare recorded checksums against the files, backfilling missing ones.

    Rows written before checksums existed have none; those take what is on disk.
    """
    drifted = []
    for name, recorded in applied.items():
        current = files.get(name)
        if current is None:
            continue
        if recorded is None:
            await connection.execute(
                "UPDATE migration_history SET checksum = $2 WHERE filename = $1",
                name,
                current,
            )
        elif recorded != current:
            drifted.append(name)

    if drifted:
        raise MigrationDrift(
            "these migrations were applied and have since been edited: "
            + ", ".join(sorted(drifted))
        )


async def apply_pending(connection: asyncpg.Connection, directory: str) -> None:
    root = Path(directory)
    await connection.execute((root / LEDGER).read_text(encoding="utf-8"))

    paths = sorted(root.glob("*.sql"))
    files = {path.name: checksum(path.read_text(encoding="utf-8")) for path in paths}
    applied = {
        row["filename"]: row["checksum"]
        for row in await connection.fetch("SELECT filename, checksum FROM migration_history")
    }
    await _verify(connection, applied, files)

    pending = [path for path in paths if path.name not in applied]

    # Printed even when there is nothing to do, so a deployment log distinguishes
    # an already-current database from one whose migrations never ran.
    print(
        f"migrations: {len(applied & files.keys())} already applied, "
        f"{len(pending)} to apply"
    )

    for path in pending:
        try:
            # Files carry their own COMMIT statements, so each is executed whole
            # rather than split into statements.
            await connection.execute(path.read_text(encoding="utf-8"))
            await connection.execute(
                """
                INSERT INTO migration_history (filename, checksum)
                VALUES ($1, $2) ON CONFLICT DO NOTHING
                """,
                path.name,
                files[path.name],
            )
            print(f"✅ {path.name}")
        except Exception as error:  # noqa: BLE001 - reported, not fatal
            print(f"❌ {path.name}: {error}")
