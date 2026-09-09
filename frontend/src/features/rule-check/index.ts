/**
 * The compliance loop: the plan goes to the rule checker, and a refused change
 * is taken back off the canvas.
 *
 * The parts are exported separately because call order fixes effect order, and
 * the loop depends on it: rollbacks must exist before the check that may call
 * them, and the check must be sent before its banner may expire.
 */

export { useRuleCheckState } from "./useRuleCheckState.ts";
export type {
    RuleCheckStateUpdate,
    SetProgramRuleCheckState,
    UseRuleCheckStateInput,
    UseRuleCheckStateResult,
} from "./useRuleCheckState.ts";

export {
    useProgressMilestone,
    useStickyViolation,
    useStickyViolationExpiry,
    useTransientSuccessFeedback,
} from "./useRuleCheckFeedback.ts";
export type {
    StickyViolation,
    UseProgressMilestoneInput,
    UseProgressMilestoneResult,
    UseStickyViolationResult,
    UseTransientSuccessFeedbackInput,
    UseTransientSuccessFeedbackResult,
} from "./useRuleCheckFeedback.ts";

export { useRuleCheckRollbacks } from "./useRuleCheckRollbacks.ts";
export type {
    RolledBackChange,
    UseRuleCheckRollbacksInput,
    UseRuleCheckRollbacksResult,
} from "./useRuleCheckRollbacks.ts";

export { useRuleCheckSync } from "./useRuleCheckSync.ts";
export type { UseRuleCheckSyncInput } from "./useRuleCheckSync.ts";
