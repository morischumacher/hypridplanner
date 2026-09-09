/**
 * The two points a prebuilt plan is offered: an empty planner, and a focus-area
 * change on a bachelor plan already started.
 *
 * The second offer fires only on a focus change alone. A programme switch also
 * changes the focus, but that is a different plan, not a reconsidered one.
 */

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { BACHELOR_PROGRAM_CODE } from "../../domain/programmes.ts";

/** The focus the offer concerns, or null when no offer is standing. */
export type FocusPrefillPrompt = { focus: string } | null;

export interface UsePrefillPromptsResult {
    focusPrefillPrompt: FocusPrefillPrompt;
    setFocusPrefillPrompt: Dispatch<SetStateAction<FocusPrefillPrompt>>;
    /** True once the empty-planner offer has been answered either way. */
    dismissedInitialPrefillPrompt: boolean;
    setDismissedInitialPrefillPrompt: Dispatch<SetStateAction<boolean>>;
}

/**
 * Whether either offer is standing. Kept apart from the effect that raises the
 * focus offer, which the dashboard reads first when deciding the other offer.
 */
export function usePrefillPrompts(): UsePrefillPromptsResult {
    const [focusPrefillPrompt, setFocusPrefillPrompt] = useState<FocusPrefillPrompt>(null);
    const [dismissedInitialPrefillPrompt, setDismissedInitialPrefillPrompt] = useState(false);

    return {
        focusPrefillPrompt,
        setFocusPrefillPrompt,
        dismissedInitialPrefillPrompt,
        setDismissedInitialPrefillPrompt,
    };
}

export interface UseFocusPrefillOfferInput {
    plannerHydrated: boolean;
    programCode: string;
    selectedFocus: string;
    /** Whether there is a plan to replace; an empty planner gets the other offer. */
    hasAnyPlannedOrDoneCourses: boolean;
    setFocusPrefillPrompt: Dispatch<SetStateAction<FocusPrefillPrompt>>;
    setDismissedInitialPrefillPrompt: Dispatch<SetStateAction<boolean>>;
}

export function useFocusPrefillOffer({
    plannerHydrated,
    programCode,
    selectedFocus,
    hasAnyPlannedOrDoneCourses,
    setFocusPrefillPrompt,
    setDismissedInitialPrefillPrompt,
}: UseFocusPrefillOfferInput): void {
    const focusSelectionTrackerRef = useRef({ programCode, selectedFocus });

    useEffect(() => {
        setFocusPrefillPrompt(null);
        setDismissedInitialPrefillPrompt(false);
    }, [programCode]);

    useEffect(() => {
        const previous = focusSelectionTrackerRef.current;
        const programChanged = previous?.programCode !== programCode;
        const focusChanged = previous?.selectedFocus !== selectedFocus;
        focusSelectionTrackerRef.current = { programCode, selectedFocus };
        if (!plannerHydrated) return;
        if (programChanged || !focusChanged) return;
        if (programCode !== BACHELOR_PROGRAM_CODE) return;
        if (!hasAnyPlannedOrDoneCourses) return;
        setFocusPrefillPrompt({ focus: selectedFocus || "" });
    }, [hasAnyPlannedOrDoneCourses, plannerHydrated, programCode, selectedFocus]);
}
