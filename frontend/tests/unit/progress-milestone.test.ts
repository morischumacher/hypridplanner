import { describe, expect, it } from "vitest";

import { highestMilestoneCrossed } from "../../src/features/rule-check/useRuleCheckFeedback.ts";

describe("highestMilestoneCrossed", () => {
    it("names no milestone when none is crossed", () => {
        expect(highestMilestoneCrossed(30, 44)).toBe(null);
        expect(highestMilestoneCrossed(0, 0)).toBe(null);
    });

    it("names the milestone when exactly one is crossed", () => {
        expect(highestMilestoneCrossed(20, 26)).toBe(25);
        expect(highestMilestoneCrossed(74, 75)).toBe(75);
    });

    it("names the highest when several are crossed at once", () => {
        // A plan hydrating from nothing to 102 of 180 ECTS crosses 25 and 50 at once.
        expect(highestMilestoneCrossed(0, Math.round((102 / 180) * 100))).toBe(50);
        expect(highestMilestoneCrossed(0, 100)).toBe(100);
        expect(highestMilestoneCrossed(24, 76)).toBe(75);
    });

    it("names nothing when the plan shrinks back past a milestone", () => {
        expect(highestMilestoneCrossed(60, 20)).toBe(null);
    });
});
