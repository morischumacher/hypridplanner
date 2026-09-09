/**
 * Planner state: one plan per programme, plus the last change made.
 *
 * The empty values below are shared singletons, not built on demand: an absent
 * plan is read on every render, and a fresh object each time would look like a
 * change to consumers that compare by identity.
 */

import type { GraphFilters } from "../filters.ts";
import { semesterBoundsForProgram } from "../terms.ts";
import type { CourseModuleMeta, Point } from "../types.ts";
import type { PlanDiff } from "./diff.ts";
import { emptyCoursesOnlyPlan } from "./semesters.ts";

/** The programme a fresh planner starts on. */
export const DEFAULT_PROGRAM_CODE = "066 937";

/**
 * A course as a plan stores it. Distinct from `PlannedCourse` in `../types.ts`,
 * which is prefill output and carries its own semester.
 */
export interface PlanCourse {
    id: string;
    code: string | null;
    name: string | null;
    /** Teaching format such as "VU". */
    type: string | null;
    ects: number | null;
    category: string;
    examSubject: string | null;
    position: Point;
    laneIndex: number;
    subjectColor: string | null;
    module: CourseModuleMeta | null;
}

/** A plan course plus the semester it is filed under. */
export interface PlanCourseInSemester extends PlanCourse {
    semesterId: number;
}

/** A plan: one-based semester numbers to the courses placed in them. */
export type CoursesBySemester = Record<number, PlanCourse[]>;

/** Per-course annotations. */
export interface CourseMeta {
    notes: string;
    /** Kept as a string so a half-typed number survives a re-render. */
    estimatedHours: string;
    /** Austrian grades run 1 to 5; anything above 5 is stored as "5". */
    grade: string;
}

export interface SemesterLoadLimits {
    maxEctsPerSemester: number;
    recommendedEctsPerSemester: number;
    maxWeekHoursPerSemester: number;
    recommendedWeekHoursPerSemester: number;
}

/** What the curriculum graph remembers between visits. */
export interface GraphViewState {
    collapsedIds: string[] | null;
    nodePosById: Record<string, Point>;
    filters: GraphFilters;
    /** Until set, the graph may pick programme-specific filter defaults. */
    filtersConfigured: boolean;
    /** Superseded by `nodePosById`; still present in stored plans. */
    nodeXById?: Record<string, number> | undefined;
}

/** Everything the planner holds for one programme. */
export interface ProgrammePlan {
    coursesBySemester: CoursesBySemester;
    doneCourseCodes: string[];
    parkedCourseCodes: string[];
    courseMetaByCode: Record<string, CourseMeta>;
    semesterNotes: Record<number, string>;
    selectedFocus: string;
    loadLimits: SemesterLoadLimits;
    graphView: GraphViewState;
}

export type PlanUpdatedChange = PlanDiff;

export interface CourseStatusChange {
    type: "course_status_toggled";
    courseCode: string;
    toStatus: "done" | "in_plan";
    laneIndex: number | null;
    semesterId: number | null;
    semesterNumber: number | null;
}

export interface CoursesStatusChange {
    type: "course_status_toggled";
    courseCodes: string[];
    toStatus: "done" | "in_plan";
}

export interface FocusChange {
    type: "focus_updated";
    selectedFocus: string | null;
}

export interface LoadLimitsChange extends SemesterLoadLimits {
    type: "semester_load_limits_updated";
}

/** A transition reported to the rule checker and the recommender. */
export type PlanChangeBody =
    | PlanUpdatedChange
    | CourseStatusChange
    | CoursesStatusChange
    | FocusChange
    | LoadLimitsChange;

/** A change with its identifier. The id marks identity and staleness, not time. */
export type PlanChange = PlanChangeBody & { id: number };

export interface PlannerState {
    programCode: string;
    byProgramme: Record<string, ProgrammePlan>;
    lastChange: PlanChange | null;
    /** Monotonic, and the source of every `lastChange.id`. */
    changeCounter: number;
}

export const EMPTY_DONE_CODES: string[] = [];
export const EMPTY_PARKED_CODES: string[] = [];
export const EMPTY_COURSE_META_BY_CODE: Record<string, CourseMeta> = {};
export const EMPTY_SEMESTER_NOTES: Record<number, string> = {};

export const DEFAULT_GRAPH_FILTERS: GraphFilters = {
    obligationTypes: [],
    ectsRange: null,
    courseTypes: [],
    examSubjects: [],
    progressStates: ["todo", "in_plan", "done"],
    termAvailabilities: ["summer", "winter", "both"],
};

export const EMPTY_GRAPH_VIEW_STATE: GraphViewState = {
    collapsedIds: null,
    nodePosById: {},
    filters: DEFAULT_GRAPH_FILTERS,
    filtersConfigured: false,
};

export const DEFAULT_SEMESTER_LOAD_LIMITS: SemesterLoadLimits = {
    maxEctsPerSemester: 42,
    recommendedEctsPerSemester: 30,
    maxWeekHoursPerSemester: 50,
    recommendedWeekHoursPerSemester: 40,
};

export const EMPTY_COURSE_META: CourseMeta = Object.freeze({
    notes: "",
    estimatedHours: "",
    grade: "",
});

const emptyPlansByMinCount = new Map<number, CoursesBySemester>();

/**
 * The empty plan, one shared instance per semester count so its identity
 * survives re-renders. Anything that fills a plan builds its own with
 * `emptyCoursesOnlyPlan`.
 */
export function sharedEmptyCoursesBySemester(minCount: number): CoursesBySemester {
    const existing = emptyPlansByMinCount.get(minCount);
    if (existing) return existing;
    const created = emptyCoursesOnlyPlan(minCount);
    emptyPlansByMinCount.set(minCount, created);
    return created;
}

/** A programme plan with nothing recorded yet. */
export function emptyProgrammePlan(programmeCode: string): ProgrammePlan {
    const bounds = semesterBoundsForProgram(programmeCode);
    return {
        coursesBySemester: sharedEmptyCoursesBySemester(bounds.min),
        doneCourseCodes: EMPTY_DONE_CODES,
        parkedCourseCodes: EMPTY_PARKED_CODES,
        courseMetaByCode: EMPTY_COURSE_META_BY_CODE,
        semesterNotes: EMPTY_SEMESTER_NOTES,
        selectedFocus: "",
        loadLimits: DEFAULT_SEMESTER_LOAD_LIMITS,
        graphView: EMPTY_GRAPH_VIEW_STATE,
    };
}

/** The plan held for a programme, or the empty one it starts from. */
export function programmePlan(state: PlannerState, programmeCode: string): ProgrammePlan {
    return state.byProgramme[programmeCode] ?? emptyProgrammePlan(programmeCode);
}

export function initialPlannerState(initialProgramCode?: string | null): PlannerState {
    const trimmed = String(initialProgramCode ?? "").trim();
    return {
        programCode: trimmed || DEFAULT_PROGRAM_CODE,
        byProgramme: {},
        lastChange: null,
        changeCounter: 0,
    };
}
