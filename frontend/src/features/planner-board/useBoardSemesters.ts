/**
 * How many lanes the canvas draws, derived from the plan alone.
 *
 * Nothing stores a semester count: a plan has seven semesters because a card
 * sits in the seventh. A semester is added by dropping a card into the lane
 * after the last used one, and that lane exists only while a drag hovers over
 * it, which is what `dragPreviewSemesterCount` provides.
 */

import { useMemo, useState } from "react";

import type { CoursesBySemester } from "../../domain/plan/state.ts";
import { buildSemesterList, semesterBoundsForProgram } from "../../domain/terms.ts";
import type { SemesterOption } from "./types.ts";

export interface UseBoardSemestersInput {
    programCode: string;
    coursesBySemester: CoursesBySemester | null | undefined;
}

export interface UseBoardSemestersResult {
    /** Semesters the programme is designed to take. */
    minSemesterCount: number;
    /** Semesters the planner will show before it stops adding lanes. */
    maxSemesterCount: number;
    usedSemesterCount: number;
    activeSemesterCount: number;
    displayedSemesterCount: number;
    /** The lanes the canvas draws, excluding the parking stage. */
    semesters: SemesterOption[];
    /** The semester numbers the plan mentions, plus the required ones. */
    semesterIdsFromPlan: number[];
    /** Every lane the programme allows, marked for whether the plan reaches it. */
    sidebarSemesters: SemesterOption[];
    dragPreviewSemesterCount: number | null;
    setDragPreviewSemesterCount: (count: number | null) => void;
}

export function useBoardSemesters({
    programCode,
    coursesBySemester,
}: UseBoardSemestersInput): UseBoardSemestersResult {
    const semesterBounds = useMemo(() => semesterBoundsForProgram(programCode), [programCode]);
    const minSemesterCount = semesterBounds.min;
    const maxSemesterCount = semesterBounds.max;
    const [dragPreviewSemesterCount, setDragPreviewSemesterCount] = useState<number | null>(null);

    const usedSemesterCount = useMemo(() => {
        let maxLane = -1;
        let maxSemesterKey = -1;
        const bySem = coursesBySemester && typeof coursesBySemester === "object" ? coursesBySemester : {};
        for (const [semesterKey, list] of Object.entries(bySem)) {
            const semNum = Number(semesterKey);
            const safeList = Array.isArray(list) ? list : [];
            if (Number.isInteger(semNum) && safeList.length > 0) maxSemesterKey = Math.max(maxSemesterKey, semNum - 1);
            for (const course of safeList) {
                const li = Number(course?.laneIndex);
                if (Number.isFinite(li)) maxLane = Math.max(maxLane, Math.floor(li));
            }
        }
        const requiredByData = Math.max(maxLane, maxSemesterKey) + 1;
        return Math.max(minSemesterCount, Math.min(maxSemesterCount, requiredByData));
    }, [coursesBySemester, minSemesterCount, maxSemesterCount]);

    const activeSemesterCount = useMemo(
        () => Math.max(minSemesterCount, Math.min(maxSemesterCount, usedSemesterCount)),
        [minSemesterCount, maxSemesterCount, usedSemesterCount]
    );
    const displayedSemesterCount = useMemo(
        () => Math.max(activeSemesterCount, Math.min(maxSemesterCount, Number(dragPreviewSemesterCount) || 0)),
        [activeSemesterCount, dragPreviewSemesterCount, maxSemesterCount]
    );
    const semesters = useMemo(() => buildSemesterList(displayedSemesterCount), [displayedSemesterCount]);
    const semesterIdsFromPlan = useMemo(() => {
        const ids = new Set<number>();
        for (let i = 1; i <= minSemesterCount; i += 1) ids.add(i);
        const bySem = coursesBySemester && typeof coursesBySemester === "object" ? coursesBySemester : {};
        for (const key of Object.keys(bySem)) {
            const n = Number(key);
            if (Number.isInteger(n) && n >= 1 && n <= maxSemesterCount) ids.add(n);
        }
        return [...ids].sort((a, b) => a - b);
    }, [coursesBySemester, maxSemesterCount, minSemesterCount]);
    const sidebarSemesters = useMemo<SemesterOption[]>(
        () => buildSemesterList(maxSemesterCount).map((semester) => ({
            ...semester,
            isPlus: semester.id > activeSemesterCount,
        })),
        [activeSemesterCount, maxSemesterCount]
    );

    return {
        minSemesterCount,
        maxSemesterCount,
        usedSemesterCount,
        activeSemesterCount,
        displayedSemesterCount,
        semesters,
        semesterIdsFromPlan,
        sidebarSemesters,
        dragPreviewSemesterCount,
        setDragPreviewSemesterCount,
    };
}
