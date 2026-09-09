/**
 * The current recommendations and the lookup course cards read them through.
 * The list is whatever the last backend answer contained, so a dismissal lasts
 * only until the next answer replaces it.
 */

import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

/**
 * One recommendation. All fields optional and the shape left open: the backend
 * decides what a recommendation carries, and only the displayed fields matter.
 */
export interface Recommendation {
    id?: string | number;
    courseCode?: string;
    type?: string;
    content?: unknown[];
    [key: string]: unknown;
}

/** What a course card shows when a recommendation names its course. */
export interface RecommendedCourse {
    type: string;
    content: unknown[];
}

export interface UseRecommendationListResult {
    recommendations: Recommendation[];
    setRecommendations: Dispatch<SetStateAction<Recommendation[]>>;
    recommendedCourseMap: Map<string, RecommendedCourse>;
}

export function useRecommendationList(): UseRecommendationListResult {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    const recommendedCourseMap = useMemo(() => {
        const map = new Map<string, RecommendedCourse>();
        for (const rec of Array.isArray(recommendations) ? recommendations : []) {
            if (rec?.courseCode) {
                map.set(String(rec.courseCode), { type: rec.type || "interest", content: rec.content || [] });
            }
        }
        return map;
    }, [recommendations]);

    return { recommendations, setRecommendations, recommendedCourseMap };
}
