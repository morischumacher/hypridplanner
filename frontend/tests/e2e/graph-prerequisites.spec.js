/**
 * The enforced prerequisite relations the graph draws.
 *
 * An edge on this canvas carries one meaning, this ordering is required, so the
 * filter panel's switch draws the curriculum's enforced pairs and nothing else.
 * A curriculum that encodes none says so rather than offering a switch that does
 * nothing. This is the end-to-end coverage of the graph view; the flows above it
 * exercise the table, and a graph regression would otherwise reach a student
 * before it reached CI.
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

    test("a curriculum with no enforced pairs says so instead of offering a dead switch", async ({ page }) => {
        // The bachelor's two orderings are advisory: the engine warns on them
        // rather than refusing, so they are not edges. The panel states that
        // rather than leaving a switch that draws nothing.
        await startPlanning(page, { program: BACHELOR });
        await openGraph(page);
        await expandEverything(page);

        await expect(page.getByText(/none in this curriculum/)).toBeVisible();
        await expect(page.locator('input[type="checkbox"]:disabled')).toHaveCount(1);
        await expect(prerequisiteEdges(page)).toHaveCount(0);
    });
});
