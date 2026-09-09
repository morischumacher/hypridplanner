/**
 * Coercion of stored or half-typed values into valid state.
 *
 * Every function is total: an unusable value becomes the default rather than an
 * error, since these run on server payloads and on fields still being typed in.
 */

import type { GraphFilters } from "../filters.ts";
import {
    DEFAULT_GRAPH_FILTERS,
    DEFAULT_SEMESTER_LOAD_LIMITS,
    type CourseMeta,
    type SemesterLoadLimits,
} from "./state.ts";

/** Reads any non-object as an empty record. */
export function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function sanitizeCourseMetaEntry(value: unknown): CourseMeta {
    const source = asRecord(value);
    const notes = typeof source.notes === "string" ? source.notes : "";
    const estimatedHoursRaw = source.estimatedHours;
    const estimatedHours = estimatedHoursRaw == null ? "" : String(estimatedHoursRaw);
    const gradeRaw = source.grade;
    let grade = gradeRaw == null ? "" : String(gradeRaw);
    // Grades are hand-entered, with a comma as often as a point. 5 is the worst
    // valid grade, so anything above it is capped rather than rejected.
    const normalizedGrade = grade.trim().replace(",", ".");
    const parsedGrade = Number(normalizedGrade);
    if (normalizedGrade && Number.isFinite(parsedGrade) && parsedGrade > 5) {
        grade = "5";
    }
    return { notes, estimatedHours, grade };
}

/**
 * Load limits, with the recommendation clamped at or below the maximum; above
 * it, a semester would count as both within recommendation and over the limit.
 */
export function sanitizeSemesterLoadLimits(value: unknown): SemesterLoadLimits {
    const source = asRecord(value);
    const parsedMax = Number(source.maxEctsPerSemester);
    const parsedRecommended = Number(source.recommendedEctsPerSemester);
    const parsedMaxWeekHours = Number(source.maxWeekHoursPerSemester);
    const parsedRecommendedWeekHours = Number(source.recommendedWeekHoursPerSemester);
    const maxEctsPerSemester = Number.isFinite(parsedMax) && parsedMax > 0
        ? parsedMax
        : DEFAULT_SEMESTER_LOAD_LIMITS.maxEctsPerSemester;
    const recommendedRaw = Number.isFinite(parsedRecommended) && parsedRecommended > 0
        ? parsedRecommended
        : DEFAULT_SEMESTER_LOAD_LIMITS.recommendedEctsPerSemester;
    const recommendedEctsPerSemester = Math.min(recommendedRaw, maxEctsPerSemester);
    const maxWeekHoursPerSemester = Number.isFinite(parsedMaxWeekHours) && parsedMaxWeekHours > 0
        ? parsedMaxWeekHours
        : DEFAULT_SEMESTER_LOAD_LIMITS.maxWeekHoursPerSemester;
    const recommendedWeekHoursRaw = Number.isFinite(parsedRecommendedWeekHours) && parsedRecommendedWeekHours > 0
        ? parsedRecommendedWeekHours
        : DEFAULT_SEMESTER_LOAD_LIMITS.recommendedWeekHoursPerSemester;
    const recommendedWeekHoursPerSemester = Math.min(recommendedWeekHoursRaw, maxWeekHoursPerSemester);
    return {
        maxEctsPerSemester,
        recommendedEctsPerSemester,
        maxWeekHoursPerSemester,
        recommendedWeekHoursPerSemester,
    };
}

/**
 * Graph filters. An empty list means "no constraint", so a missing one falls
 * back to the default rather than to an empty list.
 */
export function sanitizeGraphFilters(filters: unknown): GraphFilters {
    const source = asRecord(filters);
    const ectsRange = asRecord(source.ectsRange);
    return {
        obligationTypes: Array.isArray(source.obligationTypes)
            ? (source.obligationTypes as GraphFilters["obligationTypes"])
            : DEFAULT_GRAPH_FILTERS.obligationTypes,
        ectsRange: source.ectsRange && typeof source.ectsRange === "object"
            ? {
                min: Number(ectsRange.min),
                max: Number(ectsRange.max),
            }
            : null,
        courseTypes: Array.isArray(source.courseTypes)
            ? (source.courseTypes as string[])
            : DEFAULT_GRAPH_FILTERS.courseTypes,
        examSubjects: Array.isArray(source.examSubjects)
            ? (source.examSubjects as string[])
            : DEFAULT_GRAPH_FILTERS.examSubjects,
        progressStates: Array.isArray(source.progressStates)
            ? (source.progressStates as string[])
            : DEFAULT_GRAPH_FILTERS.progressStates,
        termAvailabilities: Array.isArray(source.termAvailabilities)
            ? (source.termAvailabilities as string[])
            : DEFAULT_GRAPH_FILTERS.termAvailabilities,
    };
}
