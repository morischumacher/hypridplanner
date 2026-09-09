/**
 * The compliance loop's three banners: the refusal, the milestone, and the
 * confirmation that fades.
 *
 * Each carries its own expiry rather than being cleared by whoever raised it,
 * because the raising events arrive from the network and can arrive twice. The
 * watching effect re-arms on every new banner.
 */

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { RuleCheckState } from "../../domain/programmes.ts";

/** A banner shown until its expiry passes. */
export interface StickyViolation {
    message: string;
    /** When the banner comes down, as a timestamp. */
    until: number;
    /** "error" or "success"; the dashboard turns it into colours. */
    tone: string;
}

const NO_STICKY_VIOLATION: StickyViolation = { message: "", until: 0, tone: "" };

export interface UseStickyViolationResult {
    stickyViolation: StickyViolation;
    setStickyViolation: Dispatch<SetStateAction<StickyViolation>>;
}

/**
 * The banner a refused change raises. Kept apart from the effect that clears
 * it, because it is raised from many call sites before the loop is reached.
 */
export function useStickyViolation(): UseStickyViolationResult {
    const [stickyViolation, setStickyViolation] = useState<StickyViolation>(NO_STICKY_VIOLATION);
    return { stickyViolation, setStickyViolation };
}

/** Takes the banner down at its stated expiry. */
export function useStickyViolationExpiry(
    stickyViolation: StickyViolation,
    setStickyViolation: Dispatch<SetStateAction<StickyViolation>>
): void {
    useEffect(() => {
        if (!stickyViolation?.message) return;
        const waitMs = Math.max(0, (stickyViolation.until || 0) - Date.now());
        const t = window.setTimeout(() => {
            setStickyViolation({ message: "", until: 0, tone: "" });
        }, waitMs);
        return () => window.clearTimeout(t);
    }, [stickyViolation]);
}

/** The completion percentages that raise a milestone banner. */
const MILESTONES = [25, 50, 75, 100];

/**
 * The highest milestone crossed between two percentages, or null.
 *
 * Several can be crossed at once: hydration goes from nothing to the saved
 * plan, and a prefill lays down a whole degree. The banner must name the
 * milestone actually reached, or it contradicts the ECTS figures beside it.
 */
export function highestMilestoneCrossed(previousPct: number, currentPct: number): number | null {
    let highest: number | null = null;
    for (const milestone of MILESTONES) {
        if (previousPct < milestone && currentPct >= milestone) highest = milestone;
    }
    return highest;
}

export interface UseProgressMilestoneInput {
    plannerHydrated: boolean;
    programCode: string;
    targetEctsKpi: number;
    totalEctsKpi: number;
    totalPctKpi: number;
}

export interface UseProgressMilestoneResult {
    /** Empty when no milestone has been crossed. */
    progressMilestoneText: string;
}

/**
 * Raises a banner the first time a plan crosses a milestone.
 *
 * The last percentage is remembered per programme, and a newly switched-to
 * programme only records its figure, so a switch is never itself a crossing.
 */
export function useProgressMilestone({
    plannerHydrated,
    programCode,
    targetEctsKpi,
    totalEctsKpi,
    totalPctKpi,
}: UseProgressMilestoneInput): UseProgressMilestoneResult {
    const [progressMilestone, setProgressMilestone] = useState<{ text: string; until: number }>({
        text: "",
        until: 0,
    });
    const progressMilestoneRef = useRef<{ programCode: string | null; pct: number }>({
        programCode: null,
        pct: 0,
    });

    useEffect(() => {
        if (!plannerHydrated) return;
        const last = progressMilestoneRef.current;
        const roundedPct = Math.round(totalPctKpi);
        if (last?.programCode !== programCode) {
            progressMilestoneRef.current = { programCode, pct: roundedPct };
            return;
        }
        const crossed = highestMilestoneCrossed(last.pct, roundedPct);
        progressMilestoneRef.current = { programCode, pct: roundedPct };
        if (!crossed) return;
        setProgressMilestone({
            text: `Milestone reached: ${crossed}% completion (${totalEctsKpi.toFixed(1)}/${targetEctsKpi.toFixed(1)} ECTS).`,
            until: Date.now() + 3000,
        });
    }, [plannerHydrated, programCode, targetEctsKpi, totalEctsKpi, totalPctKpi]);

    useEffect(() => {
        if (!progressMilestone?.text) return;
        const waitMs = Math.max(0, (progressMilestone.until || 0) - Date.now());
        const t = window.setTimeout(() => {
            setProgressMilestone({ text: "", until: 0 });
        }, waitMs);
        return () => window.clearTimeout(t);
    }, [progressMilestone]);

    return { progressMilestoneText: progressMilestone?.text || "" };
}

/** The two reply fields this banner reads. */
interface RuleCheckReply {
    ok?: boolean;
    message?: string;
}

export interface UseTransientSuccessFeedbackInput {
    programCode: string;
    /** True while a refusal is on screen; it outranks a confirmation. */
    stickyActive: boolean;
    ruleCheckState: RuleCheckState;
}

export interface UseTransientSuccessFeedbackResult {
    isRuleSuccessFeedback: boolean;
    showTransientSuccessFeedback: boolean;
}

/**
 * Hides the "all rules met" banner three seconds after it appears and brings it
 * back on the next answer. A fresh answer is identified by programme, time and
 * message rather than by the state object, so a repeated answer still shows.
 */
export function useTransientSuccessFeedback({
    programCode,
    stickyActive,
    ruleCheckState,
}: UseTransientSuccessFeedbackInput): UseTransientSuccessFeedbackResult {
    const [showTransientSuccessFeedback, setShowTransientSuccessFeedback] = useState(true);
    const successFeedbackSignatureRef = useRef("");

    const response = ruleCheckState?.response as RuleCheckReply | null | undefined;
    const isRuleSuccessFeedback =
        !stickyActive &&
        !ruleCheckState?.sending &&
        !ruleCheckState?.error &&
        Boolean(response?.ok);

    useEffect(() => {
        if (!isRuleSuccessFeedback) {
            setShowTransientSuccessFeedback(true);
            return;
        }
        const signature = `${programCode}:${ruleCheckState?.lastUpdatedAt ?? ""}:${response?.message ?? ""}`;
        if (successFeedbackSignatureRef.current !== signature) {
            successFeedbackSignatureRef.current = signature;
            setShowTransientSuccessFeedback(true);
        }
        const t = window.setTimeout(() => setShowTransientSuccessFeedback(false), 3000);
        return () => window.clearTimeout(t);
    }, [
        programCode,
        isRuleSuccessFeedback,
        ruleCheckState?.lastUpdatedAt,
        response?.message,
    ]);

    return { isRuleSuccessFeedback, showTransientSuccessFeedback };
}
