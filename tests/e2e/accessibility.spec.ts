import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect, makeWorkspace, seedWorkspace, test } from "./fixtures";

const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const TABS = ["Budget", "Timeline", "Vendors", "Ideas"] as const;

const expectNoViolations = async (page: Page): Promise<void> => {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? "n/a"}): ${violation.help}\n` +
        violation.nodes.map((node) => `  ${node.target.join(" ")}`).join("\n"),
    )
    .join("\n");
  expect(violations, report).toEqual([]);
};

test.describe("accessibility", () => {
  test("intake page has no axe violations", async ({ page }) => {
    await page.goto("/");
    await expectNoViolations(page);
  });

  test("intake page with validation errors has no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Generate plan" }).click();
    await expect(page.locator("form [tabindex='-1']")).toBeVisible();
    await expectNoViolations(page);
  });

  for (const tab of TABS) {
    test(`workspace ${tab} tab has no axe violations`, async ({ page }) => {
      await seedWorkspace(page, makeWorkspace());
      await page.goto("/plan");
      await page.getByRole("tab", { name: tab }).click();
      await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
      await expectNoViolations(page);
    });
  }

  test("over-budget workspace has no axe violations", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan");
    await page.getByLabel("Venue").fill("900000");
    await expect(page.getByText("Over budget", { exact: true })).toBeVisible();
    await expectNoViolations(page);
  });

  test("empty workspace has no axe violations", async ({ page }) => {
    await page.goto("/plan");
    await expect(page.getByText("No plan yet")).toBeVisible();
    await expectNoViolations(page);
  });

  test("summary page has no axe violations", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan/summary");
    await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
    await expectNoViolations(page);
  });

  for (const path of ["/", "/plan", "/plan/summary"]) {
    test(`${path} has exactly one h1`, async ({ page }) => {
      await seedWorkspace(page, makeWorkspace());
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    });
  }

  test("skip link is first focusable and moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });
});
