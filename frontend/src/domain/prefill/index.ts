/**
 * Prebuilt starting plans. Each programme has its own builder; both return the
 * courses placed and the aliases they could not resolve.
 */

export { buildBachelorPrefillPlan } from "./bachelor-plan.ts";
export type {
    BachelorPrefillOptions,
    BachelorPrefillPlan,
    FocusKey,
} from "./bachelor-plan.ts";

export { buildMasterPrefillPlan } from "./master-plan.ts";
export type { MasterPrefillOptions, MasterPrefillPlan } from "./master-plan.ts";

export { getSplitModuleVariantMeta, resolveModuleVariantCourses } from "./course-variants.ts";
export type {
    ModuleVariantResolution,
    VariantMeta,
    VariantOption,
} from "./course-variants.ts";
