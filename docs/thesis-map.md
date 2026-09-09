# Thesis features to code

The thesis derives thirteen features from a formative interview study. This table
gives the primary implementation of each, not an exhaustive list of every file a
feature touches.

| # | Feature | Where it lives |
|---|---------|----------------|
| 001 | Unified Data and Tool Integration | `backend/app/repositories/catalog.py`, `backend/app/api/catalog.py`, `frontend/src/features/catalogue/` |
| 002 | Multi-Level Roadmap and Progress Dashboard | `frontend/src/features/dashboard/`, `metrics.ts` computes the roadmap, `PlannedSections.tsx` and `DoneSections.tsx` render it |
| 003 | Curriculum Rules and Compliance Engine | `backend/app/rules/`, `backend/app/curriculum/*.json`, `frontend/src/features/rule-check/` |
| 004 | Graph-to-Table Planning Workflow | `frontend/src/features/planner-board/` (the table), `frontend/src/components/CurriculumGraphView.jsx` (the graph), `frontend/src/domain/filters.ts` |
| 005 | Feasibility Planning: capacity, workload mix, readiness | `backend/app/rules/payload.py` and the semester-load checks in `bachelor.py` / `master.py`; `frontend/src/features/dashboard/metrics.ts` for the per-semester credit and week-hour rows |
| 006 | Onboarding and Guided Planning Transition | `frontend/src/features/tour/`, `frontend/src/components/OnboardingTour.jsx`, `frontend/src/features/prefill/` |
| 007 | Evidence-Based, Explainable Recommendation Support | `backend/app/recommendations/`, each channel writes the sentence the student reads, and the engine settles which one gets to speak |
| 008 | Constraint-Aware Replanning and Disruption Handling | `frontend/src/features/planner-board/useTermAutoShift.ts` (relocating courses when the start term moves), `useCoursePlacement.ts` (the parking stage) |
| 009 | Overwhelm-Safe Browsing: filters and abstraction | `frontend/src/domain/filters.ts`, `frontend/src/components/Sidebar.jsx` |
| 010 | Graph Interpretability: purpose, legend, layout modes | `frontend/src/components/VisualLegend.jsx`, `frontend/src/features/planner-board/LayoutSemanticsPill.tsx` |
| 011 | Motivating Visual UI and Emotional Load Reduction | `frontend/src/features/dashboard/KpiProgressBar.tsx`, the progress-milestone path in `frontend/src/features/rule-check/useRuleCheckFeedback.ts` |
| 012 | Recommendation Presentation UX: annotate, do not break layout | `frontend/src/components/RecommendationPanel.jsx`, `renderRecommendationPatch` in `frontend/src/utils/courseVisuals.js` |
| 013 | Spatial Organisation and Grouping Controls | `frontend/src/components/ModuleGroupBackground.jsx`, the module-group handling in `frontend/src/features/planner-board/useCoursePlacement.ts`, free vertical placement in `frontend/src/domain/nodes.ts` |

## Evaluation in the tests

The end-to-end flows in `frontend/tests/e2e/` follow the loop the study observed,
and their comments name the finding each one comes from. `planning.spec.js`
covers placement, refusal, parking and the checklist; `editing.spec.js` covers
moving a course between semesters and the asynchronous rollback when the rule
engine refuses.

The golden masters in `backend/tests/golden/` record the answers the thesis
reports, so a later change cannot alter them unnoticed.

## Gaps between the thesis and the code

- **Feature 007.** The knowledge graph in `backend/app/recommendations/knowledge.py`
  is a prototype fixture. None of its course codes exist in either catalogue, so
  against real data the `sequence` and `completed` channels never fire. Four of
  the six channels were live during the evaluation, not six.
- **Feature 003.** Six bachelor courses map to a module that is not defined in
  the curriculum data, so their module kind falls back to a default. This is
  pinned by a test rather than fixed, so the behaviour the study observed is
  preserved.
