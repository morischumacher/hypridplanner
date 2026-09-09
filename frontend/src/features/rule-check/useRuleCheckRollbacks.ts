/**
 * Undoes a change the rule checker refused.
 *
 * A rollback is driven by the diff the change carried, never by comparing
 * plans: the diff names the node ids added or moved and the lane each came
 * from. It must search the array the diff was taken from, so every rollback
 * reads the canvas through the setter's previous value, not a captured copy.
 */

import { useCallback } from "react";

import { centerX } from "../../domain/layout.ts";
import { recomputeGroupFromChildren } from "../../domain/nodes.ts";
import type { PlanNode } from "../../domain/types.ts";

/**
 * A refused change as a rollback reads it. All fields optional: a rollback
 * re-checks its input rather than trusting the caller to have matched it.
 */
export interface RolledBackChange {
    type?: string | undefined;
    added?: readonly { id?: string | null | undefined }[] | undefined;
    moved?: readonly {
        id?: string | null | undefined;
        fromLaneIndex?: number | null | undefined;
    }[] | undefined;
    courseCode?: string | undefined;
    courseCodes?: readonly string[] | undefined;
    toStatus?: string | undefined;
}

export interface UseRuleCheckRollbacksInput {
    /** Called only with an updater, so the diff's ids resolve in the live array. */
    setNodes: (updater: (nodes: PlanNode[]) => PlanNode[]) => void;
    setNeedsPersist: (needsPersist: boolean) => void;
    resolveLaneCollisions: (nodes: PlanNode[]) => PlanNode[];
    /**
     * Un-ticks a course without recording a plan change. Recording one would
     * trigger another rule check, whose refusal would roll back again.
     */
    rollbackCourseDone: (courseCode: string, nextDone: boolean) => void;
}

export interface UseRuleCheckRollbacksResult {
    rollbackAddedCourses: (change: RolledBackChange | null | undefined) => void;
    rollbackMovedCourses: (change: RolledBackChange | null | undefined) => void;
    rollbackCourseStatusToggle: (change: RolledBackChange | null | undefined) => void;
}

export function useRuleCheckRollbacks({
    setNodes,
    setNeedsPersist,
    resolveLaneCollisions,
    rollbackCourseDone,
}: UseRuleCheckRollbacksInput): UseRuleCheckRollbacksResult {
    const rollbackAddedCourses = useCallback((change: RolledBackChange | null | undefined) => {
        const addedIds = Array.isArray(change?.added) ? change.added.map((a) => a?.id).filter(Boolean) : [];
        if (!addedIds.length) return;

        setNodes((prev) => {
            let next = prev.filter((n) => !addedIds.includes(n.id));
            const affectedGroupIds = new Set(
                prev
                    .filter((n) => addedIds.includes(n.id) && n.type === "course" && n.data?.groupId)
                    .map((n) => n.data?.groupId)
                    .filter((groupId): groupId is string => Boolean(groupId))
            );

            for (const groupId of affectedGroupIds) {
                next = recomputeGroupFromChildren(next, groupId);
            }
            return next;
        });
        setNeedsPersist(true);
    }, [setNodes]);

    const rollbackMovedCourses = useCallback((change: RolledBackChange | null | undefined) => {
        const movedItems = Array.isArray(change?.moved) ? change.moved : [];
        if (!movedItems.length) return;

        // Matched by id only: a plan may hold the same course twice, and
        // matching by code would restore whichever copy comes first.
        const byId = new Map<string, number>();
        for (const item of movedItems) {
            const id = String(item?.id || "").trim();
            const fromLane = Number(item?.fromLaneIndex);
            if (!id || !Number.isInteger(fromLane) || fromLane < 0) continue;
            byId.set(id, fromLane);
        }
        if (!byId.size) return;

        setNodes((prev) => {
            const affectedGroupIds = new Set<string>();
            const next = prev.map((node) => {
                if (node?.type !== "course") return node;
                const fromLane = byId.get(String(node?.id || "").trim()) ?? null;
                if (fromLane == null) return node;
                if (node?.data?.groupId) affectedGroupIds.add(node.data.groupId);
                return {
                    ...node,
                    position: {
                        ...node.position,
                        x: centerX(fromLane),
                    },
                };
            });

            let resolved = next;
            for (const groupId of affectedGroupIds) {
                resolved = recomputeGroupFromChildren(resolved, groupId);
            }
            return resolveLaneCollisions(resolved);
        });
        setNeedsPersist(true);
    }, [resolveLaneCollisions, setNodes]);

    const rollbackCourseStatusToggle = useCallback((change: RolledBackChange | null | undefined) => {
        if (change?.type !== "course_status_toggled") return;
        const courseCodes = change?.courseCodes || (change?.courseCode ? [change.courseCode] : []);
        if (courseCodes.length === 0) return;
        const isRolledBackCourse = (node: PlanNode) => {
            const code = node.data?.code;
            return code != null && courseCodes.includes(code);
        };

        const attemptedDone = change?.toStatus === "done";
        const revertedDone = !attemptedDone;

        for (const courseCode of courseCodes) {
            rollbackCourseDone(courseCode, revertedDone);
        }

        setNodes((prev) => {
            const updated = prev.map((n) => {
                if (n.type === "course" && isRolledBackCourse(n)) {
                    return { ...n, data: { ...n.data, status: revertedDone ? "done" : "in_plan" } };
                }
                return n;
            });
            const groupIds = prev
                .filter((n) => n.type === "course" && isRolledBackCourse(n))
                .map((n) => n.data?.groupId)
                .filter(Boolean);
            if (groupIds.length > 0) {
                let currentNodes = updated;
                for (const groupId of [...new Set(groupIds)]) {
                    const groupCourses = currentNodes.filter((n) => n.type === "course" && n.data?.groupId === groupId);
                    const allDone = groupCourses.length > 0 && groupCourses.every((n) => n.data?.status === "done");
                    currentNodes = currentNodes.map((n) => {
                        if (n.type === "moduleBg" && n.id === groupId) {
                            return { ...n, data: { ...n.data, status: allDone ? "done" : "in_plan" } };
                        }
                        return n;
                    });
                }
                return currentNodes;
            }
            return updated;
        });
    }, [rollbackCourseDone, setNodes]);

    return { rollbackAddedCourses, rollbackMovedCourses, rollbackCourseStatusToggle };
}
