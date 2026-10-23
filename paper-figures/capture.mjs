/**
 * Anonymised paper figures, taken from the unmodified application.
 *
 *   node paper-figures/capture.mjs build   # assemble the demo plan through the UI, store it
 *   node paper-figures/capture.mjs shoot   # load the stored plan and take the screenshots
 *
 * Needs the API on :8000 (seeded database) and the dev server on :5173, as in
 * the main README. All traffic to the API goes through `routeApi`, which serves
 * the anonymised catalogue fixture and translates everything else; see
 * anonymise.mjs. The browser never sees a real name or code.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { GERMAN_RE, loadRealCatalogue, mapping, toAnon, toReal } from "./anonymise.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, "../frontend/package.json"));
const { chromium } = require("playwright");

const API = process.env.API_BASE ?? "http://localhost:8000";
const WEB = process.env.WEB_BASE ?? "http://localhost:5173";
const BACHELOR = mapping.programme.code;
const FIXTURE = path.join(HERE, "fixture");
const OUT = HERE;
const SCALE = 3;
const VIEWPORT = { width: 1600, height: 1000 };

const anonCatalogue = JSON.parse(fs.readFileSync(path.join(FIXTURE, "catalog.anon.json"), "utf8"));
const leaks = [];
const realTitles = new Map();

/* ---------------- API ---------------- */

async function api(method, route, token, body) {
    const res = await fetch(new URL(route, API), {
        method,
        headers: {
            Accept: "application/json",
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${await res.text()}`);
    return res.json();
}

async function newStudent() {
    const username = `student-${Date.now().toString(36)}`;
    const { token } = await api("POST", "/auth/signup", null, { username, password: "figures-only" });
    await api("PUT", "/profile-settings/start-term", token, { program_code: BACHELOR, season: "winter", year: 2024 });
    const real = await api("GET", `/catalog?program_code=${encodeURIComponent(BACHELOR)}`, token);
    loadRealCatalogue(real);
    for (const s of real) for (const m of s.modules) for (const c of m.courses) realTitles.set(c.code, c.title);
    return { username, token };
}

function noteLeaks(where, payload) {
    const text = JSON.stringify(payload);
    const m = text.match(GERMAN_RE);
    if (m) leaks.push(`${where}: '${m[0]}' in …${text.slice(Math.max(0, m.index - 60), m.index + 60)}…`);
}

/** Every request to the API passes through here. */
async function routeApi(page) {
    await page.route(`${API}/**`, async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.pathname === "/catalog") {
            const body = url.searchParams.get("program_code") === BACHELOR ? anonCatalogue : [];
            return route.fulfill({ json: body, headers: { "Access-Control-Allow-Origin": WEB, "Access-Control-Allow-Credentials": "true" } });
        }
        if (["/rulecheck", "/recommendations", "/curriculum/prerequisites"].includes(url.pathname)) {
            const postData = req.postData();
            const response = await route.fetch({
                postData: postData ? JSON.stringify(toReal(JSON.parse(postData))) : undefined,
            });
            const anon = toAnon(await response.json());
            if (process.env.DEBUG_API) console.log(url.pathname, response.status(), JSON.stringify(anon).slice(0, 400));
            if (url.pathname === "/rulecheck") noteLeaks("rulecheck", { missing: anon.missing, warnings: anon.stats?.warnings, errors: anon.errors, message: anon.message, bySubject: anon.stats?.ectsByExamSubject });
            if (url.pathname === "/curriculum/prerequisites") noteLeaks("prerequisites", anon);
            return route.fulfill({ response, json: anon });
        }
        return route.continue();
    });
}

/* ---------------- UI wording ---------------- */

// Fixed interface strings that are German, institution-specific, or differ from
// the paper's terminology. Applied to the rendered page only. Patterns are
// regular expressions and must not match their own replacement.
const UI_WORDING = [
    [String.raw`Course Catalog(?!ue)`, "Course Catalogue"],
    [String.raw`Planner Dashboard`, "Dashboard"],
    [String.raw`Elective \(Enge Wahl\)`, "Core Elective"],
    [String.raw`Elective \(Breite Wahl\)`, "Elective"],
    [String.raw`Enge Wahl \(\+\)`, "Core Elective (+)"],
    [String.raw`Breite Wahl \(\*\)`, "Elective (*)"],
    [String.raw`StEOP`, "Introductory Phase"],
    [String.raw`(\d+) Kurse\b`, "$1 courses"],
    [String.raw`033\s521`, mapping.programme.anon],
    [String.raw`Bachelor Informatics`, mapping.programme.anon],
];

function installWording(wording) {
    const swap = (s) => {
        let out = s;
        for (const [from, to] of wording) out = out.replace(new RegExp(from, "g"), to);
        return out;
    };
    const fix = (root) => {
        if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const next = swap(n.nodeValue);
            if (next !== n.nodeValue) n.nodeValue = next;
        }
        const elements = root.querySelectorAll ? root.querySelectorAll("[title],[aria-label],[placeholder]") : [];
        for (const el of elements) {
            for (const attr of ["title", "aria-label", "placeholder"]) {
                const v = el.getAttribute(attr);
                if (v != null && swap(v) !== v) el.setAttribute(attr, swap(v));
            }
        }
        if (document.title !== "Study Planner") document.title = "Study Planner";
    };
    new MutationObserver(() => fix(document.body)).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["title", "aria-label", "placeholder"] });
    document.addEventListener("DOMContentLoaded", () => fix(document.body));
}

/* ---------------- browser ---------------- */

async function openPlanner(browser, { username, token }, { viewport = VIEWPORT, scale = SCALE } = {}) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
    await context.addInitScript(({ token, username }) => {
        localStorage.setItem("study_planner_auth_token", token);
        localStorage.setItem("study-planner-tour-completed-" + username, "true");
    }, { token, username });
    await context.addInitScript(installWording, UI_WORDING);
    const page = await context.newPage();
    page.on("pageerror", (e) => console.warn("page error:", e.message));
    page.on("console", (m) => { if (m.type() === "error") console.warn("console:", m.text()); });
    await routeApi(page);
    await page.goto(WEB);
    try {
        await page.locator("#semester-lane-1").waitFor();
    } catch (e) {
        await page.screenshot({ path: path.join(process.env.DEBUG_DIR ?? "/tmp", "capture-failure.png") });
        throw e;
    }
    return page;
}

