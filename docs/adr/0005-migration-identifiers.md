# 0005. Migrations are timestamped and checksummed

**Status:** Accepted · 2026-08-28

## Context

Schema changes are plain SQL files applied in lexical order and recorded in a
`migration_history` table keyed by filename. Sequential numbers collide: two
branches both add the next one, and whichever merges second is silently
renumbered or silently skipped. And a ledger that records only that a filename
ran, not what it contained, lets a migration edited after it was applied leave
no trace anywhere.

## Decision

Identify a migration by the time it was written: `YYYYMMDDHHMM_slug.sql`. Two
people cannot produce the same identifier by accident, and lexical order remains
chronological order.

Record a checksum with each applied migration. On startup the ledger is verified
against the files on disk, and a mismatch is reported rather than ignored: an
already-applied migration whose content has changed means the database and the
repository disagree about the schema.

Migrations remain forward-only. There are no down-migrations, because a
down-migration that is never exercised is not a rollback path, it is an
untested claim.

Alembic was the alternative. It was rejected because the application uses
asyncpg directly rather than an ORM, and Alembic's value is largely in
autogenerating migrations from ORM models that do not exist here.

## Consequences

A one-time remap in `sql/_ledger.psql` rewrites `migration_history` rows that a
database still records under sequential names, so that databases already
carrying data, including the one holding the evaluation study's records, are not
re-migrated. The remap runs before the ledger check.
