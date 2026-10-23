/**
 * The two paper figures, from the stored demo plan. Called by capture.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BACHELOR = "033 521";
const SUBJECT_NAMES = Object.values(JSON.parse(fs.readFileSync(new URL("./fixture/mapping.json", import.meta.url), "utf8")).examSubjects).map((s) => s.name);
// Exam subjects kept in the Graph View, by their generic names. Every other
// subject is switched off in the filter panel; the application then removes
// those subjects from the tree and opens the two that remain (with their
// multi-course module), so all four levels show at a legible size.
const KEPT_SUBJECTS = (process.env.FIG_B_SUBJECTS ?? "Computer Systems,Free Electives and Transferable Skills").split(",");
// Semester lanes shown in Figure A. The plan has seven; only the first three
// are in the crop so the cards stay legible at column width.
const TABLE_LANES = 3;

function demoState(FIXTURE) {
    const state = JSON.parse(fs.readFileSync(path.join(FIXTURE, "demo_plan_state.json"), "utf8"));
    // The Dashboard opens with the sections the figure shows expanded; the
    // introductory-phase section is moved to the end, below what the figure needs.
    Object.assign(state.dashboardUiByProgram[BACHELOR], {
        dashboardViewMode: "planning",
        isPlannedExamSubjectOpen: false,
        isPerSemesterEctsOpen: true,
        isMissingRequirementsOpen: true,
        isWarningsOpen: true,
        isByCategoryOpen: false,
        isPlannedEstimatedHoursOpen: false,
        plannedDashboardSectionOrder: [
            "planned_exam_subject", "planned_semester", "missing", "warnings",
            "planned_category", "planned_hours", "focus", "steop",
        ],
    });
    state.dashboardUiGlobal = { ...state.dashboardUiGlobal, isRuleDashboardOpen: false, isLegendOpen: false };
    return state;
}

const box = (page, selector) => page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
});

/** Union of the client rects of every visible element matching the selector. */
const unionBox = (page, selector) => page.evaluate((selector) => {
    const rects = [...document.querySelectorAll(selector)]
        .filter((el) => getComputedStyle(el).visibility !== "hidden")
        .map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height);
    const x = Math.min(...rects.map((r) => r.left));
    const y = Math.min(...rects.map((r) => r.top));
    return { x, y, width: Math.max(...rects.map((r) => r.right)) - x, height: Math.max(...rects.map((r) => r.bottom)) - y };
}, selector);

const pad = (b, p) => ({ x: b.x - p, y: b.y - p, width: b.width + 2 * p, height: b.height + 2 * p });

async function waitForToasts(page) {
    await page.locator('[data-testid="planner-feedback"]').first().waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
    await page.getByText(/Milestone reached/).first().waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
}

/** Drag the canvas background so that a point moves by (dx, dy). */
async function pan(page, from, dx, dy) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + dx, from.y + dy, { steps: 20 });
    await page.mouse.up();
}

async function tableView(page, OUT) {
    await page.getByRole("button", { name: /Hide Sidebar/ }).click();
    await page.waitForTimeout(500);
    // The board opens at React Flow's minimum zoom (0.5), at which the Parking
    // Stage and seven lanes fit the viewport; the crop is then 3 px per CSS px.

    // Parking Stage to the left edge, lane headers below the toolbar.
    const parking = await box(page, "#parking-stage-lane");
    await pan(page, { x: parking.x + parking.width + 5, y: 960 }, 24 - parking.x, 100 - parking.y);
    await page.mouse.move(1599, 500);
    await page.waitForTimeout(800);

    const laneIds = ["#parking-stage-lane", ...Array.from({ length: TABLE_LANES }, (_, i) => `#semester-lane-${i + 1}`)];
    const lanes = await unionBox(page, laneIds.join(", "));
    const cards = await unionBox(page, '[data-testid="course-card"]');
    const margin = 6;
    const clip = { x: lanes.x - margin, y: lanes.y - margin, width: lanes.width + 2 * margin, height: cards.y + cards.height - lanes.y + 2 * margin + 10 };
    await page.screenshot({ path: path.join(OUT, "table_view.png"), clip });
}

/** The Dashboard section whose heading reads `title`. */
function dashboardSection(page, title) {
    return page.locator("#planner-dashboard-container [draggable=true]").filter({
        has: page.locator("div", { hasText: new RegExp(`^${title}$`) }),
    }).first();
}

