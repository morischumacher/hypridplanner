/**
 * Short card labels derived from catalogue names. Course titles repeat their
 * teaching format as a suffix ("Analysis (VU)"), which is stripped here since
 * cards render the format separately.
 */

function normalizeText(value: string | null | undefined): string {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const SHORTNAME_STOP_WORDS = new Set([
    "and", "und", "for", "der", "die", "das", "in", "of", "the", "to", "mit", "fuer", "fur",
]);

/** Closed set of teaching formats, as they appear in a title. */
const TYPE_GROUP = "(VU|VO|UE|PR|SE|KO|KS|EX|PS|PJ|ILV|RE)";

function buildAcronym(name: string | null | undefined): string {
    const words = String(name || "")
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean);
    if (!words.length) return "";

    const significant = words.filter((w) => !SHORTNAME_STOP_WORDS.has(normalizeText(w)));
    if (!significant.length) return "";

    if (significant.length === 1) {
        const token = significant[0] ?? "";
        const leadingLetter = token.match(/[A-Za-z]/)?.[0]?.toUpperCase() || "";
        const trailingDigits = token.match(/\d+$/)?.[0] || "";
        return `${leadingLetter}${trailingDigits}`.trim();
    }

    const letters = significant
        .map((w) => w.match(/[A-Za-z]/)?.[0]?.toUpperCase() || "")
        .filter(Boolean);
    const trailingDigits = significant
        .map((w) => w.match(/\d+$/)?.[0] || "")
        .find(Boolean) || "";
    if (letters.length >= 2) return `${letters.join("")}${trailingDigits}`;

    const first = words[0] || "";
    return first.slice(0, 10).toUpperCase();
}

export function displayShortCode(code: string | null | undefined): string {
    return String(code || "").trim();
}

export function displayCourseHeader(
    code: string | null | undefined,
    name: string | null | undefined = "",
    type: string | null | undefined = ""
): string {
    // Header is code and format only; `name` stays in the signature because
    // every call site still passes it.
    void name;
    const rawCode = String(code || "").trim();
    const rawType = String(type || "").trim();
    if (rawCode && rawType) return `${rawCode} | ${rawType}`;
    if (rawCode) return rawCode;
    return rawType;
}

export function displayCourseTitle(name: string | null | undefined = ""): string {
    const raw = String(name || "").trim();
    if (!raw) return "";
    const parenMatch = raw.match(new RegExp(`\\s*${"\\("}${TYPE_GROUP}${"\\)"}\\s*$`, "i"));
    if (parenMatch) return raw.slice(0, parenMatch.index).trim();

    const separatedMatch = raw.match(new RegExp(`\\s*[-_/|]\\s*${TYPE_GROUP}\\s*$`));
    if (separatedMatch) return raw.slice(0, separatedMatch.index).trim();
    const plainSuffixMatch = raw.match(new RegExp(`\\s+${TYPE_GROUP}\\s*$`));
    if (plainSuffixMatch) return raw.slice(0, plainSuffixMatch.index).trim();

    return raw;
}

function longestCommonPrefix(values: readonly (string | null | undefined)[]): string {
    const list = (values || []).filter((value): value is string => Boolean(value));
    const [head, ...rest] = list;
    if (head === undefined) return "";
    let prefix = head;
    for (const current of rest) {
        while (prefix && !current.startsWith(prefix)) {
            prefix = prefix.slice(0, -1);
        }
        if (!prefix) break;
    }
    return prefix;
}

/**
 * Short label for a module group: acronym of the module name, falling back to
 * the shared prefix of its course codes when the name yields no acronym.
 */
export function displayModuleHeader(
    moduleCode: string | null | undefined,
    moduleName: string | null | undefined = "",
    moduleCourseCodes: readonly (string | null | undefined)[] = []
): string {
    const fromName = buildAcronym(moduleName);
    if (fromName) return fromName;

    const shortCourseCodes = (moduleCourseCodes || []).map((courseCode) => displayShortCode(courseCode));
    const prefix = longestCommonPrefix(shortCourseCodes).replace(/[\s._/-]+$/, "");
    const cleanedPrefix = prefix.replace(/\d+$/, "");
    if (cleanedPrefix) return cleanedPrefix;
    if (prefix) return prefix;

    // Only a module with no name at all falls back to its code.
    return String(moduleName || "").trim() || displayShortCode(moduleCode);
}
