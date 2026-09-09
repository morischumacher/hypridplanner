/**
 * The courses a programme offers and the terms they run in.
 *
 * The two hooks are kept separate: the fetch is the planner's first request,
 * while term resolution needs the profile overrides, which arrive later.
 */

export { useCatalogue } from "./useCatalogue.ts";
export type {
    CatalogueCourseEntry,
    CatalogueModuleMeta,
    UseCatalogueInput,
    UseCatalogueResult,
} from "./useCatalogue.ts";
export { useEffectiveCourseTerms } from "./useEffectiveCourseTerms.ts";
export type {
    UseEffectiveCourseTermsInput,
    UseEffectiveCourseTermsResult,
} from "./useEffectiveCourseTerms.ts";
