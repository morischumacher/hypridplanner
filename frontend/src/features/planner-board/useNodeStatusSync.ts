/**
 * Mirrors done and parked status from the plan onto the cards.
 *
 * The plan owns status, the canvas owns position, so this is the one direction
 * in which the plan patches a node without rebuilding it. A module panel takes
 * the status its cards agree on and keeps its own when they do not, so an empty
 * panel is skipped rather than reset.
 */

import { useEffect } from "react";

import type { BoardNode } from "./types.ts";

/** Tally of a module panel's cards by status. */
interface GroupStatusTally {
    total: number;
    done: number;
    parked: number;
}

export interface UseNodeStatusSyncInput {
    doneCourseCodes: readonly string[] | null | undefined;
    parkedCourseCodes: readonly string[] | null | undefined;
    setNodes: (update: (nodes: BoardNode[]) => BoardNode[]) => void;
}

export function useNodeStatusSync({
    doneCourseCodes,
    parkedCourseCodes,
    setNodes,
}: UseNodeStatusSyncInput): void {
    useEffect(() => {
        const doneSet = new Set(doneCourseCodes || []);
        const parkedSet = new Set(parkedCourseCodes || []);
        const statusForCode = (code: string | null | undefined) => {
            if (code == null) return "in_plan";
            if (parkedSet.has(code)) return "parked";
            return doneSet.has(code) ? "done" : "in_plan";
        };
        setNodes((prev) => {
            const groupStatuses = new Map<string, GroupStatusTally>();
            for (const n of prev) {
                if (n.type !== "course" || !n?.data?.groupId) continue;
                const groupId = n.data.groupId;
                const nextCourseStatus = statusForCode(n?.data?.code);
                const current = groupStatuses.get(groupId) || { total: 0, done: 0, parked: 0 };
                current.total += 1;
                if (nextCourseStatus === "done") current.done += 1;
                if (nextCourseStatus === "parked") current.parked += 1;
                groupStatuses.set(groupId, current);
            }

            return prev.map((n) => {
                if (n.type === "course") {
                    const status = statusForCode(n?.data?.code);
                    if (n?.data?.status === status) return n;
                    return { ...n, data: { ...n.data, status } };
                }
                if (n.type === "moduleBg") {
                    const group = groupStatuses.get(n.id);
                    if (!group || group.total <= 0) return n;
                    const status = group.done === group.total
                        ? "done"
                        : (group.parked === group.total ? "parked" : "in_plan");
                    if (n?.data?.status === status) return n;
                    return { ...n, data: { ...n.data, status } };
                }
                return n;
            });
        });
    }, [doneCourseCodes, parkedCourseCodes, setNodes]);
}
