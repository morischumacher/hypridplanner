/**
 * The two paper figures, from the stored demo plan. Called by capture.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BACHELOR = "033 521";
// Exam subjects opened in the Graph View, by their generic names, and the
// multi-course module opened inside them so all four levels show.
const EXPANDED_SUBJECTS = ["Algorithms and Programming", "Software Engineering"];
const EXPANDED_MODULES = ["Introduction to Programming"];
// Semester lanes shown in Figure A. The plan has seven; the last two are left
// out of the crop so the cards stay legible at column width.
const TABLE_LANES = 5;

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

/** Union of the client rects of every element matching the selector. */
const unionBox = (page, selector) => page.evaluate((selector) => {
    const rects = [...document.querySelectorAll(selector)].map((el) => el.getBoundingClientRect()).filter((r) => r.width && r.height);
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
    await page.getByRole("button", { name: /Collapse/ }).first().click();
    await page.waitForTimeout(800);
    for (const label of [...EXPANDED_SUBJECTS, ...EXPANDED_MODULES]) {
        await page.locator(".react-flow__node").filter({ hasText: label }).first().click();
        await page.waitForTimeout(700);
    }
    // The controls sit under the filter panel, so the button is clicked directly.
    await page.locator(".react-flow__controls-fitview").evaluate((b) => b.click());
    await waitForToasts(page);
    await page.mouse.move(1599, 5);
    await page.waitForTimeout(1000);

    // Three panels, each cropped to its own content. The Dashboard ends below
    // Warnings (the sections underneath are not part of the figure), and the tree
    // is cut at the same height so the panels end in line; the collapsed subjects
    // at the bottom of the tree fall outside the crop. Excluding them with the
    // subject filter instead would make the application expand every remaining
    // subject. The cut is moved up above any node it would slice.
    const filters = await box(page, "#graph-filters-panel");
    const dash = await box(page, "#planner-dashboard-container");
    const warnings = await dashboardSection(page, "Warnings").evaluate((el) => el.getBoundingClientRect().bottom);
    const dashboard = { x: dash.x + 2, y: dash.y, width: dash.width - 2, height: warnings - dash.y + 8 };
    const tree = pad(await unionBox(page, ".react-flow__node"), 10);
    const nodes = await page.locator(".react-flow__node").evaluateAll((els) => els.map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
    }));
    let cut = tree.y + dashboard.height;
    for (const n of nodes) if (n.top < cut && n.bottom + 10 > cut) cut = Math.min(cut, n.top - 10);
    const panels = {
        "panel_filters.png": filters,
        "panel_graph.png": { ...tree, height: Math.min(tree.height, cut - tree.y) },
        "panel_dashboard.png": dashboard,
    };
    for (const [name, clip] of Object.entries(panels)) {
        await page.screenshot({ path: path.join(OUT, name), clip });
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
