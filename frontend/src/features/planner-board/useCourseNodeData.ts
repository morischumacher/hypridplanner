/**
 * Keeps a course card's node data in step with the plan.
 *
 * A card reads everything off its node, so notes, grades, target semesters and
 * handlers are all written onto it. The effect runs on every node-array change,
 * so each write is guarded by a comparison to avoid a loop.
 *
 * The two "add to plan" handlers are written only where a node has none, so a
 * card built with its own handler keeps it.
 */

import { useEffect } from "react";

import type { CourseMeta } from "../../domain/plan/state.ts";
import type { TermAvailability } from "../../domain/terms.ts";
import type { RecommendedCourse } from "../recommendations/index.ts";
import type {
    AddCourseToPlan,
    AddModuleToPlan,
    BoardNode,
    CourseMetaPatch,
    SemesterOption,
} from "./types.ts";

/** Compares a menu entry with the one already on the node. */
function semesterSignature(semesters: readonly SemesterOption[]): string {
    return semesters
        .map((semester) => `${Number(semester?.id) || 0}:${semester?.title || ""}:${semester?.isParking ? 1 : 0}:${semester?.isPlus ? 1 : 0}`)
        .join("|");
}

export interface UseCourseNodeDataInput {
    nodes: BoardNode[];
    setNodes: (update: (nodes: BoardNode[]) => BoardNode[]) => void;
    courseMetaByCode: Record<string, CourseMeta> | null | undefined;
    getCourseMeta: (courseCode: string) => CourseMeta;
    updateCourseMeta: (courseCode: string | null | undefined, patch: CourseMetaPatch) => void;
    addGraphCourseToPlan: AddCourseToPlan;
    addGraphModuleToPlan: AddModuleToPlan;
    validSemestersForCourse: (courseCode: string | null | undefined) => SemesterOption[];
    recommendedCourseMap: Map<string, RecommendedCourse>;
    termAvailabilityForCode: (courseCode: string) => TermAvailability;
}

export function useCourseNodeData({
    nodes,
    setNodes,
    courseMetaByCode,
    getCourseMeta,
    updateCourseMeta,
    addGraphCourseToPlan,
    addGraphModuleToPlan,
    validSemestersForCourse,
    recommendedCourseMap,
    termAvailabilityForCode,
}: UseCourseNodeDataInput): void {
    useEffect(() => {
        setNodes((prev) => {
            let changed = false;
            const next = prev.map((node) => {
                if (node?.type !== "course") return node;
                const code = String(node?.data?.code || "").trim();
                if (!code) return node;
                const meta = getCourseMeta(code);
                const nextNotes = String(meta?.notes ?? "");
                const nextEstimatedHours = String(meta?.estimatedHours ?? "");
                const nextGrade = String(meta?.grade ?? "");
                const nextSemesters = validSemestersForCourse(code).map((semester) => ({
                    ...semester,
                    title: semester?.title ?? `Semester ${semester?.id}`,
                }));
                const needsAddToPlanHandler = typeof node?.data?.onAddToPlan !== "function";
                const needsAddModuleToPlanHandler = typeof node?.data?.onAddModuleToPlan !== "function";
                const currentSemesterSig = semesterSignature(Array.isArray(node?.data?.semesters) ? node.data.semesters : []);
                const nextSemesterSig = semesterSignature(nextSemesters);
                const nextTermAvailability = termAvailabilityForCode(code);
                if (
                    node?.data?.notes === nextNotes &&
                    String(node?.data?.estimatedHours ?? "") === nextEstimatedHours &&
                    String(node?.data?.grade ?? "") === nextGrade &&
                    node?.data?.onUpdateCourseMeta === updateCourseMeta &&
                    !needsAddToPlanHandler &&
                    !needsAddModuleToPlanHandler &&
                    currentSemesterSig === nextSemesterSig &&
                    node?.data?.termAvailability === nextTermAvailability
                ) {
                    return node;
                }
                changed = true;
                return {
                    ...node,
                    data: {
                        ...node.data,
                        notes: nextNotes,
                        estimatedHours: nextEstimatedHours,
                        grade: nextGrade,
                        onUpdateCourseMeta: updateCourseMeta,
                        onAddToPlan: needsAddToPlanHandler ? addGraphCourseToPlan : node?.data?.onAddToPlan,
                        onAddModuleToPlan: needsAddModuleToPlanHandler ? addGraphModuleToPlan : node?.data?.onAddModuleToPlan,
                        semesters: nextSemesters,
                        recommendation: recommendedCourseMap.get(code) || null,
                        termAvailability: nextTermAvailability,
                    },
                };
            });
            return changed ? next : prev;
        });
    }, [addGraphCourseToPlan, addGraphModuleToPlan, courseMetaByCode, getCourseMeta, nodes, setNodes, updateCourseMeta, validSemestersForCourse, recommendedCourseMap, termAvailabilityForCode]);
}
