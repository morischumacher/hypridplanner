# 0002. The curriculum is data; the rule engine is code

**Status:** Accepted · 2026-08-28

## Context

Compliance checking is one class per programme, and the two are not variants of
one another: measured line by line they share four per cent of their text. Two
properties have to be kept apart in both: *what the curriculum says* (which
modules exist, how many credits each needs, what depends on what), which is data
that changes when the university publishes new regulations, and *what a rule
does* (compare planned credits against a ceiling, look for a prerequisite in an
earlier semester), which is code that almost never changes.

## Decision

Separate them.

- **`app/curriculum/`** holds each programme's regulations as data, loaded and
  validated at startup. Adding a programme, or tracking a curriculum revision,
  becomes an editing task rather than a programming task.
- **`app/rules/`** holds the engine. A rule is a small object with one method,
  taking a plan and the curriculum and returning verdicts. The engine runs a
  rule set and assembles the result.

The two programmes keep their own rule sets, and this is deliberate. The
bachelor curriculum has an introductory-phase gate with no counterpart in the
master programme, and the master programme has a focus-area dependency structure
with no counterpart in the bachelor. Forcing both through one pipeline would
mean encoding each programme's exceptions as conditionals inside shared rules,
which is the shape this decision exists to avoid.

What the two share, then, is smaller than it first appears, and worth stating
exactly: the wire format, the result shape, the single entry point, the shape of
a rule set, and the reading of the per-semester credit limits. Not the rules.
Not even the normalisation of a title, because the bachelor programme's titles
are German and have to be accent-folded before they can be matched. Both files
are organised the same way and read as siblings, which is the property that
actually helps a reader; a shared base class asserting more commonality than
exists would not.

## Consequences

Each rule is independently testable, and a violation can be traced to one named
rule. The risk in any change to the engine is that it answers differently. That
is what the golden master in `backend/tests/golden/` exists to prevent: recorded
scenarios, compared exactly, that must produce byte-identical verdicts before and
after a change. Any difference is a defect unless it is a defect being fixed
deliberately, in which case the snapshot is regenerated in its own commit.
