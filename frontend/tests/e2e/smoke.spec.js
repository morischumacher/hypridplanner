import { expect, test } from "@playwright/test";

test("the planner loads and reaches the API", async ({ page, request }) => {
    const health = await request.get(`${process.env.E2E_API_BASE ?? "http://127.0.0.1:8100"}/health`);
    expect(health.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveTitle(/.+/);
});
