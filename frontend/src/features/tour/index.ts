/**
 * The onboarding tour: the current step and the panels each step expects open.
 * The hook is given the panel setters rather than owning them, since they
 * belong to the planner and outlive the tour.
 */

export { useOnboardingTour } from "./useOnboardingTour.ts";
export type {
    TourUser,
    UseOnboardingTourInput,
    UseOnboardingTourResult,
} from "./useOnboardingTour.ts";
