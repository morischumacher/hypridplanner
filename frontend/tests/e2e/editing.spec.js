import { expect, test } from "@playwright/test";

import {
    BACHELOR,
    MASTER,
    cardAction,
    catalogCourse,
    dragCardToLane,
    dropCourse,
    expandCatalog,
    expectLaneEcts,
    feedback,
    openDashboard,
    panIntoView,
    plannedCard,
    readPlannerDocument,
    startPlanning,
    writePlannerDocument,
} from "./support/planner.js";

/** Read a catalogue entry's code and credit weight from what it renders. */
async function describe(entry) {
    return {
        code: await entry.getAttribute("data-course-code"),
        ects: Number(((await entry.innerText()).match(/([\d.]+)\s*ECTS/) ?? [])[1]),
    };
}

/** Put one course into a lane and return what it was. */
async function place(page, entry, laneSelector) {
    const course = await describe(entry);
    await dropCourse(page, entry, laneSelector);
    await expect(plannedCard(page, course.code)).toBeVisible();
    return course;
}

test.describe("moving a course", () => {
    test("carries it into the lane it is dragged to", async ({ page }) => {
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const course = await place(page, catalogCourse(page, { term: "both" }).first(), "#semester-lane-1");
        await panIntoView(page);

        await dragCardToLane(page, course.code, "#semester-lane-3");

        await expectLaneEcts(page, "#semester-lane-3", course.ects);
        await expectLaneEcts(page, "#semester-lane-1", 0);
    });

    test("the move survives a reload", async ({ page }) => {
        // The plan is written back from node positions, so a move that never
        // reaches the server still passes the test above.
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const course = await place(page, catalogCourse(page, { term: "both" }).first(), "#semester-lane-1");
        await panIntoView(page);
        await dragCardToLane(page, course.code, "#semester-lane-2");
        await expectLaneEcts(page, "#semester-lane-2", course.ects);

        await page.waitForTimeout(2000);
        await page.reload();

        await expect(plannedCard(page, course.code)).toBeVisible();
        await expectLaneEcts(page, "#semester-lane-2", course.ects);
        await expectLaneEcts(page, "#semester-lane-1", 0);
    });
});

test.describe("a change the rule engine refuses", () => {
    test("is undone, and says why", async ({ page }) => {
        // The ceiling is 42 credits in one semester, so seven six-credit courses
        // reach it exactly and the eighth is refused.
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page, 6);

        const entries = catalogCourse(page, { term: "winter" });
        const codes = await entries.evaluateAll((nodes) =>
            nodes.map((node) => node.dataset.courseCode)
        );
        expect(codes.length).toBeGreaterThan(7);

        for (const code of codes.slice(0, 7)) {
            await dropCourse(page, page.locator(`[data-course-code="${code}"]`).first(), "#semester-lane-1");
            await expect(plannedCard(page, code)).toBeVisible();
        }
        await expectLaneEcts(page, "#semester-lane-1", 42);

        const refused = codes[7];
        await dropCourse(page, page.locator(`[data-course-code="${refused}"]`).first(), "#semester-lane-1");

        await expect(feedback(page)).toContainText("Rejected");
        await expect(feedback(page)).toContainText("42.0 ECTS");
        // Undone, not merely reported.
        await expect(plannedCard(page, refused)).toHaveCount(0);
        await expectLaneEcts(page, "#semester-lane-1", 42);
    });

    test("leaves the plan intact after a reload", async ({ page }) => {
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page, 6);

        const codes = await catalogCourse(page, { term: "winter" }).evaluateAll((nodes) =>
            nodes.map((node) => node.dataset.courseCode)
        );
        for (const code of codes.slice(0, 7)) {
            await dropCourse(page, page.locator(`[data-course-code="${code}"]`).first(), "#semester-lane-1");
            await expect(plannedCard(page, code)).toBeVisible();
        }
        await dropCourse(page, page.locator(`[data-course-code="${codes[7]}"]`).first(), "#semester-lane-1");
        await expect(feedback(page)).toContainText("Rejected");

        await page.waitForTimeout(2500);
        await page.reload();

        await expectLaneEcts(page, "#semester-lane-1", 42);
        await expect(plannedCard(page, codes[7])).toHaveCount(0);
    });
});

test.describe("a course card", () => {
    test("can be marked done and marked back", async ({ page }) => {
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const course = await place(page, catalogCourse(page).first(), "#semester-lane-1");
        await panIntoView(page);
        const card = plannedCard(page, course.code);

        await cardAction(page, course.code, "Mark as done").click();
        await expect(card).toHaveAttribute("data-course-status", "done");

        await cardAction(page, course.code, "Mark as in plan").click();
        await expect(card).toHaveAttribute("data-course-status", "in_plan");
    });

    test("can be taken out of the plan", async ({ page }) => {
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const course = await place(page, catalogCourse(page).first(), "#semester-lane-1");
        await panIntoView(page);

        await cardAction(page, course.code, "Remove from plan").click();

        await expect(plannedCard(page, course.code)).toHaveCount(0);
        await expectLaneEcts(page, "#semester-lane-1", 0);
    });
});

test.describe("the dashboard's own state", () => {
    /** A panel that is a plain toggle, addressed by the heading it prints. */
    const section = (page) =>
        page
            .locator("#planner-dashboard-container")
            .getByText("Per Semester (ECTS)", { exact: true })
            .locator("..");

    test("which sections are open survives a reload", async ({ page }) => {
        // The requirement and warning sections close themselves while the rule
        // check has not answered yet, so this plain toggle is the one to assert on.
        await startPlanning(page);
        await openDashboard(page);

        await section(page).getByRole("button", { name: "Expand" }).click();
        await expect(section(page).getByRole("button", { name: "Collapse" })).toBeVisible();

        await page.waitForTimeout(2000);
        await page.reload();

        await expect(page.locator("#planner-dashboard-container")).toBeVisible();
        await expect(section(page).getByRole("button", { name: "Collapse" })).toBeVisible();
    });

    test("a save carries the programmes the student is not looking at", async ({ page }) => {
        // A user is locked to the programme chosen at signup, so the second
        // programme's panel state is written and read back through the stored
        // document rather than through the interface.
        await startPlanning(page, { program: MASTER });
        await page.waitForTimeout(2000);

        const seeded = await readPlannerDocument(page);
        await writePlannerDocument(page, {
            ...seeded,
            dashboardUiByProgram: {
                ...(seeded.dashboardUiByProgram ?? {}),
                [BACHELOR]: { isPerSemesterEctsOpen: true, isByCategoryOpen: true },
            },
        });

        await page.reload();
        await openDashboard(page);
        await section(page).getByRole("button", { name: "Expand" }).click();
        await expect(section(page).getByRole("button", { name: "Collapse" })).toBeVisible();
        await page.waitForTimeout(2000);

        const stored = await readPlannerDocument(page);
        expect(stored.dashboardUiByProgram?.[MASTER]?.isPerSemesterEctsOpen).toBe(true);
        expect(stored.dashboardUiByProgram?.[BACHELOR]).toEqual({
            isPerSemesterEctsOpen: true,
            isByCategoryOpen: true,
        });
    });
});
