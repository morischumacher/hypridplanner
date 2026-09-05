# 0003. The frontend moves to TypeScript in full

**Status:** Accepted · 2026-08-28

## Context

The frontend's central data structure is a plan: semesters holding courses, each
with a status, a term availability, a credit weight and a category. That
structure is passed through dozens of functions, and a language that does not
state its shape leaves the shape to be inferred from reading the implementation,
which is how the first attempt at unit tests for the filter engine failed six
times over.

## Decision

Migrate everything to TypeScript, not only the new code.

The migration runs incrementally with `allowJs` enabled, so the build stays
green while files move one at a time. The domain layer is typed first, because
that is where the types carry the most information, and the components follow.

A partial migration was the alternative: types for the domain layer, JSDoc for
the rest. It was rejected because the seam would be visible in the repository
and would invite exactly the question it was meant to avoid.

## Consequences

The plan structure is stated rather than implied, and the compiler catches the
class of error that is otherwise found late: a field renamed in one place and
read under the old name somewhere else.

The cost is time. It is affordable because the characterisation tests exist: a
type migration is mechanical, and a mechanical change is safe exactly when there
is something to verify it against.
