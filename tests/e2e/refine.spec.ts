import type { Page } from "@playwright/test";

import {
  expect,
  fulfilJson,
  makePlan,
  makeWorkspace,
  mockApi,
  seedWorkspace,
  test,
} from "./fixtures";

const instruct = async (page: Page, text = "Make it eco-friendly"): Promise<void> => {
  await page.getByLabel("What should change?").fill(text);
  await page.getByRole("button", { name: "Apply refinement" }).click();
};

test.describe("refine requests", () => {
  test("sends the intake, current plan and trimmed instruction as a JSON POST", async ({
    page,
  }) => {
    const workspace = makeWorkspace({ plan: makePlan("Original summary text.") });
    await seedWorkspace(page, workspace);
    const calls = await mockApi(page);
    await page.goto("/plan");
    await instruct(page, "  Cut the budget by 20%  ");
    await expect(page.getByText("Refined plan summary.")).toBeVisible();

    expect(calls.refine).toBe(1);
    expect(calls.refineBodies[0]).toMatchObject({
      instruction: "Cut the budget by 20%",
      intake: { eventName: workspace.intake.eventName },
      plan: { summary: "Original summary text." },
    });
  });

  test("a too-short instruction shows a field error and makes no request", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace());
    const calls = await mockApi(page);
    await page.goto("/plan");
    await instruct(page, "a");
    await expect(page.getByText("Describe the change you want in a few words.")).toBeVisible();
    expect(calls.refine).toBe(0);
  });
});

test.describe("refine failures", () => {
  test("a 502 shows the service message and leaves the plan unchanged", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace({ plan: makePlan("Original summary text.") }));
    await page.route("**/api/refine", (route) =>
      fulfilJson(
        route,
        { error: "Plan generation service is unavailable", correlationId: "x" },
        502,
      ),
    );
    await page.goto("/plan");
    await instruct(page);

    await expect(
      page.getByRole("status").filter({ hasText: "Plan generation service is unavailable" }),
    ).toBeVisible();
    await expect(page.getByText("Original summary text.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo last refinement" })).toBeDisabled();
    await expect(page.getByLabel("What should change?")).toHaveValue("Make it eco-friendly");
  });

  test("a 503 busy response shows a retryable message and a retry succeeds", async ({ page }) => {
    await seedWorkspace(page, makeWorkspace({ plan: makePlan("Original summary text.") }));
    let attempts = 0;
    await page.route("**/api/refine", (route) => {
      attempts += 1;
      if (attempts === 1) {
        return fulfilJson(
          route,
          { error: "The AI service is busy. Please try again in a moment.", correlationId: "x" },
          503,
        );
      }
      return fulfilJson(route, makePlan("Refined after retry."));
    });
    await page.goto("/plan");
    await instruct(page);

    await expect(page.getByRole("status").filter({ hasText: /busy.*try again/i })).toBeVisible();
    await expect(page.getByText("Original summary text.")).toBeVisible();

    await page.getByRole("button", { name: "Apply refinement" }).click();
    await expect(page.getByText("Refined after retry.")).toBeVisible();
    expect(attempts).toBe(2);
  });
});
