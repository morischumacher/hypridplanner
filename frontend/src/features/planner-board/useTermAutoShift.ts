/**
 * Relocates courses stranded by a change of term.
 *
 * The plan is kept term-valid at all times, so changing the start season or a
 * course's availability moves whatever no longer fits. It runs off a profile
 * change rather than a user action, and writes the plan through in the same
 * pass so the rule check sees one change rather than a shift plus a save.
 *
 * A course moves to the first lane at or after its current one, and backwards
 * only when nothing later fits.
 */

import { useEffect } from "react";
import type { MutableRefObject } from "react";

import { centerX, laneIndexFromX } from "../../domain/layout.ts";
import { isLaneAllowedForTerm } from "../../domain/terms.ts";
import type { TermAvailability } from "../../domain/terms.ts";
import type { StickyViolation } from "../rule-check/index.ts";
import { recomputeGroupFromChildren } from "./node-layout.ts";
import type { BoardNode } from "./types.ts";

/** The result of one shift pass, before anything is written. */
interface TermShiftResult {
    resolved: BoardNode[];
    shiftedCount: number;
    changed: boolean;
}

interface TermShiftInput {
    maxSemesterCount: number;
    startTermSeason: string;
    termAvailabilityForCode: (courseCode: string) => TermAvailability;
    isCourseAllowedInLane: (courseCode: string | null | undefined, laneIndex: number) => boolean;
    firstAllowedLaneForCourse: (courseCode: string | null | undefined, preferredLane: number) => number | null;
    resolveLaneCollisions: (nodes: BoardNode[]) => BoardNode[];
}

/**
 * Computes the destination of every term-invalid course and settles the canvas
 * around the moves. Parked courses are skipped, as the parking stage has no
 * season.
 */
function shiftTermInvalidCourses(nodes: BoardNode[], {
    maxSemesterCount,
    startTermSeason,
    termAvailabilityForCode,
    isCourseAllowedInLane,
    firstAllowedLaneForCourse,
    resolveLaneCollisions,
}: TermShiftInput): TermShiftResult {
    let shiftedCount = 0;
    const maxLane = Math.max(0, maxSemesterCount - 1);
    const next = nodes.map((node) => ({ ...node, position: { ...(node?.position || { x: 0, y: 0 }) } }));
    const byId = new Map(next.map((node) => [node.id, node]));

    const findAnyAllowedLane = (code: string | null | undefined, preferredLane: number) => {
        const forward = firstAllowedLaneForCourse(code, preferredLane);
        if (forward != null) return forward;
        const term = termAvailabilityForCode(code ?? "");
        const preferred = Math.max(0, Math.min(Number(preferredLane) || 0, maxLane));
        for (let idx = preferred - 1; idx >= 0; idx -= 1) {
            if (isLaneAllowedForTerm(term, startTermSeason, idx)) return idx;
        }
        return null;
    };

    const groupIds = [...new Set(
        next
            .filter((node) => node?.type === "course" && node?.data?.groupId)
            .map((node) => node.data?.groupId)
            .filter((groupId): groupId is string => Boolean(groupId))
    )];
    const movedGroups = new Set<string>();

    for (const groupId of groupIds) {
        const children = next.filter((node) => node?.type === "course" && node?.data?.groupId === groupId);
        if (!children.length) continue;
        let movedAnyChildInGroup = false;
        for (const child of children) {
            if (String(child?.data?.status || "") === "parked") continue;
            const code = child?.data?.code;
            if (!code) continue;
            const currentLane = Math.max(0, Math.min(laneIndexFromX(child?.position?.x ?? 0, maxLane), maxLane));
            if (isCourseAllowedInLane(code, currentLane)) continue;
            const targetLane = findAnyAllowedLane(code, currentLane);
            if (targetLane == null || targetLane === currentLane) continue;
            const target = byId.get(child.id);
            if (!target) continue;
            target.position.x = centerX(targetLane);
            shiftedCount += 1;
            movedAnyChildInGroup = true;
        }
        if (movedAnyChildInGroup) movedGroups.add(groupId);
    }

    for (const node of next) {
        if (node?.type !== "course") continue;
        if (String(node?.data?.status || "") === "parked") continue;
        if (node?.data?.groupId) continue;
        const code = node?.data?.code;
        if (!code) continue;
        const currentLane = Math.max(0, Math.min(laneIndexFromX(node?.position?.x ?? 0, maxLane), maxLane));
        if (isCourseAllowedInLane(code, currentLane)) continue;
        const targetLane = findAnyAllowedLane(code, currentLane);
        if (targetLane == null || targetLane === currentLane) continue;
        node.position.x = centerX(targetLane);
        shiftedCount += 1;
    }

    let resolved = next;
    for (const groupId of movedGroups) {
        resolved = recomputeGroupFromChildren(resolved, groupId);
    }
    resolved = resolveLaneCollisions(resolved);

    // Only horizontal movement counts as a change: settling the lanes can nudge
    // a card downwards without any course changing semester.
    const changed = resolved.some((node, idx) => {
        const before = nodes[idx];
        if (!before) return true;
        return Number(before?.position?.x ?? 0) !== Number(node?.position?.x ?? 0);
    });

    return { resolved, shiftedCount, changed };
}

