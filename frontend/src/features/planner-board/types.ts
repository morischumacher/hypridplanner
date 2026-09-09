/**
 * What the canvas stores on a React Flow node, plus the payloads the sidebar
 * and curriculum graph pass in.
 *
 * One `data` bag serves all three node kinds, so every field is optional. The
 * handlers live on the bag rather than in props because React Flow renders the
 * node components itself and passes them nothing but their node.
 */

import type { CSSProperties } from "react";

import type { RecommendedCourse } from "../recommendations/index.ts";
import type { CourseModuleMeta, Point } from "../../domain/types.ts";

/**
 * The module a card came from. A catalogue entry names the module's courses, a
 * stored plan entry does not, so readers take whichever part is present.
 */
export interface BoardModuleMeta extends CourseModuleMeta {
    courseCodes?: string[] | undefined;
}

/** A semester as the placement menus list it. */
export interface SemesterOption {
    /** A lane number, zero for the parking stage, or a two-lane window key. */
    id: number | string;
    title: string;
    isParking?: boolean | undefined;
    /** A lane past the plan's current length, offered so the plan can grow. */
    isPlus?: boolean | undefined;
    laneIndex?: number | undefined;
    windowEndLaneIndex?: number | undefined;
}

/** A course note, as its lane header lists it. */
export interface LaneCourseNote {
    code: string;
    name: string;
    note: string;
}

/** What one lane header says beyond its credit total. */
export interface LaneInsight {
    courseNotes: LaneCourseNote[];
    estimatedHoursTotal: number;
    weightedGrade: number | null;
    additionalNote: string;
}

/** A course as passed in by the sidebar, the graph or the catalogue. */
export interface CourseLike {
    code?: string | null | undefined;
    name?: string | null | undefined;
    /** The graph's name for a course with no separate name field. */
    label?: string | null | undefined;
    /** Teaching format such as "VU". */
    type?: string | null | undefined;
    /** The graph's name for `type`, and the only one placement reads. */
    courseType?: string | null | undefined;
    ects?: number | null | undefined;
    category?: string | null | undefined;
    examSubject?: string | null | undefined;
    subjectColor?: string | null | undefined;
    moduleMeta?: BoardModuleMeta | null | undefined;
}

/** A module as passed in by the sidebar or the graph. */
export interface ModulePayload {
    kind?: string | undefined;
    code?: string | null | undefined;
    name?: string | null | undefined;
    ects?: number | null | undefined;
    category?: string | null | undefined;
    examSubject?: string | null | undefined;
    subjectColor?: string | null | undefined;
    courses?: CourseLike[] | undefined;
    variantId?: string | null | undefined;
}

/** How a caller overrides the lane placement would otherwise pick. */
export interface PlacementOptions {
    /**
     * The lane was named explicitly rather than inferred from a drop, so a lane
     * the course cannot be taken in is refused instead of searched past.
     */
    allowDirectLaneSelection?: boolean | undefined;
    variantId?: string | null | undefined;
}

/** What the sidebar puts on the drag event. */
export interface DragPayload {
    kind?: string | undefined;
    code?: string | undefined;
    name?: string | undefined;
    type?: string | null | undefined;
    ects?: number | null | undefined;
    category?: string | null | undefined;
    subjectColor?: string | null | undefined;
    moduleMeta?: BoardModuleMeta | null | undefined;
    courses?: CourseLike[] | undefined;
    variantId?: string | null | undefined;
}

/** Per-course annotations. */
export interface CourseMetaPatch {
    notes?: string | undefined;
    estimatedHours?: string | undefined;
    grade?: string | undefined;
}

export type AddCourseToPlan = (
    course: CourseLike,
    requestedLaneIndex: number,
    options?: PlacementOptions | null
) => boolean;

export type AddModuleToPlan = (
    modulePayload: ModulePayload,
    requestedLaneIndex: number,
    options?: PlacementOptions | null
) => boolean;

/** The fields the canvas writes onto a node. */
export interface BoardNodeData {
    label?: string | undefined;
    title?: string | undefined;
    name?: string | null | undefined;
    code?: string | null | undefined;
    /** Teaching format such as "VU", not the node's kind. */
    type?: string | null | undefined;
    ects?: number | null | undefined;
    status?: string | undefined;
    category?: string | null | undefined;
    examSubject?: string | null | undefined;
    subjectColor?: string | null | undefined;
    programCode?: string | undefined;
    termAvailability?: string | undefined;
    nodeId?: string | undefined;
    groupId?: string | null | undefined;
    moduleMeta?: BoardModuleMeta | null | undefined;
    /** Where a card inside a module panel was first laid out. */
    baseY?: number | undefined;
    notes?: string | undefined;
    estimatedHours?: string | undefined;
    grade?: string | undefined;
    recommendation?: RecommendedCourse | null | undefined;
    semesters?: SemesterOption[] | undefined;

    moduleCode?: string | null | undefined;
    moduleEcts?: number | null | undefined;
    moduleCourseCount?: number | undefined;
    moduleCourseCodes?: string[] | undefined;
    semestersForModule?: SemesterOption[] | undefined;
    modulePayload?: ModulePayload | undefined;
    width?: number | undefined;
    height?: number | undefined;
    /** Set while a card is hidden by a collapsed parking stage. */
    collapsedGhost?: boolean | undefined;

    isParking?: boolean | undefined;
    /** "winter" or "summer" for a semester lane; absent on the parking stage. */
    season?: string | undefined;
    isParkingCollapsed?: boolean | undefined;
    onToggleParkingCollapsed?: (() => void) | undefined;
    even?: boolean | undefined;
    ectsPlanned?: number | undefined;
    semesterId?: number | undefined;
    courseNotes?: LaneCourseNote[] | undefined;
    estimatedHoursTotal?: number | undefined;
    weightedGrade?: number | null | undefined;
    additionalNote?: string | undefined;
    onSetSemesterNote?: ((semesterId: number, note: string) => void) | null | undefined;

    onRemove?: ((nodeId: string) => void) | undefined;
    onRemoveModuleGroup?: ((groupId: string) => void) | undefined;
    onRemoveGroup?: ((groupId: string) => void) | undefined;
    onToggleDone?: ((courseCode: string, nextDone: boolean, nodeId: string) => void) | undefined;
    onUpdateEcts?: ((nodeId: string, nextEcts: number) => void) | undefined;
    onToggleModuleDone?: ((courseCodes: string[], nextDone: boolean, groupId: string) => void) | undefined;
    onAddToPlan?: AddCourseToPlan | undefined;
    onAddModuleToPlan?: AddModuleToPlan | undefined;
    onUpdateCourseMeta?: ((courseCode: string, patch: CourseMetaPatch) => void) | undefined;
}

/** A node on the planning canvas. */
export interface BoardNode {
    id: string;
    /** "course", "moduleBg" or "lane". */
    type?: string | undefined;
    position: Point;
    data?: BoardNodeData | undefined;
    zIndex?: number | undefined;
    hidden?: boolean | undefined;
    selected?: boolean | undefined;
    draggable?: boolean | undefined;
    selectable?: boolean | undefined;
    dragHandle?: string | undefined;
    sourcePosition?: string | undefined;
    targetPosition?: string | undefined;
    style?: CSSProperties | undefined;
}
