import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import {
  expect,
  fillIntake,
  fulfilJson,
  holdApi,
  makeIntake,
  makePlan,
  makeWorkspace,
  mockApi,
  seedWorkspace,
  test,
} from "./fixtures";

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
    await page.getByRole("spinbutton", { name: /^Venue amount/ }).fill("900000");
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

  test("edit details page has no axe violations", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan/edit");
    await expect(page.getByRole("button", { name: "Update plan" })).toBeVisible();
    await expectNoViolations(page);
  });

  test("replace-plan confirmation has no axe violations", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await mockApi(page);
    await page.goto("/");
    await fillIntake(page, makeIntake({ eventName: "A brand new event" }));
    await page.getByRole("button", { name: "Generate plan" }).click();
    await expect(page.getByText("Replace your current plan?")).toBeVisible();
    await expectNoViolations(page);
  });

  test("invalid import error has no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Import a saved plan (JSON)").setInputFiles({
      name: "plan.json",
      mimeType: "application/json",
      buffer: Buffer.from("this is not json"),
    });
    await page.getByRole("button", { name: "Import plan" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
    await expectNoViolations(page);
  });

  test("cancelled notice has no axe violations", async ({ page }) => {
    const release = await holdApi(page, "plan");
    await page.goto("/");
    await fillIntake(page);
    await page.getByRole("button", { name: "Generate plan" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Plan generation cancelled.")).toBeVisible();
    await expectNoViolations(page);
    release();
  });

  test("summary delete confirmation has no axe violations", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan/summary");
    await page.getByRole("button", { name: "Start over" }).click();
    await expect(
      page.getByRole("group", { name: "Delete this plan from the browser?" }),
    ).toBeVisible();
    await expectNoViolations(page);
  });

  test("404 page has no axe violations", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expectNoViolations(page);
  });

  test("refine success state has no axe violations", async ({ page }) => {
    const refined = makePlan("Refined plan summary.");
    refined.ideas[0]!.title = "Eco-friendly paper lanterns";
    await seedWorkspace(page, makeWorkspace());
    await mockApi(page, { refine: refined });
    await page.goto("/plan");
    await page.getByLabel("What should change?").fill("Make it eco-friendly");
    await page.getByRole("button", { name: "Apply refinement" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Updated \d+ .*\./ })).toBeVisible();
    await expectNoViolations(page);
  });

  test("refine error state has no axe violations", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.route("**/api/refine", (route) =>
      fulfilJson(
        route,
        { error: "Plan generation service is unavailable", correlationId: "x" },
        502,
      ),
    );
    await page.goto("/plan");
    await page.getByLabel("What should change?").fill("Make it eco-friendly");
    await page.getByRole("button", { name: "Apply refinement" }).click();
    await expect(page.getByText("Plan generation service is unavailable")).toBeVisible();
    await expectNoViolations(page);
  });

  test("refine validation error has no axe violations", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace({ plan: makePlan() }));
    await page.goto("/plan");
    await page.getByRole("button", { name: "Apply refinement" }).click();
    await expect(page.getByText("Describe the change you want in a few words.")).toBeVisible();
    await expectNoViolations(page);
  });

  test.describe("dark colour scheme", () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
    });

    test("intake page has no axe violations", async ({ page }) => {
      await page.goto("/");
      await expectNoViolations(page);
    });

    test("workspace tabs have no axe violations", async ({ page }) => {
      await seedWorkspace(page, makeWorkspace());
      await page.goto("/plan");
      for (const tab of TABS) {
        await page.getByRole("tab", { name: tab }).click();
        await expect(page.getByRole("tab", { name: tab })).toHaveAttribute("aria-selected", "true");
        await expectNoViolations(page);
      }
    });

    test("summary page has no axe violations", async ({ page }) => {
      await seedWorkspace(page, makeWorkspace());
      await page.goto("/plan/summary");
      await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
      await expectNoViolations(page);
    });
  });

  for (const path of ["/", "/plan", "/plan/edit", "/plan/summary", "/no-such-page"]) {
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
