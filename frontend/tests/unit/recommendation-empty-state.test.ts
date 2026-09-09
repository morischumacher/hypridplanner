/** Telling the empty cases of the recommendation panel apart. */
import { describe, expect, it } from "vitest";

import { recommendationEmptyState } from "../../src/features/recommendations/emptyState.ts";
import type { EmptyStateInput } from "../../src/features/recommendations/emptyState.ts";

const CHANNELS = [
    { key: "interest", label: "Interests" },
    { key: "similarity", label: "Similarity" },
    { key: "internship", label: "Internships" },
    { key: "peer", label: "Other students" },
];

function state(partial: Partial<EmptyStateInput>) {
    return recommendationEmptyState({
        recommendations: [],
        toggles: {},
        channels: CHANNELS,
        hasStatedInterests: true,
        ...partial,
    });
}

describe("recommendationEmptyState", () => {
    it("says so when every source is switched off", () => {
        const toggles = Object.fromEntries(CHANNELS.map((c) => [c.key, false]));
        const result = state({ toggles });
        expect(result.title).toContain("switched off");
        expect(result.detail).toContain("back on");
    });

    it("names the switched-off source that does have suggestions", () => {
        const result = state({
            recommendations: [{ type: "internship" }, { type: "internship" }],
            toggles: { internship: false },
        });
        expect(result.detail).toContain("Internships");
        expect(result.detail).not.toContain("Similarity");
    });

    it("points at the profile when no interests are stated", () => {
        const result = state({ hasStatedInterests: false });
        expect(result.detail).toContain("profile");
    });

    it("says the live sources returned nothing when the profile is filled in", () => {
        const result = state({ hasStatedInterests: true });
        expect(result.detail).toContain("returned nothing");
    });

    it("prefers the filter explanation over the profile one", () => {
        // A hidden channel with results holds regardless of the profile.
        const result = state({
            recommendations: [{ type: "peer" }],
            toggles: { peer: false },
            hasStatedInterests: false,
        });
        expect(result.detail).toContain("Other students");
    });

    it("never answers with the old dead ends", () => {
        const cases: Partial<EmptyStateInput>[] = [
            {},
            { hasStatedInterests: false },
            { toggles: Object.fromEntries(CHANNELS.map((c) => [c.key, false])) },
            { recommendations: [{ type: "interest" }], toggles: { interest: false } },
        ];
        for (const partial of cases) {
            const result = state(partial);
            expect(result.title).not.toBe("No recommendations");
            expect(result.title).not.toBe("All disabled");
            expect(result.detail.length).toBeGreaterThan(20);
        }
    });
});
