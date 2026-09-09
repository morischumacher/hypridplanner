/**
 * Profile: programme, start term, course term overrides and recommendation
 * preferences, plus the two modals that edit them.
 *
 * Call the hooks in this order. The form seeds its drafts from the mirror the
 * settings hook holds whenever a modal opens.
 */

export { default as ProfileModal } from "./ProfileModal.tsx";
export type { ProfileModalProps } from "./ProfileModal.tsx";
export { default as SignupSetupModal } from "./SignupSetupModal.tsx";
export type { SignupSetupModalProps } from "./SignupSetupModal.tsx";
export { useProfileForm } from "./useProfileForm.ts";
export type {
    PlannerSnapshot,
    ProfileCourseRow,
    StickyViolation,
    UseProfileFormInput,
    UseProfileFormResult,
} from "./useProfileForm.ts";
export { useProfileSettings } from "./useProfileSettings.ts";
export type {
    ProfileSettings,
    ProfileSettingsByProgram,
    StartTerm,
    UseProfileSettingsInput,
    UseProfileSettingsResult,
} from "./useProfileSettings.ts";
