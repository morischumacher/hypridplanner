/**
 * The stored profile, mirrored from the server one programme at a time.
 *
 * The mirror is keyed by programme code rather than a single record, because
 * the planner switches programme without unmounting and an already-fetched
 * programme must keep answering while the next fetch is in flight.
 *
 * Nothing derived from it is memoised: a programme with no entry reads as a
 * fresh empty object each render, and memoising here would change how often the
 * rest of the planner reacts.
 */

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { fetchProfileSettings } from "../../lib/api.js";
import {
    normalizeStartSeason,
    normalizeTermAvailability,
    TERM_WINTER,
    type Season,
    type TermAvailability,
} from "../../domain/terms.ts";

/** The semester a programme was begun in. */
export interface StartTerm {
    season: Season;
    year: number;
}

/**
 * One programme's profile. All fields are optional: the mirror is written in
 * pieces, and an entry can exist before its fetch has answered.
 */
export interface ProfileSettings {
    startTerm?: StartTerm | null;
    startTermLocked?: boolean;
    courseTermOverrides?: Record<string, TermAvailability>;
    interests?: string[];
    careerDirection?: string;
    /** The backend's field name, kept as-is throughout the planner. */
    recommendation_toggles?: Record<string, boolean>;
}

export type ProfileSettingsByProgram = Record<string, ProfileSettings>;

export interface UseProfileSettingsInput {
    programCode: string;
    setProgramCode?: ((programCode: string) => void) | undefined;
}

export interface UseProfileSettingsResult {
    isProfileOpen: boolean;
    setIsProfileOpen: Dispatch<SetStateAction<boolean>>;
    isSignupSetupOpen: boolean;
    setIsSignupSetupOpen: Dispatch<SetStateAction<boolean>>;
    profileSettingsByProgram: ProfileSettingsByProgram;
    setProfileSettingsByProgram: Dispatch<SetStateAction<ProfileSettingsByProgram>>;
    profileSettingsForProgram: ProfileSettings;
    lockedProgramCode: string | null;
    setLockedProgramCode: Dispatch<SetStateAction<string | null>>;
    startTermSeason: Season;
    startTermYear: number;
    isStartTermLocked: boolean;
    isProgramLocked: boolean;
    courseTermOverrides: Record<string, TermAvailability>;
}

export function useProfileSettings({
    programCode,
    setProgramCode,
}: UseProfileSettingsInput): UseProfileSettingsResult {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSignupSetupOpen, setIsSignupSetupOpen] = useState(false);
    const [profileSettingsByProgram, setProfileSettingsByProgram] = useState<ProfileSettingsByProgram>({});
    const [lockedProgramCode, setLockedProgramCode] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const payload = await fetchProfileSettings(programCode);
                if (cancelled) return;
                const startTerm: StartTerm | null = payload?.start_term && typeof payload.start_term === "object"
                    ? {
                        season: normalizeStartSeason(payload.start_term.season),
                        year: Number(payload.start_term.year) || new Date().getFullYear(),
                    }
                    : null;
                const overridesRaw =
                    payload?.course_term_overrides && typeof payload.course_term_overrides === "object"
                        ? payload.course_term_overrides
                        : {};
                const normalizedOverrides: Record<string, TermAvailability> = Object.fromEntries(
                    Object.entries(overridesRaw)
                        .map(([code, term]): [string, TermAvailability] => [
                            String(code || "").trim(),
                            normalizeTermAvailability(term),
                        ])
                        .filter(([code]) => Boolean(code))
                );
                const nextLockedProgramCode = String(payload?.locked_program_code || "").trim() || null;
                setLockedProgramCode(nextLockedProgramCode);
                // A locked programme was fixed at signup, so it wins over
                // whatever the planner was showing.
                if (nextLockedProgramCode && nextLockedProgramCode !== programCode) {
                    setProgramCode?.(nextLockedProgramCode);
                }
                setProfileSettingsByProgram((prev) => ({
                    ...(prev || {}),
                    [programCode]: {
                        startTerm,
                        startTermLocked: Boolean(payload?.start_term_locked ?? startTerm),
                        courseTermOverrides: normalizedOverrides,
                        interests: payload?.interests || [],
                        careerDirection: payload?.career_direction || "",
                        recommendation_toggles: payload?.recommendation_toggles || {},
                    },
                }));
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load profile settings", error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [programCode]);

    const profileSettingsForProgram: ProfileSettings = profileSettingsByProgram?.[programCode] ?? {};
    const startTermSeason = normalizeStartSeason(profileSettingsForProgram?.startTerm?.season ?? TERM_WINTER);
    const startTermYear = Number(profileSettingsForProgram?.startTerm?.year) || new Date().getFullYear();
    const isStartTermLocked = Boolean(profileSettingsForProgram?.startTermLocked);
    const isProgramLocked = Boolean(String(lockedProgramCode || "").trim());
    const courseTermOverrides = profileSettingsForProgram?.courseTermOverrides ?? {};

    return {
        isProfileOpen,
        setIsProfileOpen,
        isSignupSetupOpen,
        setIsSignupSetupOpen,
        profileSettingsByProgram,
        setProfileSettingsByProgram,
        profileSettingsForProgram,
        lockedProgramCode,
        setLockedProgramCode,
        startTermSeason,
        startTermYear,
        isStartTermLocked,
        isProgramLocked,
        courseTermOverrides,
    };
}
