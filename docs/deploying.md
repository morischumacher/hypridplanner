# Deploying

The tool runs as three hosted pieces: the client on Vercel, the API on Render,
and the database on Neon. They can be updated independently.

## Risks

**The database is the only piece that cannot be rolled back by redeploying.**
The API applies outstanding migrations on start-up, and an API that identifies
migrations by the time they were written renames, on its first start-up, the
ledger rows of a database that still records them by sequence number. That
rename is idempotent and re-runs nothing, but it writes to the database, and the
database holds the evaluation study's data.

**The client and the API must agree about the plan document.** The document is
stored whole, per user, and both sides read it. A client newer than its API is
usually fine, because the document's shape has not changed. That assumption is
checked by a test (`frontend/tests/unit/legacy-document.test.ts`) that reads a
document in exactly the form already stored for every participant.

## Running locally

Two setups are called running it locally; only the second rehearses a deployment.

### Against an empty database

```bash
eval "$(./scripts/dev-db.sh up)"             # Postgres, migrations, and DATABASE_URL

cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload                # :8000
```

and in a second terminal:

```bash
cd frontend && npm install && npm run dev    # :5173
```

Node 20 or newer runs the application. Node 22 is needed only to run the unit
tests, and the test command says so rather than failing inside a dependency.

`scripts/dev-db.sh` starts a container if Docker is running and a native cluster
otherwise, applies whatever is outstanding, and does nothing else. It is safe to
re-run. `./scripts/dev-db.sh reset` throws the database away and starts again.

Signing up, completing the setup and planning something shows that the stack
starts and the loop works. It says nothing about existing data, because there is
none.

### Against a copy of real data

Branch the production database in Neon, then point the same local stack at the
branch instead:

```bash
export DATABASE_URL="<the Neon branch connection string>"
cd backend && uvicorn app.main:app --reload
```

and the client, told where the API is:

```bash
cd frontend && VITE_API_BASE=http://127.0.0.1:8000 npm run dev
```

Signing in and opening an existing plan answers the one question the 364 tests
cannot: whether a saved plan, with its parked courses, its notes and its marks,
comes back unchanged. The tests run against a database built fresh from the
migrations; production holds real accounts.

`backend/docker-compose.yml` brings up the database and the API together. It
expects `backend/.env` to exist, so copy `backend/.env.example` to
`backend/.env` first; without it, Docker creates a directory of that name and the
API starts without its configuration.

## Deployment order

### 1. Branch the production database

Neon's point-in-time restore covers backup, but an unrestored backup is
untested. Create a branch of the production database and use that branch for
step 2. If step 2 fails, the branch carries the evidence and production was never
touched.

### 2. Run the new API locally against that branch

Set it up as described above, then watch the start-up output. It prints one line
before it does anything:

```
migrations: 11 already applied, 0 to apply
```

`0 to apply` means the ledger rename matched and nothing re-ran. A number other
than zero on a database that should already be current means the rename did not
match; stop and find the cause before touching production. A report that a
migration has been edited since it ran means the same.

### 3. Deploy the API before the client

A new client against an old API can ask for behaviour the API does not have. An
old client against a new API asks for what it always did, and gets it, because
the wire format is pinned by a contract test.

Deploy the API to Render, watch the same start-up output as in step 2, and check
that the tool still works from the currently deployed client before going on. The
interval of new API and old client is a valid state.

### 4. Deploy the client

Vercel builds a preview for every branch. Open the preview against the production
API and walk the planning loop once by hand before promoting it. The end-to-end
tests cover the same loop, but against an empty database.

## Rolling back

The client rolls back by promoting the previous Vercel deployment, which is
immediate.

The API rolls back by redeploying the previous commit. An older API against a
renamed ledger re-runs nothing, because it looks up migrations by filename and
finds no file matching the old names; it applies nothing. An older API therefore
cannot apply a migration until the rename is undone, which is one
`UPDATE migration_history SET filename = ...` away and recorded in
`backend/sql/_ledger.psql`.

The database does not roll back by redeploying anything, which is why step 1
exists.

## Configuration

No new environment variables. `DATABASE_URL` and `CORS_ORIGIN` are unchanged. The
migrations directory is resolved relative to the backend package rather than the
working directory, so the API starts correctly wherever it is launched from and
`MIGRATIONS_DIR` can stay unset.

The client is TypeScript, and the production build does not type-check; that
happens in CI.
