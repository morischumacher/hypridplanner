# 0006. Characterisation tests pin the evaluated behaviour

**Status:** Accepted · 2026-08-28

## Context

The application was evaluated with eleven students. The results of that study
are only meaningful if the system the thesis describes and the system that was
evaluated behave identically, so the code is constrained in an unusual way: its
behaviour may not change, except where a change fixes a defect the study itself
recorded, and then only deliberately.

An assertion written from the code's current reading is not enough for that,
because it tests what the author believes the code does. What is needed is a
recording of what it actually does.

## Decision

Record the behaviour and treat the recording as the specification. Three layers
of it:

- **A golden master for the rule engine.** Recorded scenarios covering both
  programmes, their verdicts recorded exactly and compared field by field. The
  corpus is guarded against degeneracy: if fewer than half the scenarios produce
  distinct answers, the build fails, because a corpus where every case returns
  the same rejection proves nothing.
- **A contract test for the HTTP surface.** Every endpoint's status code and
  response *shape* is recorded. Volatile values such as identifiers and
  timestamps are replaced by markers before comparison, so the assertion is
  about what a client depends on rather than about a particular run.
- **End-to-end tests over the observed flows.** The loop the study watched
  students perform, driven through a real browser against a real API and
  database.

## Consequences

Every commit has something to be wrong against. A change that alters a verdict,
a response shape or a flow fails immediately and names what it broke, rather
than surfacing later as a discrepancy between the thesis and the software.
Regenerating a recording is a deliberate act with its own commit, and the commit
message says which behaviour changed and why.
