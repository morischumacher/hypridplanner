/**
 * The plan state machine. Pure: no clock, no randomness, no network, so a
 * change carries a monotonic counter rather than a timestamp.
 *
 * Unchanged state keeps its identity down to each part of a programme's plan,
 * because the view compares those parts by reference.
 */

import { BACHELOR_PROGRAM_CODE, semesterBoundsForProgram } from "../terms.ts";
import type { PlanAction, Update } from "./actions.ts";
import { diffPlannedCourses, laneIndexOrNull } from "./diff.ts";
import { buildCoursesOnlyFromNodes } from "./nodes-to-plan.ts";
import { sanitizeCourseMetaEntry, sanitizeGraphFilters, sanitizeSemesterLoadLimits } from "./sanitizers.ts";
import { flattenBySemester, numericSemesterIds } from "./semesters.ts";
import { plannerStateFromSnapshot } from "./snapshot.ts";
import {
    DEFAULT_PROGRAM_CODE,
    EMPTY_COURSE_META,
    programmePlan,
    type CourseMeta,
    type GraphViewState,
    type PlanChangeBody,
    type PlannerState,
    type ProgrammePlan,
} from "./state.ts";

function resolveUpdate<T, R>(update: Update<T, R>, current: T): R {
    return typeof update === "function" ? (update as (value: T) => R)(current) : update;
}

function sameCodes(current: readonly string[], next: readonly string[]): boolean {
    return current.length === next.length && current.every((code, index) => code === next[index]);
}

/** Clears the grade of each course, leaving the rest of its metadata alone. */
function clearGrades(
    byCode: Record<string, CourseMeta>,
    courseCodes: readonly string[]
): Record<string, CourseMeta> {
    let changed = false;
    const next = { ...byCode };
    for (const code of courseCodes) {
        const key = String(code || "").trim();
        if (!key) continue;
        const entry = sanitizeCourseMetaEntry(next[key] ?? EMPTY_COURSE_META);
        if (!entry.grade) continue;
        next[key] = { ...entry, grade: "" };
        changed = true;
    }
    return changed ? next : byCode;
}

/**
 * Writes a patch to one programme's plan and records the change.
 *
 * A silent action records nothing. Rollbacks rely on this: recording one would
 * trigger another rule check, whose refusal would roll back again.
 */
function commit(
    state: PlannerState,
    programmeCode: string,
    patch: Partial<ProgrammePlan>,
    change: PlanChangeBody | null,
    silent: boolean
): PlannerState {
    const current = programmePlan(state, programmeCode);
    const nextPlan: ProgrammePlan = { ...current, ...patch };
    const planChanged = (Object.keys(patch) as (keyof ProgrammePlan)[])
        .some((key) => nextPlan[key] !== current[key]);
    const recorded = change && !silent ? { ...change, id: state.changeCounter + 1 } : null;
    if (!planChanged && !recorded) return state;
    return {
        programCode: state.programCode,
        byProgramme: planChanged
            ? { ...state.byProgramme, [programmeCode]: nextPlan }
            : state.byProgramme,
        lastChange: recorded ?? state.lastChange,
        changeCounter: recorded ? recorded.id : state.changeCounter,
    };
}

