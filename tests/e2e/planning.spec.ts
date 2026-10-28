import { readFile } from "node:fs/promises";

import {
  expect,
  fillIntake,
  fulfilJson,
  makeIntake,
  makePlan,
  makeWorkspace,
  mockApi,
  seedWorkspace,
  test,
} from "./fixtures";

test.describe("intake", () => {
  test("empty submit shows an alert, invalid fields and makes no API call", async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Generate plan" }).click();

    await expect(page.locator("form [tabindex='-1']")).toContainText(
      "Please correct the highlighted fields.",
    );
    await expect(page.locator("form [tabindex='-1']")).toBeFocused();
    for (const label of ["Event name", "Event date", "Guest count", "Total budget"]) {
      await expect(page.getByLabel(label)).toHaveAttribute("aria-invalid", "true");
    }
    expect(calls.plan).toBe(0);
  });

  test("API failure shows the server message and stays on the intake page", async ({ page }) => {
    await page.route("**/api/plan", (route) =>
      fulfilJson(
        route,
        { error: "Plan generation service is unavailable", correlationId: "x" },
        502,
      ),
    );
    await page.goto("/");
    await fillIntake(page);
    await page.getByRole("button", { name: "Generate plan" }).click();

    await expect(page.locator("form [tabindex='-1']")).toContainText(
      "Plan generation service is unavailable",
    );
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("workspace", () => {
  test("happy path: generate, browse tabs, edit, persist", async ({ page }) => {
    const intake = makeIntake();
    await mockApi(page);
    await page.goto("/");
    await fillIntake(page, intake);
    await page.getByRole("button", { name: "Generate plan" }).click();

    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByRole("heading", { level: 1, name: intake.eventName })).toBeVisible();
    await expect(page.getByRole("table", { name: "Budget allocation" })).toBeVisible();

    await page.getByRole("tab", { name: "Timeline" }).click();
    await expect(page.getByRole("heading", { name: /Timeline to/ })).toBeVisible();

    await page.getByRole("tab", { name: "Vendors" }).click();
    await expect(page.getByRole("heading", { name: "Vendor checklist" })).toBeVisible();

    await page.getByRole("tab", { name: "Ideas" }).click();
    await expect(page.getByRole("heading", { name: "Personalised ideas" })).toBeVisible();

    await page.getByRole("tab", { name: "Budget" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Timeline" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.getByRole("tab", { name: "Vendors" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "0 of 3 vendors booked" }),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: "Photographer" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "1 of 3 vendors booked" }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Budget" }).click();
    await page.getByRole("spinbutton", { name: /^Venue amount/ }).fill("900000");
    await expect(page.getByText("Over budget", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: intake.eventName })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: /^Venue amount/ })).toHaveValue("900000");
    await page.getByRole("tab", { name: "Vendors" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "1 of 3 vendors booked" }),
    ).toBeVisible();
  });

  test("empty state links back to the intake form", async ({ page }) => {
    await page.goto("/plan");
    const notice = page.getByRole("status").filter({ hasText: "No plan yet" });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("link", { name: "intake form" })).toHaveAttribute("href", "/");
  });

  test("refine applies a modified plan and undo restores the original", async ({ page }) => {
    const original = makePlan("Original summary text.");
    const refined = makePlan("Refined summary text.");
    refined.ideas[0]!.title = "Eco-friendly paper lanterns";
    await seedWorkspace(page, makeWorkspace({ plan: original }));
    await mockApi(page, { refine: refined });
    await page.goto("/plan");

    const undo = page.getByRole("button", { name: "Undo last refinement" });
    await expect(page.getByText("Original summary text.")).toBeVisible();
    await expect(undo).toBeDisabled();

    await page.getByLabel("What should change?").fill("Make it eco-friendly");
    await page.getByRole("button", { name: "Apply refinement" }).click();

    await expect(page.getByRole("status").filter({ hasText: /Updated \d+ .*\./ })).toBeVisible();
    await expect(page.getByText("Refined summary text.")).toBeVisible();
    await expect(undo).toBeEnabled();

    await undo.click();
    await expect(page.getByText("Original summary text.")).toBeVisible();
    await expect(undo).toBeDisabled();
  });
});

test.describe("summary", () => {
  test("is read-only, exports JSON and can start over", async ({ page }) => {
    const workspace = makeWorkspace();
    await seedWorkspace(page, workspace);
    await page.goto("/plan/summary");

    await expect(
      page.getByRole("heading", { level: 1, name: workspace.intake.eventName }),
    ).toBeVisible();
    await expect(page.getByRole("table", { name: "Budget allocation" })).toBeVisible();
    await expect(page.getByRole("table").getByRole("textbox")).toHaveCount(0);
    await expect(page.getByRole("table").getByRole("spinbutton")).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/-plan\.json$/);
    const path = await download.path();
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    expect(parsed).toHaveProperty("plan");

    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/plan");
    await expect(page.getByText("No plan yet")).toBeVisible();
  });

  test("print layout hides site chrome and expands every vendor's questions", async ({ page }) => {
    const workspace = makeWorkspace();
    await seedWorkspace(page, workspace);
    await page.goto("/plan/summary");
    await expect(
      page.getByRole("heading", { level: 1, name: workspace.intake.eventName }),
    ).toBeVisible();

    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("contentinfo")).toBeHidden();
    await expect(page.getByRole("button", { name: "Export JSON" })).toBeHidden();
    await expect(page.getByRole("table", { name: "Budget allocation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Timeline to/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vendor checklist" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Personalised ideas" })).toBeVisible();

    const details = page.locator("details");
    await expect(details).not.toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    for (const item of await details.all()) await expect(item).toHaveAttribute("open", "");
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    for (const item of await details.all()) await expect(item).not.toHaveAttribute("open");
  });
});
