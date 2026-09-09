/**
 * Shared domain types. The catalogue types describe the output of
 * `normalizeCatalog`, not the raw backend payload.
 */

/** A point in React Flow's coordinate space, not in screen pixels. */
export interface Point {
    x: number;
    y: number;
}

/** A course as it appears once the catalogue has been normalised. */
export interface CatalogueCourse {
    name: string;
    code: string;
    ects: number | null;
    /** Teaching format such as "VU". Null where the backend left it blank. */
    type: string | null;
    /** Unnormalised case; run through `normalizeTermAvailability` before comparing. */
    termAvailability: string;
}

/** The unit a requirement is written against. snake_case fields are the backend's own. */
export interface CatalogueModule {
    code: string;
    name: string;
    ects: number;
    category: string | null;
    is_mandatory: boolean;
    module_exam_subject: string | null;
    courses: CatalogueCourse[];
}

/** An exam subject (Prüfungsfach) and the modules counted towards it. */
export interface CatalogueSubject {
    pruefungsfach: string;
    modules: CatalogueModule[];
}

export type Catalogue = CatalogueSubject[];

/**
 * A catalogue course lifted out of its module. The `_norm*` strings are
 * precomputed because prefill matches every alias against every course.
 */
export interface FlattenedCourse {
    code: string;
    name: string;
    ects: number | null;
    category: string;
    examSubject: string | null;
    moduleName?: string | null;
    moduleCode?: string | null;
    moduleEcts?: number | null;
    _normCode: string;
    _normName: string;
    _normModule: string;
}

/** One entry of a prefill template: the aliases to match, and where it lands. */
export interface PrefillTemplateItem {
    semester: number;
    aliases: string[];
    ects?: number;
    /** Keeps the entry in its stated semester when a summer start would move it. */
    prefillFixedSemester?: boolean;
}

/** One line of a prefilled plan. */
export interface PlannedCourse {
    semester: number;
    code: string;
    name: string;
    ects: number | null;
    category: string;
    examSubject: string | null;
}

/** The module a prefilled bachelor course belongs to, as the planner groups it. */
export interface PlannedModule {
    key: string;
    title: string;
    code: string | null;
    ects: number | null;
    category: string;
}

export interface BachelorPlannedCourse extends PlannedCourse {
    prefillFixedSemester: boolean;
    module: PlannedModule;
}

/** Module data on a course card. Only the id survives a collapsed module panel. */
export interface CourseModuleMeta {
    id: string;
    title?: string | undefined;
    examSubject?: string | null | undefined;
    category?: string | undefined;
    subjectColor?: string | null | undefined;
    code?: string | null | undefined;
    ects?: number | null | undefined;
}

/**
 * Data on a canvas node. Course cards, module panels and lane backgrounds share
 * this shape but read disjoint fields, hence all-optional.
 */
export interface PlanNodeData {
    groupId?: string | undefined;
    status?: string | undefined;
    code?: string | undefined;
    name?: string | undefined;
    label?: string | undefined;
    title?: string | undefined;
    /** Teaching format such as "VU", not the node's kind. */
    type?: string | undefined;
    category?: string | undefined;
    examSubject?: string | null | undefined;
    subjectColor?: string | null | undefined;
    ects?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
    moduleCode?: string | null | undefined;
    moduleEcts?: number | null | undefined;
    moduleMeta?: CourseModuleMeta | undefined;
    moduleCourseCount?: number | undefined;
    moduleCourseCodes?: string[] | undefined;
}

/** A node on the planning canvas. */
export interface PlanNode {
    id: string;
    type?: string | undefined;
    position: Point;
    data?: PlanNodeData | undefined;
    zIndex?: number | undefined;
}
