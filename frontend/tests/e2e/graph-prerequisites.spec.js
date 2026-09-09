/**
 * The prerequisite relations the graph draws.
 *
 * One switch draws the curriculum's course-to-course orderings, enforced and
 * advisory alike, and the two are drawn differently so an edge says whether it
 * binds. The split falls between the programmes: the Master's two are enforced,
 * the Bachelor's two advisory. This is the end-to-end coverage of the graph
 * view; the flows above it exercise the table, and a graph regression would
 * otherwise reach a student before it reached CI.
 */
import { test, expect } from "@playwright/test";
import { startPlanning, BACHELOR, MASTER } from "./support/planner.js";

const prerequisiteEdges = (page) => page.locator('.react-flow__edge[data-testid^="rf__edge-prereq-"]');

async function openGraph(page) {
    await page.getByRole("button", { name: /Graph View/i }).click();
    await expect(page.locator(".react-flow__node").first()).toBeVisible({ timeout: 20000 });
}

/** Open every subject, so course and module nodes are on the canvas to draw between. */
async function expandEverything(page) {
    await page.getByRole("button", { name: /▾ Expand/ }).click();
    await expect
        .poll(async () => page.locator(".react-flow__node").count(), { timeout: 15000 })
        .toBeGreaterThan(50);
}

test.describe("prerequisite relations in the graph", () => {
    test("the master's two enforced pairs are drawn, and nothing until asked", async ({ page }) => {
        await startPlanning(page, { program: MASTER });
        await openGraph(page);
        await expandEverything(page);

        await expect(prerequisiteEdges(page)).toHaveCount(0);

        await page.getByText(/Show prerequisites/).click();
        await expect(prerequisiteEdges(page)).toHaveCount(2);

        // Every drawn edge states the one thing an edge here can state.
        await expect(page.getByText("required before").first()).toBeVisible();
    });

    test("switching the relations off again clears the canvas", async ({ page }) => {
        await startPlanning(page, { program: MASTER });
        await openGraph(page);
        await expandEverything(page);

        const control = page.getByText(/Show prerequisites/);
        await control.click();
        await expect(prerequisiteEdges(page)).toHaveCount(2);
        await control.click();
        await expect(prerequisiteEdges(page)).toHaveCount(0);
    });

    test("the bachelor's two advisory pairs are drawn, and say they are advisory", async ({ page }) => {
        // The engine warns on these rather than refusing them, so they are drawn
        // dashed and labelled differently from the master's enforced pairs.
        await startPlanning(page, { program: BACHELOR });
        await openGraph(page);
        await expandEverything(page);

        await page.getByText(/Show prerequisites/).click();
        await expect(prerequisiteEdges(page)).toHaveCount(2);
        await expect(page.getByText("recommended before").first()).toBeVisible();
    });
});