async function graphView(page, OUT) {
    await page.getByRole("button", { name: /Graph View/ }).click();
    await page.waitForTimeout(1500);
    await page.locator("#open-dashboard-btn").click();
    await page.locator("#planner-dashboard-container").waitFor();
    for (const title of ["Missing Requirements", "Warnings"]) {
        const expand = dashboardSection(page, title).getByRole("button", { name: "Expand" });
        if (await expand.count()) await expand.click();
    }
    const subjects = await page.locator("#graph-filters-panel button").evaluateAll((els, kept) => els
        .map((el) => el.innerText.trim())
        .filter((t) => t && !kept.includes(t)), KEPT_SUBJECTS);
    // A chip is on while it carries its subject's colour; clicked until it is off.
    const isOn = (name) => page.locator("#graph-filters-panel button", { hasText: new RegExp(`^${name}$`) }).first()
        .evaluate((el) => getComputedStyle(el).backgroundColor !== "rgb(255, 255, 255)");
    for (const name of subjects.filter((t) => SUBJECT_NAMES.includes(t))) {
        for (let i = 0; i < 3 && await isOn(name); i += 1) {
            await page.locator("#graph-filters-panel button", { hasText: new RegExp(`^${name}$`) }).first().click();
            await page.waitForTimeout(500);
        }
        if (await isOn(name)) throw new Error(`could not switch off ${name}`);
    }
    // Re-lay out the remaining subjects without the gaps the removed ones left.
    await page.getByRole("button", { name: /Align/ }).click();
    await page.waitForTimeout(1500);
    await waitForToasts(page);
    await page.mouse.move(1599, 5);

    // The filter panel is cropped first and then hidden, so the tree can use
    // the canvas under it. The Dashboard ends below Warnings (the sections
    // underneath are not part of the figure). The tree is fitted to the canvas
    // and cropped to its own nodes.
    const panels = { "panel_filters.png": await box(page, "#graph-filters-panel") };
    await page.screenshot({ path: path.join(OUT, "panel_filters.png"), clip: panels["panel_filters.png"] });
    await page.getByRole("button", { name: /Hide Filters/ }).click();
    await page.waitForTimeout(800);
    // Canvas overlays (minimap, zoom controls, axis legend, the view toolbar)
    // are not part of the figure and would otherwise overlap the tree crop.
    for (const label of [/Table View/, /Show Filters/, /Show Recs/]) {
        await page.getByRole("button", { name: label }).first().evaluate((el) => { el.style.visibility = "hidden"; });
    }
    await page.addStyleTag({ content: ".react-flow__minimap, .react-flow__controls { visibility: hidden !important; }" });
    await page.getByText("Horizontal:", { exact: false }).first().evaluate((el) => {
        let n = el;
        while (n.parentElement && getComputedStyle(n).position === "static") n = n.parentElement;
        n.style.visibility = "hidden";
    });
    await page.mouse.move(1599, 5);
    // The viewport height is adjusted until the fitted tree is as tall as the
    // Dashboard, so the panels end in line and keep a balanced text size.
    const measure = async () => {
        // The controls are hidden, so the button is clicked directly.
        await page.locator(".react-flow__controls-fitview").evaluate((b) => b.click());
        await page.waitForTimeout(1500);
        const dash = await box(page, "#planner-dashboard-container");
        const warnings = await dashboardSection(page, "Warnings").evaluate((el) => el.getBoundingClientRect().bottom);
        return {
            tree: pad(await unionBox(page, ".react-flow__node"), 10),
            dashboard: { x: dash.x + 2, y: dash.y, width: dash.width - 2, height: warnings - dash.y + 8 },
        };
    };
    let { tree, dashboard } = await measure();
    for (let i = 0; i < 4 && Math.abs(tree.height - dashboard.height) > 10; i += 1) {
        const { width, height } = page.viewportSize();
        const next = Math.round(height * dashboard.height / tree.height);
        await page.setViewportSize({ width, height: Math.max(next, Math.ceil(dashboard.y + dashboard.height + 12)) });
        ({ tree, dashboard } = await measure());
    }
    panels["panel_graph.png"] = tree;
    panels["panel_dashboard.png"] = dashboard;
    console.log(JSON.stringify(panels));
    for (const name of ["panel_graph.png", "panel_dashboard.png"]) {
        await page.screenshot({ path: path.join(OUT, name), clip: panels[name] });
    }
    execFileSync("python3", [path.join(OUT, "compose.py"), OUT], { stdio: "inherit" });
}

export async function shoot({ browser, newStudent, openPlanner, api, OUT, FIXTURE, debugDir, audit }) {
    const student = await newStudent();
    await api("PUT", "/planner-state", student.token, { state: demoState(FIXTURE) });

    const page = await openPlanner(browser, student);
    await page.addStyleTag({ content: "::-webkit-scrollbar { display: none; } * { scrollbar-width: none; caret-color: transparent; }" });
    await page.waitForTimeout(2500);
    await waitForToasts(page);
    await tableView(page, OUT);
    await audit(page, "Table View");
    await page.context().close();

    const page2 = await openPlanner(browser, student, { viewport: { width: 1600, height: Number(process.env.FIG_B_HEIGHT ?? 1320) } });
    await page2.addStyleTag({ content: "::-webkit-scrollbar { display: none; } * { scrollbar-width: none; caret-color: transparent; }" });
    await page2.waitForTimeout(2500);
    await graphView(page2, OUT);
    await audit(page2, "Graph View");
    if (debugDir) await page2.screenshot({ path: path.join(debugDir, "shoot-graph.png"), scale: "css" });
    await page2.context().close();
}
