/**
 * Recommendations: the list shown, the requests that fill it, and the channel
 * switches. The list is kept apart from the requests because course cards read
 * the list as they are built, while requests are made alongside the rule check.
 */

export { useRecommendationList } from "./useRecommendationList.ts";
export type {
    Recommendation,
    RecommendedCourse,
    UseRecommendationListResult,
} from "./useRecommendationList.ts";
export { useRecommendationRequests } from "./useRecommendationRequests.ts";
export type {
    UseRecommendationRequestsInput,
    UseRecommendationRequestsResult,
} from "./useRecommendationRequests.ts";
