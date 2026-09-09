/**
 * The dashboard: persisted panel state, the figures displayed, and the panel.
 *
 * Call the panel hook before the metrics: which figures are computed depends on
 * which half of the dashboard is showing, which is panel state.
 */

export { default as PlannerDashboard } from "./PlannerDashboard.tsx";
export type { PlannerDashboardProps } from "./PlannerDashboard.tsx";
export { computeDashboardMetrics } from "./metrics.ts";
export type {
    DashboardCourse,
    DashboardMetrics,
    DashboardMetricsInput,
    DashboardStickyViolation,
    FocusChecklistItem,
    FocusChooseSummary,
    ModuleProgressRow,
} from "./metrics.ts";
export { useDashboardPanels, useEmptySectionAutoClose } from "./useDashboardPanels.ts";
export type {
    DashboardPanels,
    DashboardUiGlobalSnapshot,
    DashboardUiSnapshot,
    DashboardViewMode,
    StoredDashboardUi,
    UseDashboardPanelsInput,
} from "./useDashboardPanels.ts";
export type {
    DashboardLaneInsights,
    DashboardSectionOrdering,
    MissingGradeRow,
    SemesterGradeRow,
    SemesterHoursRow,
} from "./types.ts";
