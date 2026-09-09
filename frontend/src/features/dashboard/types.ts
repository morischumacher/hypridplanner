/**
 * Types passed between the dashboard's own modules.
 *
 * `DashboardLaneInsights` is the one bundle not derived from the rule check; it
 * comes from per-course metadata the planner already aggregates per semester.
 */

import type { CSSProperties, DragEvent } from "react";

/** The drag-to-reorder wiring returned by `useDashboardSectionOrdering`. */
export interface DashboardSectionOrdering {
    handlePlannedSectionDragStart: (key: string) => void;
    handlePlannedSectionDragOver: (event: DragEvent<HTMLElement>, key: string) => void;
    handlePlannedSectionDrop: (key: string) => void;
    handlePlannedSectionDragEnd: () => void;
    handleDoneSectionDragStart: (key: string) => void;
    handleDoneSectionDragOver: (event: DragEvent<HTMLElement>, key: string) => void;
    handleDoneSectionDrop: (key: string) => void;
    handleDoneSectionDragEnd: () => void;
    plannedSectionStyle: (key: string, base?: CSSProperties) => CSSProperties;
    doneSectionStyle: (key: string, base?: CSSProperties) => CSSProperties;
}

/** One semester's estimated weekly hours; semesters with none are omitted. */
export interface SemesterHoursRow {
    sem: number;
    hours: number;
}

/** One semester's ECTS-weighted grade average. */
export interface SemesterGradeRow {
    sem: number;
    grade: number;
}

/** The done courses of one semester that carry no grade yet. */
export interface MissingGradeRow {
    sem: number;
    missingCourses: readonly { code: string; name: string }[];
}

export interface DashboardLaneInsights {
    plannedEstimatedHoursPerSemesterRows: readonly SemesterHoursRow[];
    plannedEstimatedHoursAverage: number;
    plannedWeekHoursWithinDesiredWorkload: boolean;
    recommendedWeekHoursPerSemester: number;
    maxWeekHoursForScale: number;
    doneGradePerSemesterRows: readonly SemesterGradeRow[];
    doneGradeOverall: number | null;
    missingDoneGradesBySemester: readonly MissingGradeRow[];
    missingDoneGradesCount: number;
}
