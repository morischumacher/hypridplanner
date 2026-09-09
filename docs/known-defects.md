# Known defects

Two lists. The first is what the evaluation study found, coded against a
usability codebook and rated on Nielsen's severity scale. The second is what
reading the code found afterwards, and is mostly invisible to a user.

A fix that quietly changes an answer the thesis reports makes the thesis wrong,
so each closed defect carries a test that reproduces the failure first.

## From the evaluation study

Severity is 0 to 4 in the usual scale; frequency is the participants for whom the
problem could be decided. Full definitions and the per-participant matrix are in
the thesis appendix.

| Code | Problem | Sev. | Freq. | Status |
|------|---------|:----:|:-----:|--------|
| E-P04 | Table and catalogue lack the graph's filters | 3 | 11/11 | Open |
| E-P05 | Reason for a refused placement not legible | 2 | 11/11 | Open |
| E-P10 | Requirement status behind collapsible panels | 2 | 11/11 | Open |
| E-P29 | Winter and summer offering not glanceable | 3 | 11/11 | Closed |
| E-P09 | Setup defaults to the wrong programme | 1 | 11/11 | Closed |
| E-P32 | Workload warning driven by the profile, not the task band | 2 | 11/11 | Open |
| E-P25 | Reduced-load semester has no affordance | 2 | 11/11 | Open |
| E-P26 | Workload band not enforced | 3 | 11/11 | Open |
| E-P34 | Completion signalled over an incomplete constraint set | 3 | 11/11 | Open |
| E-P53 | Placement menus omit and invent semesters | 2 | 11/11 | Open |
| E-P57 | Workload target ignores the task band | 3 | 11/11 | Open |
| E-P38 | Parking silently removed from totals and counts | 2 | 10/11 | Open |
| E-P35 | Lower workload bound only advisory | 2 | 10/11 | Open |
| E-P27 | Study wording leaks into the profile UI | 1 | 10/11 | Closed |
| E-P47 | Graph carries no semester dimension | 3 | 10/10 | Open |
| E-P48 | Module ECTS selector rewrites the plan total | 3 | 10/10 | Open |
| E-P17 | Adding a reduced-load semester not discoverable | 1 | 9/11 | Open |
| E-P14 | Onboarding tour drives the early session | 1 | 9/11 | Open |
| E-P37 | Parking stage not visible inside the graph | 2 | 9/11 | Open |
| E-P50 | Toast semantics unreliable | 2 | 9/9 | Closed |
| E-P02 | Totals and remaining ECTS not glanceable | 2 | 8/11 | Open |
| E-P49 | Dashboard contradicts itself on a focus area's completion | 3 | 8/8 | Open |
| E-P03 | Requirement status stated only in prose | 2 | 7/11 | Open |
| E-P16 | Retuning the cap destabilises the plan | 3 | 7/11 | Open |
| E-P11 | Recommendation Panel occludes the semester lanes | 1 | 6/11 | Open |
| E-P54 | Milestone percentage contradicts its own ECTS figures | 2 | 6/10 | Closed |
| E-P01 | Curriculum and elective terminology unclear | 3 | 4/11 | Open |
| E-P44 | Recommended ordering not shown at the point of placement | 2 | 4/11 | Open |
| E-P42 | Recommendation tabs render a bare empty state | 1 | 4/11 | Closed |
| E-P68 | Recommendation provenance is opaque | 2 | 4/9 | Open |
| E-P41 | Sign-up returns the raw server error | 1 | 1/11 | Closed |
| E-P13 | Negative "Disable Graph View" checkbox easy to misread | 1 | 1/11 | Closed |

Two of these cut across the whole loop rather than sitting at one stage. The
account setup defaulted to the wrong degree programme for every participant
(E-P09), and rejection and confirmation banners shared one visual style, so their
meaning was not recoverable from their appearance (E-P50 and E-P54; the code
recording banners as unambiguous stands at 0/11). Both are closed.

Seven are closed, each with a test that reproduces the observed failure before
the fix and passes after it: E-P29, E-P50, E-P42, E-P27, E-P54, E-P09 and E-P41,
and E-P13 went with E-P27 when the study-only interface option was removed. The
list here is the shortlist the thesis reports in its Table 7.6, extended with the
closed defects that sit below that table's threshold; the full codebook is the
thesis appendix. Severities and frequencies follow the appendix, which is the
authority, so where this file disagreed with it the appendix won.

E-P44 stays open. The graph now draws the curriculum's advisory orderings beside
the enforced ones, but the code names the point of placement, and the graph is
not where placement happens.

## Found by reading the code

Open items only. Each names the file it lives in.

**Recommendations**

- Where several finished courses justify the same candidate, which of them supplies the evidence string depends on set iteration order. `sequence.py` and `completed.py` are settled; the same pattern is latent elsewhere in the class. `backend/app/recommendations/`.

**Curriculum data**

- Six bachelor courses (AM, AVP, CMUS, CMP, FP, LPC) map to a module that was never defined, so their module kind falls back to a default. Pinned by `backend/tests/curriculum/test_curriculum_documents.py` rather than fixed.
- `steop_mandatory_lv_keys` is loaded from the curriculum document and never read. The checker recognises the three compulsory introductory-phase courses from titles and codes in `_steop_mandatory_tag` instead.

**Display**

- An explicit teaching format on a drag payload is ignored: the drop handler writes `type`, the placement function reads `courseType`, so the format is always re-derived from the catalogue. `frontend/src/features/planner-board/`.
- The introductory-phase and focus checklists share one expanded flag across both dashboard tabs, so a checklist opened on the planned tab is open on the done tab. `frontend/src/features/dashboard/`.

**Duplicated and stale feedback**

- The same category warning can appear twice, because the pre-phase check re-derives the canonical category for courses the totals pass already processed. It is in the recorded snapshots, so it is pinned behaviour. `backend/app/rules/bachelor.py`.
- Checks skip inconsistently after an error: the semester-load check returns early when an error already exists, everything after it runs regardless, so a plan with a missing course code loses its overload report. `backend/app/rules/bachelor.py`.
- A refused recommendation toggle stays switched. The write is optimistic and the mirror is not restored on failure, so the switch is wrong until the profile is fetched again. `frontend/src/features/recommendations/`.

**Fixed while finalising**

- The master's prerequisite overlay drew nothing. The curriculum states each relation twice, written out and as course codes, and only the written-out form was served; the catalogue titles those three courses in German, so neither endpoint resolved. Both forms are served now and the caller drops the duplicate. Covered end to end.

**Latent**

- The graph filter engine's ancestor walk keeps no visited set and would loop for ever on a cycle. Unreachable from the current graph builder. `frontend/src/domain/filters.ts`.

**Bearing on the evaluation**

Two of the six recommendation channels could not fire against real data during the study: the hand-written knowledge graph named courses that exist in neither catalogue. Four channels were live in the sessions, not six. Both are serviceable now, but no participant saw them in that state.