/** Native HTML5 drag-and-drop onto a lane, as in frontend/tests/e2e/support/planner.js. */
async function dropOnLane(page, source, laneSelector) {
    const handle = await source.elementHandle();
    await page.evaluate(({ handle, laneSelector }) => {
        // The board only renders one lane past the last used one; a lane that does
        // not exist yet is located one lane pitch (360 + 20 gap) to the right of its predecessor.
        let box;
        const lane = document.querySelector(laneSelector);
        if (lane) box = lane.getBoundingClientRect();
        else {
            const n = Number(laneSelector.match(/(\d+)$/)[1]);
            const prev = document.querySelector(`#semester-lane-${n - 1}`).getBoundingClientRect();
            box = { left: prev.left + prev.width * (380 / 360), top: prev.top, width: prev.width, height: prev.height };
        }
        const transfer = new DataTransfer();
        const at = { bubbles: true, cancelable: true, dataTransfer: transfer, clientX: box.left + box.width / 2, clientY: box.top + Math.min(box.height * 0.35, 300) };
        handle.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: transfer }));
        const canvas = document.querySelector(".rf-wrapper");
        canvas.dispatchEvent(new DragEvent("dragover", at));
        canvas.dispatchEvent(new DragEvent("drop", at));
        handle.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: transfer }));
    }, { handle, laneSelector });
}

/* ---------------- build: the demo plan ---------------- */

