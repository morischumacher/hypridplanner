/**
 * The planning canvas: the node array, its mutations, and the component that
 * draws it.
 *
 * The parts are exported separately because call order fixes effect order, and
 * the planner depends on it: lane backgrounds are spliced in before anything
 * reads a lane height, placement mutations exist before the cards calling them
 * are patched, the pending-save commit runs before the status roll-up that
 * would overwrite it, and the rebuild from a stored plan comes last, after
 * every handler it wires onto a card exists.
 *
 * The node array is the source of truth; the plan is derived from it, and
 * writes back only on a programme change.
 */

export { useBoardSemesters } from "./useBoardSemesters.ts";
export type {
    UseBoardSemestersInput,
    UseBoardSemestersResult,
} from "./useBoardSemesters.ts";

export { usePlacementRules } from "./usePlacementRules.ts";
export type {
    UsePlacementRulesInput,
    UsePlacementRulesResult,
} from "./usePlacementRules.ts";

export { useBoardLayout } from "./node-layout.ts";
export type { UseBoardLayoutInput, UseBoardLayoutResult } from "./node-layout.ts";

export { useBoardNodes } from "./useBoardNodes.ts";
export type {
    BoardFlowInstance,
    UseBoardNodesInput,
    UseBoardNodesResult,
} from "./useBoardNodes.ts";

export { useCourseCardActions } from "./useCourseCardActions.ts";
export type {
    UseCourseCardActionsInput,
    UseCourseCardActionsResult,
} from "./useCourseCardActions.ts";

export { useCoursePlacement } from "./useCoursePlacement.ts";
export type {
    ParkRequest,
    UseCoursePlacementInput,
    UseCoursePlacementResult,
} from "./useCoursePlacement.ts";

export { useCatalogueActions } from "./useCatalogueActions.ts";
export type {
    UseCatalogueActionsInput,
    UseCatalogueActionsResult,
} from "./useCatalogueActions.ts";

export { useCourseNodeData } from "./useCourseNodeData.ts";
export type { UseCourseNodeDataInput } from "./useCourseNodeData.ts";

export { useBoardDragHandlers } from "./useBoardDragHandlers.ts";
export type {
    UseBoardDragHandlersInput,
    UseBoardDragHandlersResult,
} from "./useBoardDragHandlers.ts";

export { useNodeStatusSync } from "./useNodeStatusSync.ts";
export type { UseNodeStatusSyncInput } from "./useNodeStatusSync.ts";

export { useTermAutoShift } from "./useTermAutoShift.ts";
export type { UseTermAutoShiftInput } from "./useTermAutoShift.ts";

export { useBoardHydration } from "./useBoardHydration.ts";
export type { UseBoardHydrationInput } from "./useBoardHydration.ts";

export { default as PlannerBoard } from "./PlannerBoard.tsx";
export type { PlannerBoardProps, TableInteractionMode } from "./PlannerBoard.tsx";

export type {
    AddCourseToPlan,
    AddModuleToPlan,
    BoardModuleMeta,
    BoardNode,
    BoardNodeData,
    CourseLike,
    CourseMetaPatch,
    DragPayload,
    LaneCourseNote,
    LaneInsight,
    ModulePayload,
    PlacementOptions,
    SemesterOption,
} from "./types.ts";
