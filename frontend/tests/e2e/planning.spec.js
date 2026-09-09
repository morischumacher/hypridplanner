/** Drives the real frontend against the real API and database. */
import { expect, test } from "@playwright/test";

import {
    catalogCourse,
    dropCourse,
    expandCatalog,
    expectLaneEcts,
    feedback,
    openDashboard,
    plannedCard,
    startPlanning,
} from "./support/planner.js";

const NOT_OFFERED = "This course is not offered in that semester.";

/** Read a catalogue entry's code and credit weight from what it renders. */
async function describe(entry) {
    const text = await entry.innerText();
    return {
        code: await entry.getAttribute("data-course-code"),
        ects: Number((text.match(/([\d.]+)\s*ECTS/) ?? [])[1]),
    };
}

test.describe("the prebuilt plan", () => {
    test("is offered while the plan is empty, and fills it when accepted", async ({ page }) => {
        await startPlanning(page);

        await expect(page.getByText("No master courses are planned yet.")).toBeVisible();
        expect(await page.locator('[data-testid="course-card"]').count()).toBe(0);

        await page.getByRole("button", { name: "Fill with prebuilt plan" }).click();

        await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();
        // The plan the button applies is curriculum data, so the assertion is
        // only that a lane is no longer empty.
        await expect
            .poll(async () => (await page.locator("#semester-lane-1").innerText()).match(/·\s*([\d.]+)/)?.[1])
            .not.toBe("0.0");
        await expect(page.getByText("No master courses are planned yet.")).toBeHidden();
    });

    test("leaves the plan empty when declined", async ({ page }) => {
        await startPlanning(page);

        await page.getByRole("button", { name: "Not now" }).click();

        await expect(page.getByText("No master courses are planned yet.")).toBeHidden();
        expect(await page.locator('[data-testid="course-card"]').count()).toBe(0);
        await expectLaneEcts(page, "#semester-lane-1", 0);
    });
});

test.describe("placing a course", () => {
    test("plans it in the lane it was dropped on", async ({ page }) => {
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const entry = catalogCourse(page, { term: "winter" }).first();
        const course = await describe(entry);

        await dropCourse(page, entry, "#semester-lane-1");

        const card = plannedCard(page, course.code);
        await expect(card).toBeVisible();
        await expect(card).toHaveAttribute("data-course-status", "in_plan");
        await expectLaneEcts(page, "#semester-lane-1", course.ects);
    });

    test("refuses a term the course is not offered in", async ({ page }) => {
        // Semester 1 is winter and semester 2 is summer.
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const entry = catalogCourse(page, { term: "winter" }).first();
        const course = await describe(entry);

        await dropCourse(page, entry, "#semester-lane-2");

        await expect(feedback(page)).toHaveText(NOT_OFFERED);
        await expect(plannedCard(page, course.code)).toHaveCount(0);
        await expectLaneEcts(page, "#semester-lane-2", 0);
    });

    test("accepts the same course in a lane of the right season", async ({ page }) => {
        // The rule is a parity rule, not a ban.
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const entry = catalogCourse(page, { term: "winter" }).first();
        const course = await describe(entry);

        await dropCourse(page, entry, "#semester-lane-3");

        await expect(plannedCard(page, course.code)).toHaveAttribute("data-course-status", "in_plan");
        await expectLaneEcts(page, "#semester-lane-3", course.ects);
    });
});

test.describe("the parking stage", () => {
    test("holds a course without planning it into a semester", async ({ page }) => {
        await startPlanning(page);
        await expandCatalog(page);

        const entry = catalogCourse(page).first();
        const course = await describe(entry);

        await dropCourse(page, entry, "#parking-stage-lane");

        await expect(plannedCard(page, course.code)).toHaveAttribute("data-course-status", "parked");
        await expectLaneEcts(page, "#parking-stage-lane", course.ects);
        // Parking is not planning: the semesters stay untouched.
        await expectLaneEcts(page, "#semester-lane-1", 0);
    });
});

test.describe("persistence", () => {
    test("a plan survives a reload", async ({ page }) => {
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const entry = catalogCourse(page, { term: "winter" }).first();
        const course = await describe(entry);
        await dropCourse(page, entry, "#semester-lane-1");
        await expect(plannedCard(page, course.code)).toBeVisible();

        // The write is debounced, so the reload has to wait for it.
        await page.waitForTimeout(2000);
        await page.reload();

        const card = plannedCard(page, course.code);
        await expect(card).toBeVisible();
        await expect(card).toHaveAttribute("data-course-status", "in_plan");
        await expectLaneEcts(page, "#semester-lane-1", course.ects);
    });
});

test.describe("the dashboard", () => {
    test("reports the plan and its outstanding requirements", async ({ page }) => {
        await startPlanning(page, { season: "winter" });
        await expandCatalog(page);

        const entry = catalogCourse(page, { term: "winter" }).first();
        const course = await describe(entry);
        await dropCourse(page, entry, "#semester-lane-1");
        await expect(plannedCard(page, course.code)).toBeVisible();

        await openDashboard(page);
        const dashboard = page.locator("#planner-dashboard-container");

        await expect(dashboard).toContainText("Planned ECTS");
        await expect(dashboard).toContainText(course.ects.toFixed(1));
        await expect(dashboard).toContainText(/\d+ missing requirements?\./);
    });
});