// Semester lanes (winter start), the Parking Stage, and the semesters already done.
const PLAN = {
    1: ["CS101", "SYS110", "HCI110", "HCI100", "MATH100", "DE110"],
    2: ["CS102", "MATH112", "MATH122", "ALG210", "SEC110"],
    3: ["ALG110", "MATH212", "AI220", "SYS220"],
    4: ["TCS210", "SE210", "SYS210", "ALG310"],
    5: ["VC110", "AI210", "SE310", "ALG320"],
    6: ["AI330", "DE340", "SEC330"],
    7: ["THE390", "THE380", "TCS320"],
};
const PARKED = ["SE220", "SE230", "VC350"];
const DONE_SEMESTERS = [1, 2];
// Courses of the lecture/exercise "split" modules. The board recognises those
// modules by their German names only, so under the generic names their catalogue
// tiles drag every variant at once; these are placed through the stored plan.
const SPLIT_COURSES = ["MATH112", "MATH122", "MATH212"];

function findCourse(code) {
    for (const subject of anonCatalogue) {
        for (const module of subject.modules) {
            const course = module.courses.find((c) => c.code === code);
            if (course) return { course, module, subject };
        }
    }
    throw new Error(`no course ${code} in the fixture`);
}

async function build(browser) {
    const student = await newStudent();
    const page = await openPlanner(browser, student, { scale: 1 });
    await page.getByRole("button", { name: "Not now" }).click().catch(() => {});
    const search = page.getByPlaceholder("Search courses/modules...");

    const card = (code) => page.locator(`[data-testid="course-card"][data-course-code="${code}"]`);
    // Only single-course modules are draggable as a course; a course inside a
    // larger module comes with its module, and split modules offer one chip per
    // teaching-format variant.
    const place = async (code, lane) => {
        if (await card(code).count()) return;
        await search.fill(code);
        const entry = page.locator(`#course-catalog-sidebar [data-course-code="${code}"]`).first();
        await entry.waitFor();
        let source = entry;
        if ((await entry.getAttribute("draggable")) !== "true") {
            // The search leaves only this course's module in the sidebar.
            const draggables = page.locator("#course-catalog-sidebar [draggable=true]");
            const variant = draggables.filter({ hasText: /^\s*LEX\s*$/ });
            source = (await variant.count()) ? variant.first() : draggables.first();
        }
        await dropOnLane(page, source, lane);
        try {
            await card(code).first().waitFor({ state: "attached", timeout: 8000 });
        } catch (e) {
            await page.screenshot({ path: path.join(process.env.DEBUG_DIR ?? "/tmp", "capture-failure.png") });
            throw e;
        }
        await page.waitForTimeout(500);
    };
    for (const [sem, codes] of Object.entries(PLAN)) {
        for (const code of codes) if (!SPLIT_COURSES.includes(code)) await place(code, `#semester-lane-${sem}`);
    }
    for (const code of PARKED) await place(code, "#parking-stage-lane");
    await search.fill("");
    await page.waitForTimeout(2000);

    // The split courses go straight into the stored plan, shaped like the cards
    // the board itself wrote, and the board is reloaded from it.
    const { state } = await api("GET", "/planner-state", student.token);
    const bySem = state.coursesByProgram[BACHELOR];
    for (const [sem, codes] of Object.entries(PLAN)) {
        for (const code of codes.filter((c) => SPLIT_COURSES.includes(c))) {
            const lane = (bySem[sem] ??= []);
            const { course, module, subject } = findCourse(code);
            const template = Object.values(bySem).flat().find((c) => c.examSubject === subject.exam_subject);
            lane.push({
                id: `${code}-figures-${sem}`,
                code,
                ects: course.ects,
                name: course.title,
                type: course.type,
                module: null,
                category: module.category,
                position: { x: 32 + 380 * (Number(sem) - 1), y: 96 + 164 * lane.length },
                laneIndex: Number(sem) - 1,
                examSubject: subject.exam_subject,
                subjectColor: template?.subjectColor ?? null,
            });
        }
    }
    await api("PUT", "/planner-state", student.token, { state });
    await page.reload();
    await page.locator("#semester-lane-1").waitFor();
    for (const code of SPLIT_COURSES) await card(code).first().waitFor({ state: "attached" });
    await page.waitForTimeout(1500);

    for (const sem of DONE_SEMESTERS) {
        for (const code of PLAN[sem]) {
            await card(code).getByRole("button", { name: "Mark as done" }).evaluate((b) => b.click());
            await page.waitForTimeout(400);
        }
    }
    await page.waitForTimeout(2500);
    const { state: finalState } = await api("GET", "/planner-state", student.token);
    fs.writeFileSync(path.join(FIXTURE, "demo_plan_state.json"), JSON.stringify(finalState, null, 1) + "\n");
    console.log("stored fixture/demo_plan_state.json");
    await page.context().close();
}

