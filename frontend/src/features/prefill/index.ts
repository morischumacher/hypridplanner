/**
 * The prebuilt plans and the two points they are offered at. Applying one
 * replaces the whole plan, so offers are kept apart from appliers: an offer
 * needs to know whether there is anything to replace.
 */

export { default as PrefillNotifications } from "./PrefillNotifications.tsx";
export type { PrefillNotificationsProps } from "./PrefillNotifications.tsx";

export { useFocusPrefillOffer, usePrefillPrompts } from "./usePrefillPrompts.ts";
export type {
    FocusPrefillPrompt,
    UseFocusPrefillOfferInput,
    UsePrefillPromptsResult,
} from "./usePrefillPrompts.ts";

export { usePrefilledPlans } from "./usePrefilledPlans.ts";
export type {
    PrefillNode,
    PrefillNodeData,
    UsePrefilledPlansInput,
    UsePrefilledPlansResult,
} from "./usePrefilledPlans.ts";
