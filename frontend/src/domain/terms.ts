/**
 * Semesters, seasons, and which courses may go in which lane.
 *
 * Every function here is total. An unrecognised term falls back to "both", never
 * to "neither", so a malformed value cannot make a course unplaceable.
 */

export const BACHELOR_PROGRAM_CODE = "033 521";

export const TERM_WINTER = "winter";
export const TERM_SUMMER = "summer";
export const TERM_BOTH = "both";

/** When a course is offered. */
export type TermAvailability = typeof TERM_WINTER | typeof TERM_SUMMER | typeof TERM_BOTH;

/** A season a lane can be in. Lanes are never "both". */
export type Season = typeof TERM_WINTER | typeof TERM_SUMMER;

export interface SemesterBounds {
    /** Semesters the programme is designed to take. */
    min: number;
    /** Semesters the planner will show before it stops adding lanes. */
    max: number;
}

export interface Semester {
    /** One-based, matching the displayed semester number. */
    id: number;
    title: string;
}

export function semesterBoundsForProgram(programCode: string | null | undefined): SemesterBounds {
    // The spaced code form is what the curriculum regulations print and what the
    // backend rule checkers compare against.
    if (String(programCode ?? "").trim() === BACHELOR_PROGRAM_CODE) {
        return { min: 6, max: 10 };
    }
    return { min: 4, max: 8 };
}

export function buildSemesterList(count: unknown): Semester[] {
    const safe = Math.max(1, Number(count) || 1);
    return Array.from({ length: safe }, (_, index) => ({
        id: index + 1,
        title: `Semester ${index + 1}`,
    }));
}

export function clampLaneIndex(laneIndex: unknown, maxLaneIndex?: number | null): number {
    const raw = Math.max(0, Math.floor(Number(laneIndex) || 0));
    if (!Number.isFinite(maxLaneIndex)) return raw;
    return Math.max(0, Math.min(raw, Number(maxLaneIndex)));
}

export function normalizeTermAvailability(value: unknown): TermAvailability {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === TERM_WINTER || normalized === TERM_SUMMER || normalized === TERM_BOTH) {
        return normalized;
    }
    return TERM_BOTH;
}

export function normalizeStartSeason(value: unknown): Season {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === TERM_WINTER || normalized === TERM_SUMMER) return normalized;
    return TERM_WINTER;
}

/** The season of a lane, counting from the season the plan starts in. */
export function laneSeason(startSeason: unknown, laneIndex: unknown): Season {
    const season = normalizeStartSeason(startSeason);
    const index = Math.max(0, Math.floor(Number(laneIndex) || 0));
    if (index % 2 === 0) return season;
    return season === TERM_WINTER ? TERM_SUMMER : TERM_WINTER;
}

export function isLaneAllowedForTerm(
    termAvailability: unknown,
    startSeason: unknown,
    laneIndex: unknown
): boolean {
    const term = normalizeTermAvailability(termAvailability);
    if (term === TERM_BOTH) return true;
    return laneSeason(startSeason, laneIndex) === term;
}

/** The first lane at or after `laneIndex` that can hold this course, or null if none can. */
export function firstAllowedLaneAtOrAfter(
    termAvailability: unknown,
    startSeason: unknown,
    laneIndex: unknown,
    maxLaneIndex?: number | null
): number | null {
    const start = Math.max(0, Math.floor(Number(laneIndex) || 0));
    // Term availability repeats every two lanes, so an unbounded search only
    // needs a small window to decide.
    const max = Number.isFinite(maxLaneIndex)
        ? Math.max(0, Math.floor(Number(maxLaneIndex)))
        : start + 20;

    for (let index = start; index <= max; index += 1) {
        if (isLaneAllowedForTerm(termAvailability, startSeason, index)) return index;
    }
    return null;
}
