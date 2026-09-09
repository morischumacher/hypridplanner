/**
 * The guided tour: the current step, whether the tour has been completed
 * before, and the planner arrangement each step needs.
 *
 * A step moves only the panels it names; anything it says nothing about is left
 * as the previous step left it.
 */

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

/** The part of the signed-in user the tour reads. */
export interface TourUser {
    username?: string | null;
}

export interface UseOnboardingTourInput {
    currentUser: TourUser | null | undefined;
    setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
    setIsRecPanelOpen: Dispatch<SetStateAction<boolean>>;
    setIsRuleDashboardOpen: Dispatch<SetStateAction<boolean>>;
    setIsProfileOpen: Dispatch<SetStateAction<boolean>>;
}

export interface UseOnboardingTourResult {
    /** The step on screen, or null when no tour is running. */
    activeTourStep: number | null;
    setActiveTourStep: Dispatch<SetStateAction<number | null>>;
    tourCompleted: boolean;
}

export function useOnboardingTour({
    currentUser,
    setIsSidebarOpen,
    setIsRecPanelOpen,
    setIsRuleDashboardOpen,
    setIsProfileOpen,
}: UseOnboardingTourInput): UseOnboardingTourResult {
    const [activeTourStep, setActiveTourStep] = useState<number | null>(null);
    const [tourCompleted, setTourCompleted] = useState(true);

    // The tour writes the completion flag on the way out rather than reporting
    // back, so it is re-read on every step change and the help button settles
    // as soon as the last step closes.
    useEffect(() => {
        if (currentUser?.username) {
            const completedKey = "study-planner-tour-completed-" + currentUser.username;
            setTourCompleted(localStorage.getItem(completedKey) === "true");
        } else {
            setTourCompleted(true);
        }
    }, [currentUser, activeTourStep]);

    useEffect(() => {
        if (activeTourStep === null) return;
        if (activeTourStep === 0) {
            setIsSidebarOpen(true);
            setIsRecPanelOpen(false);
            setIsRuleDashboardOpen(false);
            setIsProfileOpen(false);
        } else if (activeTourStep === 5) {
            setIsRecPanelOpen(false);
        } else if (activeTourStep === 6) {
            setIsRecPanelOpen(true);
            setIsRuleDashboardOpen(false);
        } else if (activeTourStep === 7) {
            setIsRecPanelOpen(false);
            setIsRuleDashboardOpen(false);
        } else if (activeTourStep === 8) {
            setIsRuleDashboardOpen(true);
            setIsProfileOpen(false);
        } else if (activeTourStep === 9) {
            setIsRuleDashboardOpen(false);
            setIsProfileOpen(false);
        } else if (activeTourStep === 10) {
            setIsProfileOpen(true);
        } else if (activeTourStep === 11) {
            setIsProfileOpen(false);
        }
    }, [activeTourStep]);

    return { activeTourStep, setActiveTourStep, tourCompleted };
}
