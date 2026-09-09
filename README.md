# Study Planner

A degree planning tool for TU Wien Informatics students. Courses are dragged from
the catalogue into semester lanes, and a compliance engine reports after every
change what the curriculum still requires, what exceeds the workload limits, and
what cannot be placed yet. Two programmes are supported: the Bachelor in
Informatics (033 521) and the Master in Software Engineering (066 937).

This repository is the software artefact of a diploma thesis. `userstudy/` holds
the guide application used to run the evaluation sessions.

## Requirements

- Node 20 or newer (Node 22 for the unit tests; jsdom requires it)
- Python 3.11 or newer
- PostgreSQL 16, or Docker

## Installation

```bash
# database, migrated and seeded with both curricula
eval "$(./scripts/dev-db.sh up)"

# API on :8000
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload

# interface on :5173
cd frontend && npm install && npm run dev
```

`scripts/dev-db.sh` also takes `down`, `reset`, `psql` and `url`.
`backend/docker-compose.yml` starts the database and the API together.

## Usage

Open `http://localhost:5173`, create an account, and pick a programme in the
setup dialogue. The Table View places courses into semester lanes; the Graph View
shows the same curriculum as a containment hierarchy with a prerequisite overlay.
The Dashboard reports compliance after every change.

The study guide is a static page. Serve `userstudy/` with any web server; set
`RESULTS_SAVE_ENDPOINT` and `TUTORIAL_VIDEO_URL` in the environment to enable
result submission and the tutorial video (see `userstudy/.env.example`).

## Tests

```bash
cd backend  && pytest
cd frontend && npm test
cd frontend && npm run typecheck
cd frontend && npm run test:e2e     # starts both servers itself
```

The backend suite includes golden masters for the rule engine and the
recommender: recorded scenarios compared field by field, so a change that alters
an answer fails against the recording. Regenerating a recording is deliberate.
Contract tests pin every endpoint's status code and response shape.

For end-to-end runs against an existing Chromium, set `E2E_CHROMIUM_PATH`.

## Layout

```
backend/
  app/api/              HTTP handlers, one service call each
  app/services/         use cases
  app/repositories/     SQL, behind a unit of work
  app/domain/           model and error types
  app/rules/            compliance checking, one rule set per programme
  app/curriculum/       the regulations, as data
  app/recommendations/  six channels behind a strategy protocol
  app/infrastructure/   connection pool and migration ledger
  sql/                  migrations, YYYYMMDDHHMM_slug.sql
  tests/                golden masters, contract, curriculum, migration tests
frontend/
  src/domain/           plan reducer, term rules, layout, filters (no React)
  src/features/         profile, dashboard, catalogue, recommendations, tour,
                        rule-check, prefill, planner-board
  src/components/       shared presentational components
  tests/unit/           the domain layer
  tests/e2e/            Playwright flows
userstudy/              the study guide application
docs/                   architecture, deployment, defect register, thesis map
```
