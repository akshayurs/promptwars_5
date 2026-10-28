import type { Page } from "@playwright/test";

import { expect, makeWorkspace, seedWorkspace, test } from "./fixtures";

const nextUp = (page: Page) => page.getByRole("region", { name: "Next up" });

test.describe("timeline milestones", () => {
  test("ticking a milestone updates progress and advances the Next up card", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan");
    await expect(nextUp(page)).toContainText("Finalise the guest list");

    await page.getByRole("tab", { name: "Timeline" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "0 of 4 milestones done" }),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: "Finalise the guest list" }).click();

    await expect(
      page.getByRole("status").filter({ hasText: "1 of 4 milestones done" }),
    ).toBeVisible();
    await expect(nextUp(page)).toContainText("Book the venue");
    await expect(nextUp(page)).not.toContainText("Finalise the guest list");
  });

  test("a milestone checkbox toggles with the Space key and persists after reload", async ({
    page,
  }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan");
    await page.getByRole("tab", { name: "Timeline" }).click();
    const checkbox = page.getByRole("checkbox", { name: "Book the venue" });
    await checkbox.focus();
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
    await expect(
      page.getByRole("status").filter({ hasText: "1 of 4 milestones done" }),
    ).toBeVisible();

    await page.reload();
    await page.getByRole("tab", { name: "Timeline" }).click();
    await expect(page.getByRole("checkbox", { name: "Book the venue" })).toBeChecked();

    await page.getByRole("checkbox", { name: "Book the venue" }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("checkbox", { name: "Book the venue" })).not.toBeChecked();
  });

  test("completing every milestone shows the all-done message", async ({ page }) => {
    const workspace = makeWorkspace();
    workspace.plan.timeline = workspace.plan.timeline.map((milestone) => ({
      ...milestone,
      done: true,
    }));
    await seedWorkspace(page, workspace);
    await page.goto("/plan");
    await expect(nextUp(page)).toContainText("All milestones are complete.");
  });
});

test.describe("vendor checklist", () => {
  test("a vendor checkbox toggles with the Space key", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan");
    await page.getByRole("tab", { name: "Vendors" }).click();
    const checkbox = page.getByRole("checkbox", { name: "Caterer" });
    await checkbox.focus();
    await page.keyboard.press("Space");
    await expect(checkbox).toBeChecked();
    await expect(
      page.getByRole("status").filter({ hasText: "1 of 3 vendors booked" }),
    ).toBeVisible();
    await page.keyboard.press("Space");
    await expect(checkbox).not.toBeChecked();
  });
});

test.describe("budget editing", () => {
  test("adds a budget line that persists after reload", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan");
    await page.getByLabel("Category", { exact: true }).fill("Photo booth");
    await page.getByLabel("Amount (INR)", { exact: true }).fill("25000");
    await page.getByLabel("Why it matters").fill("Guest keepsakes");
    await page.getByRole("button", { name: "Add line" }).click();

    await expect(page.getByRole("spinbutton", { name: "Photo booth amount (INR)" })).toHaveValue(
      "25000",
    );
    await page.reload();
    await expect(page.getByRole("spinbutton", { name: "Photo booth amount (INR)" })).toHaveValue(
      "25000",
    );
  });

  test("adding a line without a category shows an error and adds nothing", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan");
    const addLine = page.getByRole("button", { name: "Add line" });
    await expect(addLine).toBeVisible();
    const before = await page.getByRole("spinbutton", { name: /amount/ }).count();
    await addLine.click();
    await expect(page.getByText("Enter a category.")).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: /amount/ })).toHaveCount(before);
  });

  test("removes a budget line and keeps it removed after reload", async ({ page }) => {
    const workspace = makeWorkspace();
    workspace.plan.budget.push({
      id: crypto.randomUUID(),
      category: "Photo booth",
      amount: 10_000,
      rationale: "Guest keepsakes",
    });
    await seedWorkspace(page, workspace);
    await page.goto("/plan");
    await expect(page.getByRole("spinbutton", { name: /^Photo booth amount/ })).toBeVisible();
    await page.getByRole("button", { name: "Remove Photo booth" }).click();
    await expect(page.getByRole("spinbutton", { name: /^Photo booth amount/ })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("spinbutton", { name: /^Venue amount/ })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: /^Photo booth amount/ })).toHaveCount(0);
  });

  test("editing the total budget below the allocation flags over budget and persists", async ({
    page,
  }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan");
    await expect(page.getByText("Over budget", { exact: true })).toHaveCount(0);
    await page.getByLabel("Total budget (INR)").fill("300000");
    await expect(page.getByText("Over budget", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Total budget (INR)")).toHaveValue("300000");
    await expect(page.getByText("Over budget", { exact: true })).toBeVisible();
  });
});
