/**
 * The rule checker's last answer, one per programme.
 *
 * Answers are filed under the programme they were asked about rather than kept
 * as a single value: a check can still be in flight across a programme switch,
 * and a late answer must not be shown against the other curriculum's plan.
 */

import { useCallback, useState } from "react";

import { EMPTY_RULE_CHECK_STATE } from "../../domain/programmes.ts";
import type { RuleCheckState } from "../../domain/programmes.ts";

/** A replacement entry, or a function from the current one to it. */
export type RuleCheckStateUpdate = RuleCheckState | ((current: RuleCheckState) => RuleCheckState);

/** Writes one programme's entry; an unasked programme has none. */
export type SetProgramRuleCheckState = (
    targetProgramCode: string,
    updater: RuleCheckStateUpdate
) => void;

export interface UseRuleCheckStateInput {
    programCode: string;
}

export interface UseRuleCheckStateResult {
    /** The current programme's answer, or the empty state before it has one. */
    ruleCheckState: RuleCheckState;
    setProgramRuleCheckState: SetProgramRuleCheckState;
}

export function useRuleCheckState({ programCode }: UseRuleCheckStateInput): UseRuleCheckStateResult {
    const [ruleCheckStateByProgram, setRuleCheckStateByProgram] = useState<Record<string, RuleCheckState>>({});

    const setProgramRuleCheckState = useCallback<SetProgramRuleCheckState>((targetProgramCode, updater) => {
        if (!targetProgramCode) return;
        setRuleCheckStateByProgram((prev) => {
            const current = prev?.[targetProgramCode] ?? EMPTY_RULE_CHECK_STATE;
            const next = typeof updater === "function" ? updater(current) : updater;
            return {
                ...(prev || {}),
                [targetProgramCode]: next,
            };
        });
    }, []);

    const ruleCheckState = ruleCheckStateByProgram?.[programCode] ?? EMPTY_RULE_CHECK_STATE;

    return { ruleCheckState, setProgramRuleCheckState };
}