export function plannerReducer(state: PlannerState, action: PlanAction): PlannerState {
    const silent = Boolean(action.meta?.silent);

    switch (action.type) {
        case "programme/selected": {
            if (state.programCode === action.programCode) return state;
            return { ...state, programCode: action.programCode };
        }

        case "plan/replacedFromNodes": {
            const programmeCode = state.programCode;
            const bounds = semesterBoundsForProgram(programmeCode);
            const plan = programmePlan(state, programmeCode);
            const parsed = buildCoursesOnlyFromNodes(action.nodes, programmeCode);

            const diff = diffPlannedCourses(plan.coursesBySemester, parsed.bySem, bounds.min, bounds.max);

            const plannedCodes = new Set(
                flattenBySemester(parsed.bySem, bounds.min, bounds.max)
                    .map((course) => course?.code)
                    .filter(Boolean)
            );
            const currentDone = Array.isArray(plan.doneCourseCodes) ? plan.doneCourseCodes : [];
            const prunedDone = currentDone.filter((code) => plannedCodes.has(code));
            // A course removed from the canvas is no longer done, and its grade
            // goes with it.
            const removedByPrune = currentDone.filter((code) => !plannedCodes.has(code));

            return commit(
                state,
                programmeCode,
                {
                    coursesBySemester: parsed.bySem,
                    doneCourseCodes: prunedDone.length === currentDone.length ? plan.doneCourseCodes : prunedDone,
                    courseMetaByCode: clearGrades(plan.courseMetaByCode, removedByPrune),
                    parkedCourseCodes: sameCodes(plan.parkedCourseCodes, parsed.parkedCodes)
                        ? plan.parkedCourseCodes
                        : parsed.parkedCodes,
                },
                diff,
                silent
            );
        }

        case "course/doneChanged": {
            if (!action.courseCode) return state;
            const programmeCode = state.programCode;
            const bounds = semesterBoundsForProgram(programmeCode);
            const plan = programmePlan(state, programmeCode);

            // The rule checker reports against the semester the card sits in.
            let laneIndex: number | null = null;
            let semesterId: number | null = null;
            for (const id of numericSemesterIds(plan.coursesBySemester, bounds.min, bounds.max)) {
                const match = (plan.coursesBySemester[id] ?? []).find((course) => course?.code === action.courseCode);
                if (match) {
                    laneIndex = laneIndexOrNull(match.laneIndex);
                    semesterId = id;
                    break;
                }
            }

            const done = Boolean(action.done);
            const current = Array.isArray(plan.doneCourseCodes) ? plan.doneCourseCodes : [];
            const exists = current.includes(action.courseCode);
            const doneCourseCodes = (done && exists) || (!done && !exists)
                ? plan.doneCourseCodes
                : (done
                    ? [...current, action.courseCode]
                    : current.filter((code) => code !== action.courseCode));

            return commit(
                state,
                programmeCode,
                {
                    doneCourseCodes,
                    courseMetaByCode: done
                        ? plan.courseMetaByCode
                        : clearGrades(plan.courseMetaByCode, [action.courseCode]),
                },
                {
                    type: "course_status_toggled",
                    courseCode: action.courseCode,
                    toStatus: done ? "done" : "in_plan",
                    laneIndex,
                    semesterId,
                    semesterNumber: laneIndex != null ? laneIndex + 1 : null,
                },
                silent
            );
        }

        case "courses/doneChanged": {
            const codes = Array.isArray(action.courseCodes) ? action.courseCodes.filter(Boolean) : [];
            if (codes.length === 0) return state;
            const programmeCode = state.programCode;
            const plan = programmePlan(state, programmeCode);
            const done = Boolean(action.done);

            const current = Array.isArray(plan.doneCourseCodes) ? plan.doneCourseCodes : [];
            let updated = [...current];
            for (const code of codes) {
                const exists = updated.includes(code);
                if (done && !exists) {
                    updated.push(code);
                } else if (!done && exists) {
                    updated = updated.filter((c) => c !== code);
                }
            }

            return commit(
                state,
                programmeCode,
                {
                    doneCourseCodes: updated,
                    courseMetaByCode: done ? plan.courseMetaByCode : clearGrades(plan.courseMetaByCode, codes),
                },
                {
                    type: "course_status_toggled",
                    courseCodes: codes,
                    toStatus: done ? "done" : "in_plan",
                },
                silent
            );
        }

        case "course/metaChanged": {
            const code = String(action.courseCode || "").trim();
            if (!code) return state;
            const programmeCode = state.programCode;
            const plan = programmePlan(state, programmeCode);
            const currentEntry = sanitizeCourseMetaEntry(plan.courseMetaByCode[code] ?? EMPTY_COURSE_META);
            const patch = resolveUpdate(action.patch, currentEntry);
            const nextEntry = sanitizeCourseMetaEntry({
                ...currentEntry,
                ...(patch && typeof patch === "object" ? patch : {}),
            });
            if (
                currentEntry.notes === nextEntry.notes &&
                currentEntry.estimatedHours === nextEntry.estimatedHours &&
                currentEntry.grade === nextEntry.grade
            ) {
                return state;
            }
            return commit(
                state,
                programmeCode,
                { courseMetaByCode: { ...plan.courseMetaByCode, [code]: nextEntry } },
                null,
                silent
            );
        }

        case "semester/noteChanged": {
            const sem = Number(action.semesterId);
            if (!Number.isInteger(sem) || sem < 1) return state;
            const programmeCode = state.programCode;
            const plan = programmePlan(state, programmeCode);
            const nextNote = typeof action.note === "string" ? action.note : "";
            const stored = plan.semesterNotes[sem];
            if ((typeof stored === "string" ? stored : "") === nextNote) return state;
            return commit(
                state,
                programmeCode,
                { semesterNotes: { ...plan.semesterNotes, [sem]: nextNote } },
                null,
                silent
            );
        }

        case "focus/selected": {
            const programmeCode = state.programCode;
            const focus = typeof action.focus === "string" ? action.focus : "";
            // Only the bachelor curriculum has focus areas.
            const change: PlanChangeBody | null = programmeCode === BACHELOR_PROGRAM_CODE
                ? { type: "focus_updated", selectedFocus: focus || null }
                : null;
            return commit(state, programmeCode, { selectedFocus: focus }, change, silent);
        }

        case "focus/selectedForProgramme": {
            const programmeCode = String(action.programmeCode || "").trim();
            if (!programmeCode) return state;
            const focus = typeof action.focus === "string" ? action.focus : "";
            const change: PlanChangeBody | null = programmeCode === BACHELOR_PROGRAM_CODE
                ? { type: "focus_updated", selectedFocus: focus || null }
                : null;
            return commit(state, programmeCode, { selectedFocus: focus }, change, silent);
        }

        case "loadLimits/changed": {
            const programmeCode = state.programCode;
            const plan = programmePlan(state, programmeCode);
            const current = sanitizeSemesterLoadLimits(plan.loadLimits);
            const next = sanitizeSemesterLoadLimits(resolveUpdate(action.patch, current));
            if (
                current.maxEctsPerSemester === next.maxEctsPerSemester &&
                current.recommendedEctsPerSemester === next.recommendedEctsPerSemester &&
                current.maxWeekHoursPerSemester === next.maxWeekHoursPerSemester &&
                current.recommendedWeekHoursPerSemester === next.recommendedWeekHoursPerSemester
            ) {
                return state;
            }
            return commit(
                state,
                programmeCode,
                { loadLimits: next },
                { type: "semester_load_limits_updated", ...next },
                silent
            );
        }

        case "graphView/changed": {
            const programmeCode = state.programCode;
            const plan = programmePlan(state, programmeCode);
            const current = plan.graphView;
            const patch = resolveUpdate(action.patch, current);
            if (patch === current) return state;
            const safePatch = (patch && typeof patch === "object" ? patch : {}) as Partial<GraphViewState>;

            const collapsedIds = Array.isArray(safePatch.collapsedIds)
                ? safePatch.collapsedIds
                : (current.collapsedIds ?? null);
            const legacyNodeXById = safePatch.nodeXById && typeof safePatch.nodeXById === "object"
                ? safePatch.nodeXById
                : (current.nodeXById ?? {});
            const nodePosById = safePatch.nodePosById && typeof safePatch.nodePosById === "object"
                ? safePatch.nodePosById
                : (current.nodePosById ?? {});
            // Legacy snapshots stored card positions as an x coordinate alone.
            const nodePosCandidate = Object.keys(nodePosById).length > 0
                ? nodePosById
                : Object.fromEntries(
                    Object.entries(legacyNodeXById)
                        .filter(([, x]) => Number.isFinite(x))
                        .map(([id, x]) => [id, { x, y: 0 }])
                );
            const nextFilters = sanitizeGraphFilters(safePatch.filters ?? current.filters);
            // Filters are compared by value because they are rebuilt from the
            // catalogue on every pass; an equal but fresh object would redraw.
            const filtersUnchanged =
                JSON.stringify(current.filters ?? null) === JSON.stringify(nextFilters ?? null);
            const filters = filtersUnchanged ? (current.filters ?? nextFilters) : nextFilters;
            const filtersConfigured = typeof safePatch.filtersConfigured === "boolean"
                ? safePatch.filtersConfigured
                : Boolean(current.filtersConfigured);

            const graphView: GraphViewState = {
                ...current,
                ...safePatch,
                collapsedIds,
                nodePosById: nodePosCandidate,
                filters,
                filtersConfigured,
            };
            if (
                current.collapsedIds === graphView.collapsedIds &&
                current.nodePosById === graphView.nodePosById &&
                current.filters === graphView.filters &&
                current.filtersConfigured === graphView.filtersConfigured
            ) {
                return state;
            }
            return commit(state, programmeCode, { graphView }, null, silent);
        }

        case "plan/imported": {
            if (!action.snapshot || typeof action.snapshot !== "object") return state;
            return plannerStateFromSnapshot(state, action.snapshot);
        }

        case "plan/cleared": {
            return {
                programCode: DEFAULT_PROGRAM_CODE,
                byProgramme: {},
                lastChange: null,
                // The counter survives a clear so an in-flight request cannot be
                // matched against a reused identifier.
                changeCounter: state.changeCounter,
            };
        }

        default:
            return state;
    }
}