export interface UseTermAutoShiftInput {
    plannerHydrated: boolean;
    nodes: BoardNode[];
    setNodes: (nodes: BoardNode[]) => void;
    setNeedsPersist: (needsPersist: boolean) => void;
    setCoursesFromNodes: (nodes: BoardNode[]) => void;
    setStickyViolation: (violation: StickyViolation) => void;
    nodeDragInProgressRef: MutableRefObject<boolean>;
    maxSemesterCount: number;
    startTermSeason: string;
    /** A dependency: a changed override is what triggers a shift. */
    effectiveCourseTermByCode: Record<string, TermAvailability>;
    termAvailabilityForCode: (courseCode: string) => TermAvailability;
    isCourseAllowedInLane: (courseCode: string | null | undefined, laneIndex: number) => boolean;
    firstAllowedLaneForCourse: (courseCode: string | null | undefined, preferredLane: number) => number | null;
    resolveLaneCollisions: (nodes: BoardNode[]) => BoardNode[];
}

export function useTermAutoShift({
    plannerHydrated,
    nodes,
    setNodes,
    setNeedsPersist,
    setCoursesFromNodes,
    setStickyViolation,
    nodeDragInProgressRef,
    maxSemesterCount,
    startTermSeason,
    effectiveCourseTermByCode,
    termAvailabilityForCode,
    isCourseAllowedInLane,
    firstAllowedLaneForCourse,
    resolveLaneCollisions,
}: UseTermAutoShiftInput): void {
    useEffect(() => {
        if (!plannerHydrated) return;
        // Relocating a card mid-drag would move it out from under the pointer.
        if (nodeDragInProgressRef.current) return;
        if (!Array.isArray(nodes) || nodes.length === 0) return;

        const { resolved, shiftedCount, changed } = shiftTermInvalidCourses(nodes, {
            maxSemesterCount,
            startTermSeason,
            termAvailabilityForCode,
            isCourseAllowedInLane,
            firstAllowedLaneForCourse,
            resolveLaneCollisions,
        });
        if (!changed) return;

        setNodes(resolved);
        setCoursesFromNodes(resolved.filter((node) => node.type !== "lane"));
        setNeedsPersist(false);
        if (shiftedCount > 0) {
            setStickyViolation({
                message: `Auto-shifted ${shiftedCount} course${shiftedCount === 1 ? "" : "s"} to valid semesters.`,
                until: Date.now() + 3200,
                tone: "success",
            });
        }
    }, [
        nodes,
        plannerHydrated,
        startTermSeason,
        effectiveCourseTermByCode,
        firstAllowedLaneForCourse,
        isCourseAllowedInLane,
        maxSemesterCount,
        resolveLaneCollisions,
        setCoursesFromNodes,
        setNeedsPersist,
        setNodes,
        setStickyViolation,
        termAvailabilityForCode,
    ]);
}
