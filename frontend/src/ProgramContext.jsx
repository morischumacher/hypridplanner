// React adapter around the `domain/plan` reducer. Values are passed through as the
// reducer stored them, never rebuilt per render, because consumers compare by identity.
import React, { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import {
    DEFAULT_SEMESTER_LOAD_LIMITS,
    EMPTY_COURSE_META,
    EMPTY_COURSE_META_BY_CODE,
    EMPTY_DONE_CODES,
    EMPTY_GRAPH_VIEW_STATE,
    EMPTY_PARKED_CODES,
    EMPTY_SEMESTER_NOTES,
    initialPlannerState,
    numericSemesterIds,
    plannerReducer,
    sharedEmptyCoursesBySemester,
    snapshotFromPlannerState,
} from "./domain/plan/index.ts";
import { semesterBoundsForProgram } from "./domain/terms.ts";
import { MASTER_PROGRAM_CODE } from "./domain/programmes.ts";

const ProgramContext = createContext();

export function ProgramProvider({ children, initialProgramCode = MASTER_PROGRAM_CODE }) {
    const [state, dispatch] = useReducer(plannerReducer, initialProgramCode, initialPlannerState);

    const programCode = state.programCode;
    const semesterBounds = semesterBoundsForProgram(programCode);
    const plan = state.byProgramme[programCode] ?? null;

    const coursesBySemester = plan?.coursesBySemester ?? sharedEmptyCoursesBySemester(semesterBounds.min);
    const doneCourseCodes = plan?.doneCourseCodes ?? EMPTY_DONE_CODES;
    const parkedCourseCodes = plan?.parkedCourseCodes ?? EMPTY_PARKED_CODES;
    const courseMetaByCode = plan?.courseMetaByCode ?? EMPTY_COURSE_META_BY_CODE;
    const semesterNotesBySemesterId = plan?.semesterNotes ?? EMPTY_SEMESTER_NOTES;
    const selectedFocus = plan?.selectedFocus ?? "";
    const graphViewState = plan?.graphView ?? EMPTY_GRAPH_VIEW_STATE;
    const semesterLoadLimits = plan?.loadLimits ?? DEFAULT_SEMESTER_LOAD_LIMITS;
    const lastPlanChange = state.lastChange;

    const setProgramCode = useCallback((nextProgramCode) => {
        dispatch({ type: "programme/selected", programCode: nextProgramCode });
    }, []);

    const setCoursesFromNodes = useCallback((nodes) => {
        dispatch({ type: "plan/replacedFromNodes", nodes });
    }, []);

    const getCoursesForSemester = useCallback((semesterId) => {
        return coursesBySemester[semesterId] ?? [];
    }, [coursesBySemester]);

    const getModulesForSemester = useCallback((semesterId) => {
        const list = coursesBySemester[semesterId] ?? [];
        const byId = new Map();
        for (const c of list) {
            if (c.module?.id) {
                if (!byId.has(c.module.id)) byId.set(c.module.id, { module: c.module, courses: [] });
                byId.get(c.module.id).courses.push(c);
            }
        }
        return Array.from(byId.values());
    }, [coursesBySemester]);

    const getCourseStatus = useCallback((courseCode) => {
        if (!courseCode) return "todo";
        if (doneCourseCodes.includes(courseCode)) return "done";
        if (parkedCourseCodes.includes(courseCode)) return "parked";
        for (const semesterId of numericSemesterIds(coursesBySemester, semesterBounds.min, semesterBounds.max)) {
            if ((coursesBySemester?.[semesterId] ?? []).some((c) => c?.code === courseCode)) return "in_plan";
        }
        return "todo";
    }, [coursesBySemester, doneCourseCodes, parkedCourseCodes, semesterBounds.max, semesterBounds.min]);

    const setCourseDone = useCallback((courseCode, nextDone) => {
        dispatch({ type: "course/doneChanged", courseCode, done: nextDone });
    }, []);

    const setMultipleCoursesDone = useCallback((courseCodes, nextDone) => {
        dispatch({ type: "courses/doneChanged", courseCodes, done: nextDone });
    }, []);

    // Same transition as setCourseDone but marked silent, so undoing a rejected change
    // is not itself sent for rule checking and cannot loop.
    const rollbackCourseDone = useCallback((courseCode, nextDone) => {
        dispatch({ type: "course/doneChanged", courseCode, done: nextDone, meta: { silent: true } });
    }, []);

    const getCourseMeta = useCallback((courseCode) => {
        const code = String(courseCode || "").trim();
        if (!code) return EMPTY_COURSE_META;
        return courseMetaByCode?.[code] ?? EMPTY_COURSE_META;
    }, [courseMetaByCode]);

    const setCourseMeta = useCallback((courseCode, nextMetaOrUpdater) => {
        dispatch({ type: "course/metaChanged", courseCode, patch: nextMetaOrUpdater });
    }, []);

    const setSelectedFocus = useCallback((focusName) => {
        dispatch({ type: "focus/selected", focus: focusName });
    }, []);

    const setSelectedFocusForProgram = useCallback((targetProgramCode, focusName) => {
        dispatch({ type: "focus/selectedForProgramme", programmeCode: targetProgramCode, focus: focusName });
    }, []);

    const setGraphViewState = useCallback((nextStateOrUpdater) => {
        dispatch({ type: "graphView/changed", patch: nextStateOrUpdater });
    }, []);

    const setSemesterLoadLimits = useCallback((nextValueOrUpdater) => {
        dispatch({ type: "loadLimits/changed", patch: nextValueOrUpdater });
    }, []);

    const getSemesterNote = useCallback((semesterId) => {
        const sem = Number(semesterId);
        if (!Number.isInteger(sem) || sem < 1) return "";
        const note = semesterNotesBySemesterId?.[sem];
        return typeof note === "string" ? note : "";
    }, [semesterNotesBySemesterId]);

    const setSemesterNote = useCallback((semesterId, note) => {
        dispatch({ type: "semester/noteChanged", semesterId, note });
    }, []);

    // Deps are narrowed to the fields the snapshot reads, so lastChange updates
    // do not make it look like there is new state to save.
    const exportPlannerStateSnapshot = useCallback(
        () => snapshotFromPlannerState(state),
        [state.programCode, state.byProgramme]
    );

    const importPlannerStateSnapshot = useCallback((snapshot) => {
        dispatch({ type: "plan/imported", snapshot });
    }, []);

    const clearPlannerState = useCallback(() => {
        dispatch({ type: "plan/cleared" });
    }, []);

    const value = useMemo(() => ({
        programCode,
        setProgramCode,
        coursesBySemester,
        setCoursesFromNodes,
        doneCourseCodes,
        parkedCourseCodes,
        courseMetaByCode,
        semesterNotesBySemesterId,
        getCourseMeta,
        setCourseMeta,
        getSemesterNote,
        setSemesterNote,
        selectedFocus,
        setSelectedFocus,
        setSelectedFocusForProgram,
        setCourseDone,
        setMultipleCoursesDone,
        rollbackCourseDone,
        getCourseStatus,
        lastPlanChange,
        graphViewState,
        setGraphViewState,
        semesterLoadLimits,
        setSemesterLoadLimits,
        getCoursesForSemester,
        getModulesForSemester,
        exportPlannerStateSnapshot,
        importPlannerStateSnapshot,
        clearPlannerState,
    }), [
        programCode,
        coursesBySemester,
        setCoursesFromNodes,
        doneCourseCodes,
        parkedCourseCodes,
        courseMetaByCode,
        semesterNotesBySemesterId,
        getCourseMeta,
        setCourseMeta,
        getSemesterNote,
        setSemesterNote,
        selectedFocus,
        setSelectedFocus,
        setSelectedFocusForProgram,
        setCourseDone,
        setMultipleCoursesDone,
        rollbackCourseDone,
        getCourseStatus,
        lastPlanChange,
        graphViewState,
        setGraphViewState,
        semesterLoadLimits,
        setSemesterLoadLimits,
        getCoursesForSemester,
        getModulesForSemester,
        exportPlannerStateSnapshot,
        importPlannerStateSnapshot,
        clearPlannerState,
    ]);

    return <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>;
}

export function currentProgram() {
    return useContext(ProgramContext);
}
