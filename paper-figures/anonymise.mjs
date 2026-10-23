/**
 * Translation between the anonymised fixture the browser sees and the real
 * curriculum the unmodified backend checks against.
 *
 * Requests leaving the browser are mapped generic -> real so the real rule
 * engine and recommender answer them; their replies are mapped real -> generic
 * (names, codes and the German rule-engine messages) before the browser sees
 * them. Nothing in the application is changed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const mapping = JSON.parse(fs.readFileSync(path.join(HERE, "fixture/mapping.json"), "utf8"));

/** The backend's own key normalisation: accents folded, lower case, punctuation to spaces. */
export function norm(text) {
    return String(text ?? "")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const invert = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));

// generic -> real
const subjectToReal = Object.fromEntries(Object.entries(mapping.examSubjects).map(([r, a]) => [a.name, r]));
const moduleToReal = invert(mapping.modules);
const courseCodeToReal = Object.fromEntries(Object.entries(mapping.courses).map(([r, a]) => [a.code, r]));
const courseTitleToReal = {};
const realTitleByRealCode = {};
const typeToReal = invert(mapping.courseTypes);

// real -> generic, keyed by normalised real text
const nameToAnon = new Map();
const addName = (real, anon) => { if (real && anon) nameToAnon.set(norm(real), anon); };

export function loadRealCatalogue(realCatalogue) {
    for (const subject of realCatalogue) {
        for (const module of subject.modules) {
            for (const course of module.courses) {
                const anon = mapping.courses[course.code];
                realTitleByRealCode[course.code] = course.title;
                courseTitleToReal[anon.title] ??= course.title;
                addName(course.title, anon.title);
            }
        }
    }
}
for (const [real, anon] of Object.entries(mapping.examSubjects)) addName(real, anon.name);
for (const [real, anon] of Object.entries(mapping.modules)) addName(real, anon);
// Spellings the rule engine uses in its own messages.
addName("Algebra & Diskrete Mathematik", "Discrete Mathematics");
addName("Mathematisches Arbeiten für Informatik und Wirtschaftsinformatik 1", "Mathematical Reasoning");

const realCodeToAnon = Object.fromEntries(Object.entries(mapping.courses).map(([r, a]) => [r, a.code]));

/* ---------------- generic -> real (requests) ---------------- */

function realName(value, siblingCode) {
    const real = siblingCode && courseCodeToReal[siblingCode];
    if (real && realTitleByRealCode[real]) return realTitleByRealCode[real];
    return moduleToReal[value] ?? subjectToReal[value] ?? courseTitleToReal[value] ?? value;
}

export function toReal(value, key = "", parent = null) {
    if (Array.isArray(value)) return value.map((v) => toReal(v, key, parent));
    if (value && typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) out[k] = toReal(v, k, value);
        return out;
    }
    if (typeof value !== "string") return value;
    if (/code$/i.test(key) && courseCodeToReal[value]) return courseCodeToReal[value];
    if (/examSubject|pruefungsfach|exam_subject/i.test(key)) return subjectToReal[value] ?? value;
    if (key === "type") return typeToReal[value] ?? value;
    if (key === "name" || key === "title") {
        const isModule = parent && parent.courseCodes === undefined && parent.title !== undefined && parent.name === undefined;
        return realName(value, isModule ? null : parent?.code);
    }
    return courseCodeToReal[value] ?? subjectToReal[value] ?? moduleToReal[value] ?? courseTitleToReal[value] ?? value;
}

/* ---------------- real -> generic (responses) ---------------- */

const MESSAGE_RULES = [
    [/^StEOP Pflicht-LV fehlt: (.+) \(([\d.]+) ECTS\)$/, (m) => `Introductory phase: required course missing: ${names(m[1])} (${m[2]} ECTS)`],
    [/^StEOP Pool: ([\d.]+) ECTS fehlen \(mind\. (\d+) ECTS aus: (.+)\)\.$/, (m) => `Introductory phase pool: ${m[1]} ECTS missing (at least ${m[2]} ECTS from: ${m[3].split(", ").map(names).join(", ")}).`],
    [/^Kategorie-Hinweis: '(.+)' wurde als '(.+)' geliefert, gehört aber curricular zu '(.+)' \(Modul: (.+)\)\.$/, (m) => `Category note: '${codes(m[1])}' was given as '${m[2]}' but belongs to '${m[3]}' (module: ${names(m[4])}).`],
    [/^Reihenfolge-Hinweis: '(.+)' ist vor '(.+)' geplant\. Das ist erlaubt, aber normalerweise wird '(.+)' davor empfohlen\.$/, (m) => `Order note: '${names(m[1])}' is planned before '${names(m[2])}'. This is allowed, but '${names(m[3])}' is usually recommended first.`],
    [/^Transferable Skills: maximal ([\d.]+) ECTS anrechenbar \(aktuell ([\d.]+) ECTS geplant\/done, ([\d.]+) ECTS werden nicht angerechnet\)\.$/, (m) => `Transferable Skills: at most ${m[1]} ECTS count (currently ${m[2]} ECTS planned/done, ${m[3]} ECTS are not counted).`],
    [/^Pflichtmodul fehlt: (.+) \(([\d.]+) ECTS\)$/, (m) => `Mandatory module missing: ${names(m[1])} (${m[2]} ECTS)`],
    [/^Bachelorarbeit fehlt: ([\d.]+) ECTS$/, (m) => `Bachelor thesis missing: ${m[1]} ECTS`],
    [/^Wahlmodule der engen Wahl \(\+\): mindestens (\d+) Module nötig, aktuell (\d+)\.$/, (m) => `Core elective modules (+): at least ${m[1]} modules required, currently ${m[2]}.`],
    [/^Transferable Skills: mindestens ([\d.]+) ECTS nötig \(aktuell ([\d.]+)\)\.$/, (m) => `Transferable Skills: at least ${m[1]} ECTS required (currently ${m[2]}).`],
    [/^Gesamtumfang: ([\d.]+) ECTS fehlen bis (\d+)\.$/, (m) => `Total: ${m[1]} ECTS missing to reach ${m[2]}.`],
];

function names(text) {
    return nameToAnon.get(norm(text)) ?? codes(text);
}

function codes(text) {
    return String(text).replace(/\b[A-Z][A-Z0-9]+\b/g, (c) => realCodeToAnon[c] ?? c);
}

export function translateMessage(text) {
    for (const [re, fn] of MESSAGE_RULES) {
        const m = text.match(re);
        if (m) return fn(m);
    }
    return text;
}

export function toAnon(value, key = "") {
    if (Array.isArray(value)) return value.map((v) => toAnon(v, key));
    if (value && typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            const anonKey = nameToAnon.get(norm(k)) ?? k;
            out[anonKey] = toAnon(v, k);
        }
        return out;
    }
    if (typeof value !== "string") return value;
    if (/code$/i.test(key) && realCodeToAnon[value]) return realCodeToAnon[value];
    if (key === "type" && mapping.courseTypes[value]) return mapping.courseTypes[value];
    if (key === "language" && mapping.languages[value]) return mapping.languages[value];
    const whole = nameToAnon.get(norm(value));
    if (whole) return whole;
    return translateMessage(value);
}

/** Words and characters that would betray German text. */
export const GERMAN_RE = /[äöüÄÖÜß]|\b(und|der|die|das|für|fuer|mit|nicht|fehlt|fehlen|nötig|aktuell|Pflicht|Wahl|Modul|Einführung|Grundlagen|Vertiefung|Informatik|Lehrveranstaltung|Semesterstunden|Studien)\b/;
