// @vitest-environment jsdom
/**
 * The season a semester lane is in.
 *
 * The lanes alternate from the season the student began in, and a season-locked
 * course fits only half of them. The tool held both facts and showed only one of
 * them: the course's own term was on its card, the lane's season was nowhere, so
 * the comparison the student had to make was left to mental arithmetic. This
 * pins the season onto the lane node, which is what LaneColumn renders.
 */
import { describe, expect, it } from "vitest";

import { useBoardNodes } from "../../src/features/planner-board/useBoardNodes.ts";
import type { UseBoardNodesInput } from "../../src/features/planner-board/useBoardNodes.ts";
import type { BoardNode } from "../../src/features/planner-board/types.ts";
import { renderHook } from "./support/render-hook.ts";

function laneSeasons(startTermSeason: string, semesterCount: number): (string | undefined)[] {
    const semesters = Array.from({ length: semesterCount }, (_, i) => ({
        id: i + 1,
        title: `Semester ${i + 1}`,
    }));
    const input = {
        semesters,
        coursesBySemester: {},
        parkedCourseCodes: [],
        catalogCourseByCode: new Map(),
        laneInsightsBySemester: {},
        setSemesterNote: () => undefined,
        viewMode: "table",
        verticalSemantics: "no_meaning",
        startTermSeason,
        resolveLaneCollisions: (nodes: BoardNode[]) => nodes,
    } as unknown as UseBoardNodesInput;
    const harness = renderHook((props: UseBoardNodesInput) => useBoardNodes(props), input);
    return harness.current.laneNodes
        .filter((node) => !node.data?.isParking)
        .map((node) => node.data?.season);
}

describe("semester lanes carry their own season", () => {
    it("alternates from a winter start", () => {
        expect(laneSeasons("winter", 4)).toEqual(["winter", "summer", "winter", "summer"]);
    });

    it("alternates from a summer start", () => {
        expect(laneSeasons("summer", 4)).toEqual(["summer", "winter", "summer", "winter"]);
    });

    it("leaves the parking stage without a season", () => {
        const semesters = [{ id: 1, title: "Semester 1" }];
        const input = {
            semesters,
            coursesBySemester: {},
            parkedCourseCodes: [],
            catalogCourseByCode: new Map(),
            laneInsightsBySemester: {},
            setSemesterNote: () => undefined,
            viewMode: "table",
            verticalSemantics: "no_meaning",
            startTermSeason: "winter",
            resolveLaneCollisions: (nodes: BoardNode[]) => nodes,
        } as unknown as UseBoardNodesInput;
        const harness = renderHook((props: UseBoardNodesInput) => useBoardNodes(props), input);
        const parking = harness.current.laneNodes.find((node) => node.data?.isParking);
        expect(parking?.data?.season).toBe(undefined);
    });
});
