/**
 * Requests recommendations from the backend and saves the channel toggles.
 *
 * Two requests can be in flight at once, since a second plan edit starts one
 * before the first answers. Each records the change it was asked about, and an
 * answer is dropped unless it still matches the latest question; otherwise the
 * slower reply would overwrite the newer list.
 */

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";

import { normalizeRulecheckCategoryForProgram } from "../../domain/catalogue.ts";
import type { CoursesBySemester, PlanChange } from "../../domain/plan/state.ts";
import { fetchRecommendations, saveRecommendationProfile } from "../../lib/api.js";
import type { ProfileSettings, ProfileSettingsByProgram } from "../profile/index.ts";
import type { Recommendation } from "./useRecommendationList.ts";

/**
 * What a programme's last request was about: the id of the plan change that
 * prompted it, or the sentinel used by a session's first request.
 */
type RecommendationRequestId = number | "initial" | null;

/** The toggle set assumed before any have been set. */
const DEFAULT_RECOMMENDATION_TOGGLES: Record<string, boolean> = {
    interest: true, similarity: true, sequence: true, completed: true, internship: true, peer: true
};

export interface UseRecommendationRequestsInput {
    programCode: string;
    plannerHydrated: boolean;
    lastPlanChange: PlanChange | null | undefined;
    coursesBySemester: CoursesBySemester | null | undefined;
    doneCourseCodes: readonly string[] | null | undefined;
    parkedCourseCodes: readonly string[] | null | undefined;
    profileSettingsForProgram: ProfileSettings;
    setProfileSettingsByProgram: Dispatch<SetStateAction<ProfileSettingsByProgram>>;
    setRecommendations: Dispatch<SetStateAction<Recommendation[]>>;
}

export interface UseRecommendationRequestsResult {
    handleRecommendationToggle: (key: string, newValue: boolean) => Promise<void>;
}

export function useRecommendationRequests({
    programCode,
    plannerHydrated,
    lastPlanChange,
    coursesBySemester,
    doneCourseCodes,
    parkedCourseCodes,
    profileSettingsForProgram,
    setProfileSettingsByProgram,
    setRecommendations,
}: UseRecommendationRequestsInput): UseRecommendationRequestsResult {
    const latestRecChangeIdRef = useRef<Record<string, RecommendationRequestId>>({});

    useEffect(() => {
        if (!lastPlanChange) return;
        const requestProgramCode = programCode;
        latestRecChangeIdRef.current = {
            ...(latestRecChangeIdRef.current || {}),
            [requestProgramCode]: lastPlanChange.id ?? null,
        };
        const doneSet = new Set(doneCourseCodes || []);
        const allCourses = Object.values(coursesBySemester || {})
            .flat()
            .map((course) => normalizeRulecheckCategoryForProgram(course, requestProgramCode));
        const doneCourses = allCourses.filter((c) => c?.code && doneSet.has(c.code));
        const plannedCourses = allCourses.filter((c) => c?.code && !doneSet.has(c.code));
        const changeIdSnapshot = lastPlanChange.id ?? null;

        fetchRecommendations({
            programCode: requestProgramCode,
            plannedCourses,
            doneCourses,
            parkedCourses: parkedCourseCodes,
        })
            .then((response) => {
                if ((latestRecChangeIdRef.current?.[requestProgramCode] ?? null) !== changeIdSnapshot) return;
                if (response?.ok && response?.recommendations) {
                    setRecommendations(response.recommendations);
                } else {
                    setRecommendations([]);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch recommendations", err);
                if ((latestRecChangeIdRef.current?.[requestProgramCode] ?? null) !== changeIdSnapshot) return;
                setRecommendations([]);
            });
    }, [lastPlanChange, programCode, coursesBySemester, doneCourseCodes, parkedCourseCodes]);

    // The effect above waits for a plan change, which never comes on a plain
    // page load. This request covers that case; the sentinel keeps it to one
    // per programme however often the plan is recomputed underneath.
    useEffect(() => {
        if (!plannerHydrated || !programCode || lastPlanChange) return;
        const requestProgramCode = programCode;
        if (latestRecChangeIdRef.current?.[requestProgramCode] === "initial") return;
        latestRecChangeIdRef.current = {
            ...(latestRecChangeIdRef.current || {}),
            [requestProgramCode]: "initial",
        };
        const doneSet = new Set(doneCourseCodes || []);
        const allCourses = Object.values(coursesBySemester || {})
            .flat()
            .map((course) => normalizeRulecheckCategoryForProgram(course, requestProgramCode));
        const doneCourses = allCourses.filter((c) => c?.code && doneSet.has(c.code));
        const plannedCourses = allCourses.filter((c) => c?.code && !doneSet.has(c.code));

        fetchRecommendations({
            programCode: requestProgramCode,
            plannedCourses,
            doneCourses,
            parkedCourses: parkedCourseCodes,
        })
            .then((response) => {
                if (latestRecChangeIdRef.current?.[requestProgramCode] !== "initial") return;
                if (response?.ok && response?.recommendations) {
                    setRecommendations(response.recommendations);
                } else {
                    setRecommendations([]);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch initial recommendations", err);
                if (latestRecChangeIdRef.current?.[requestProgramCode] !== "initial") return;
                setRecommendations([]);
            });
    }, [plannerHydrated, coursesBySemester, doneCourseCodes, programCode, lastPlanChange, parkedCourseCodes]);

    const handleRecommendationToggle = useCallback(async (key: string, newValue: boolean) => {
        const nextToggles = {
            ...(profileSettingsForProgram?.recommendation_toggles || DEFAULT_RECOMMENDATION_TOGGLES),
            [key]: newValue
        };

        // The mirror is written before the save and not reverted on failure, so
        // a refused toggle stays switched until the profile is fetched again.
        setProfileSettingsByProgram(prev => ({
            ...(prev || {}),
            [programCode]: {
                ...(prev?.[programCode] || {}),
                recommendation_toggles: nextToggles
            }
        }));

        try {
            await saveRecommendationProfile({
                programCode,
                interests: profileSettingsForProgram?.interests || [],
                careerDirection: profileSettingsForProgram?.careerDirection || "",
                recommendationToggles: nextToggles,
            });
            // Toggles decide which channels are produced, so the list on screen
            // is stale until the request is repeated.
            const doneSet = new Set(doneCourseCodes || []);
            const allCourses = Object.values(coursesBySemester || {})
                .flat()
                .map((course) => normalizeRulecheckCategoryForProgram(course, programCode));
            const doneCourses = allCourses.filter((c) => c?.code && doneSet.has(c.code));
            const plannedCourses = allCourses.filter((c) => c?.code && !doneSet.has(c.code));
            const response = await fetchRecommendations({
                programCode,
                plannedCourses,
                doneCourses,
                parkedCourses: parkedCourseCodes
            });
            if (response?.ok && response?.recommendations) {
                setRecommendations(response.recommendations);
            }
        } catch (e) {
            console.error("Failed to save toggle", e);
        }
    }, [programCode, profileSettingsForProgram, doneCourseCodes, coursesBySemester, parkedCourseCodes]);

    return { handleRecommendationToggle };
}
