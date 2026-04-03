import { expect, test } from "@playwright/test";

test("operator console renders the bootstrapped venue health", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Operator Console" })).toBeVisible();
  await expect(page.getByText("SingleDealerPair bootstrap")).toBeVisible();
  await expect(page.getByText("No policy violations.")).toBeVisible();
});
