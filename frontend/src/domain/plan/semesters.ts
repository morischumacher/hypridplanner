/**
 * Semester keys of a plan.
 *
 * A plan always carries at least the programme's designed semesters, empty or
 * not, since a lane must exist before a course can be dropped into it. Later
 * semesters appear only once occupied, and never past the programme maximum.
 */

import type { CoursesBySemester, PlanCourse, PlanCourseInSemester } from "./state.ts";

/** An empty plan with the designed number of semesters. */
export function emptyCoursesOnlyPlan(minCount: unknown = 6): CoursesBySemester {
    const bySem: CoursesBySemester = {};
    for (let i = 1; i <= Math.max(1, Number(minCount) || 1); i += 1) bySem[i] = [];
    return bySem;
}

/** The semesters a plan is read over, in order: the designed ones plus any occupied. */
export function numericSemesterIds(bySemester: unknown, minCount: unknown, maxCount: unknown): number[] {
    const ids = new Set<number>();
    const min = Math.max(1, Number(minCount) || 1);
    const max = Math.max(min, Number(maxCount) || min);
    for (let i = 1; i <= min; i += 1) ids.add(i);
    if (bySemester && typeof bySemester === "object") {
        for (const key of Object.keys(bySemester)) {
            const n = Number(key);
            if (Number.isInteger(n) && n >= 1 && n <= max) ids.add(n);
        }
    }
    return [...ids].sort((a, b) => a - b);
}

/**
 * A stored plan, keyed by number and padded to the designed length. Course
 * objects are taken as-is; the diff re-checks the fields it depends on.
 */
export function normalizeBySemesterMap(value: unknown, minCount: unknown, maxCount: unknown): CoursesBySemester {
    const next = emptyCoursesOnlyPlan(minCount);
    if (!value || typeof value !== "object") return next;
    const source = value as Record<number, unknown>;
    for (const id of numericSemesterIds(value, minCount, maxCount)) {
        const arr = Array.isArray(source[id]) ? (source[id] as PlanCourse[]) : [];
        next[id] = arr;
    }
    return next;
}

/** Every course in a plan, each tagged with the semester it was found in. */
export function flattenBySemester(
    bySemester: unknown,
    minCount: unknown,
    maxCount: unknown
): PlanCourseInSemester[] {
    const source = (bySemester ?? {}) as Record<number, PlanCourse[] | undefined>;
    const out: PlanCourseInSemester[] = [];
    for (const id of numericSemesterIds(bySemester, minCount, maxCount)) {
        const list = source[id] ?? [];
        for (const c of list) out.push({ ...c, semesterId: id });
    }
    return out;
}
