import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { LIMITS } from "../../lib/constants";

import {
  expect,
  fillIntake,
  holdApi,
  makeIntake,
  makePlan,
  makeWorkspace,
  mockApi,
  seedWorkspace,
  test,
} from "./fixtures";

const readDownload = async (page: Page, button: string): Promise<string> => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: button }).click();
  const download = await downloadPromise;
  return readFile(await download.path(), "utf8");
};

test.describe("cancelling a request", () => {
  test("intake Cancel stops generation and keeps the answers", async ({ page }) => {
    const intake = makeIntake();
    const release = await holdApi(page, "plan");
    await page.goto("/");
    await fillIntake(page, intake);
    await page.getByRole("button", { name: "Generate plan" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("Plan generation cancelled.")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByLabel("Event name")).toHaveValue(intake.eventName);
    await expect(page.getByLabel("Guest count")).toHaveValue(String(intake.guestCount));
    release();
  });

  test("refine Cancel stops the refinement", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace({ plan: makePlan("Original summary text.") }));
    const release = await holdApi(page, "refine");
    await page.goto("/plan");
    await page.getByLabel("What should change?").fill("Make it eco-friendly");
    await page.getByRole("button", { name: "Apply refinement" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("Refinement cancelled.")).toBeVisible();
    await expect(page.getByText("Original summary text.")).toBeVisible();
    release();
  });
});

test.describe("editing event details", () => {
  test("changing the guest count adapts the plan and updates the facts", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    const calls = await mockApi(page);
    await page.goto("/plan");
    await page.locator("main header").getByRole("link", { name: "Edit event details" }).click();
    await expect(page).toHaveURL(/\/plan\/edit$/);

    await page.getByLabel("Guest count").fill("175");
    await page.getByRole("button", { name: "Update plan" }).click();

    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByText("175", { exact: true })).toBeVisible();
    expect(calls.refine).toBe(1);
    expect(calls.refineBodies[0]).toMatchObject({ intake: { guestCount: 175 } });
  });
});

test.describe("replacing a saved plan", () => {
  test("asks for confirmation and Keep current plan sends nothing", async ({ page }) => {
    const workspace = makeWorkspace();
    await seedWorkspace(page, workspace);
    const calls = await mockApi(page);
    await page.goto("/");
    await expect(page.getByText("You have a plan in progress")).toBeVisible();

    await fillIntake(page, makeIntake({ eventName: "A brand new event" }));
    await page.getByRole("button", { name: "Generate plan" }).click();
    await expect(page.getByText("Replace your current plan?")).toBeVisible();
    await page.getByRole("button", { name: "Keep current plan" }).click();

    await expect(page.getByText("Replace your current plan?")).toBeHidden();
    expect(calls.plan).toBe(0);
    await expect(page.getByLabel("Event name")).toHaveValue("A brand new event");
  });
});

test.describe("importing a plan", () => {
  test("a valid export opens the workspace", async ({ page }) => {
    const workspace = makeWorkspace();
    await page.goto("/");
    await page.getByLabel("Import a saved plan (JSON)").setInputFiles({
      name: "plan.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(workspace)),
    });
    await page.getByRole("button", { name: "Import plan" }).click();
    await expect(page).toHaveURL(/\/plan$/);
    await expect(
      page.getByRole("heading", { level: 1, name: workspace.intake.eventName }),
    ).toBeVisible();
  });

  test("an invalid file shows an error and stays on the intake page", async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("Import a saved plan (JSON)");
    await input.setInputFiles({
      name: "plan.json",
      mimeType: "application/json",
      buffer: Buffer.from("this is not json"),
    });
    await page.getByRole("button", { name: "Import plan" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("summary downloads", () => {
  test("the calendar download is an iCalendar file", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan/summary");
    const content = await readDownload(page, "Download calendar (.ics)");
    expect(content.startsWith("BEGIN:VCALENDAR")).toBe(true);
  });

  test("the budget download is a CSV with a header row", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan/summary");
    const content = await readDownload(page, "Download budget (CSV)");
    expect(content.replace(/^﻿/, "")).toMatch(/^Category,Amount,Currency,Why it matters/);
  });
});

test.describe("budget validation", () => {
  test("an out-of-range amount shows an inline error and is not saved", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    await page.goto("/plan");
    const venue = page.getByRole("spinbutton", { name: /^Venue amount/ });
    await venue.fill(String(LIMITS.maxBudget + 1));

    await expect(page.getByText(/^Enter an amount from/)).toBeVisible();
    await expect(venue).toHaveAttribute("aria-invalid", "true");

    await page.reload();
    await expect(page.getByRole("spinbutton", { name: /^Venue amount/ })).toHaveValue("200000");
  });
});
