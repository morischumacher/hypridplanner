/**
 * Adapters over the layout functions in `domain/nodes`.
 *
 * The domain node type covers only the fields layout reasons about; the canvas
 * node type covers everything stored on a node, handlers included. Neither is a
 * subtype of the other, so the cast is confined here. It is sound because the
 * layout functions copy untouched fields through.
 */

import { useCallback, useMemo } from "react";

import {
    compactPrefillLayout as compactPrefillLayoutBase,
    laneIdx as laneIdxBase,
    recomputeGroupFromChildren as recomputeGroupFromChildrenBase,
    resolveGroupCourseOverlaps as resolveGroupCourseOverlapsBase,
    resolveLaneCollisions as resolveLaneCollisionsBase,
} from "../../domain/nodes.ts";
import type { LaneLayoutOptions, VerticalSemantics } from "../../domain/nodes.ts";
import type { PlanNode } from "../../domain/types.ts";
import type { BoardNode } from "./types.ts";

function asPlanNodes(nodes: readonly BoardNode[]): PlanNode[] {
    return nodes as unknown as PlanNode[];
}

function asBoardNodes(nodes: readonly PlanNode[]): BoardNode[] {
    return nodes as unknown as BoardNode[];
}

/** The lane a node sits in; -1 is the parking stage. */
export function laneIdx(node: BoardNode | null | undefined): number {
    return laneIdxBase(node as PlanNode | null | undefined);
}

/** Resizes a module panel around the cards it holds, or drops an emptied one. */
export function recomputeGroupFromChildren(nodes: readonly BoardNode[], groupId: string): BoardNode[] {
    return asBoardNodes(recomputeGroupFromChildrenBase(asPlanNodes(nodes), groupId));
}

/** Stacks one module's cards so none covers another. */
export function resolveGroupCourseOverlaps(nodes: readonly BoardNode[], groupId: string): BoardNode[] {
    return asBoardNodes(resolveGroupCourseOverlapsBase(asPlanNodes(nodes), groupId));
}

export interface UseBoardLayoutInput {
    maxSemesterCount: number;
    minModuleGroupTopY: number;
    /** What the vertical order within a lane encodes. */
    verticalSemantics: VerticalSemantics;
}

export interface UseBoardLayoutResult {
    compactPrefillLayout: (nodes: BoardNode[]) => BoardNode[];
    resolveLaneCollisions: (nodes: BoardNode[]) => BoardNode[];
}

/**
 * Binds the two whole-canvas layout passes to the current lane geometry. Both
 * are memoised because callers hold them in dependency lists.
 */
export function useBoardLayout({
    maxSemesterCount,
    minModuleGroupTopY,
    verticalSemantics,
}: UseBoardLayoutInput): UseBoardLayoutResult {
    const flowLayoutOptions = useMemo<LaneLayoutOptions>(() => ({
        maxSemesterCount,
        minModuleGroupTopY,
        verticalSemantics,
    }), [maxSemesterCount, minModuleGroupTopY, verticalSemantics]);

    const compactPrefillLayout = useCallback(
        (allNodes: BoardNode[]) => asBoardNodes(compactPrefillLayoutBase(asPlanNodes(allNodes), flowLayoutOptions)),
        [flowLayoutOptions]
    );

    const resolveLaneCollisions = useCallback(
        (allNodes: BoardNode[]) => asBoardNodes(resolveLaneCollisionsBase(asPlanNodes(allNodes), flowLayoutOptions)),
        [flowLayoutOptions]
    );

    return { compactPrefillLayout, resolveLaneCollisions };
}