/* ---------------- audit ---------------- */

// Real names and codes that must not reach the screen: every real exam subject,
// module and course title that differs from its generic name, and the real
// course codes of three or more characters (shorter ones such as "SE" also
// occur as plain English abbreviations and are checked by eye).
function forbiddenStrings(realCatalogue) {
    const out = new Set(["TU Wien", "Wien", "Vienna", "033 521", "Bachelor Informatics", "Informatik", "StEOP", "Wirtschaftsinformatik"]);
    for (const [real, anon] of Object.entries(mapping.examSubjects)) if (real !== anon.name) out.add(real);
    for (const [real, anon] of Object.entries(mapping.modules)) if (real !== anon) out.add(real);
    for (const [code, anon] of Object.entries(mapping.courses)) {
        if (code.length >= 3) out.add(code);
        const title = realCatalogue.get(code);
        if (title && title !== anon.title) out.add(title);
    }
    // A real name that is a plain English word inside a generic name (e.g.
    // "Multimedia" in "Multimedia Systems") is not a leak.
    const generic = [...Object.values(mapping.examSubjects).map((a) => a.name), ...Object.values(mapping.modules), ...Object.values(mapping.courses).map((a) => a.title)];
    return [...out].filter((s) => !generic.some((g) => g.includes(s)));
}

const auditReport = [];

/** Everything a viewer could see or hover: text, tooltips, labels, placeholders, tab title. */
async function audit(page, label) {
    const text = await page.evaluate(() => [
        document.title,
        document.body.innerText,
        ...[...document.querySelectorAll("[title],[aria-label],[placeholder],[alt]")].flatMap((el) =>
            ["title", "aria-label", "placeholder", "alt"].map((a) => el.getAttribute(a)).filter(Boolean)),
    ].join("\n"));
    const hits = [];
    const german = text.match(new RegExp(GERMAN_RE.source, "g"));
    if (german) hits.push(...german.map((g) => `German: ${g}`));
    for (const s of forbiddenStrings(realTitles)) {
        const re = new RegExp(`(^|[^A-Za-z0-9])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`);
        const m = text.match(re);
        if (m) hits.push(`real: ${s} in "…${text.slice(Math.max(0, m.index - 40), m.index + s.length + 40).replace(/\n/g, " ")}…"`);
    }
    auditReport.push({ view: label, title: await page.title(), characters: text.length, hits: [...new Set(hits)] });
}

/* ---------------- main ---------------- */

const mode = process.argv[2] ?? "shoot";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
    if (mode === "build") await build(browser);
    else if (mode === "shoot") await (await import("./shoot.mjs")).shoot({ browser, newStudent, openPlanner, api, OUT, FIXTURE, debugDir: process.env.DEBUG_DIR, audit });
    else throw new Error(`unknown mode ${mode}`);
} finally {
    await browser.close();
}
if (auditReport.length) {
    fs.writeFileSync(path.join(OUT, "audit.json"), JSON.stringify(auditReport, null, 1) + "\n");
    for (const r of auditReport) console.log(`audit ${r.view}: ${r.characters} characters checked, ${r.hits.length ? "HITS: " + r.hits.join("; ") : "clean"}`);
}
if (leaks.length) {
    console.warn(`possible German/real text in API replies (${leaks.length}):`);
    for (const l of [...new Set(leaks)].slice(0, 20)) console.warn("  " + l);
}
