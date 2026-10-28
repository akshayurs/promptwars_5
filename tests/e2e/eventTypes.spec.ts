import {
  expect,
  fillIntake,
  makeIntakeFor,
  makePlan,
  makeWorkspace,
  mockApi,
  seedWorkspace,
  test,
} from "./fixtures";

test.describe("birthday events", () => {
  test("intake shows birthday fields and generates a plan with a birthday badge and brief", async ({
    page,
  }) => {
    const intake = makeIntakeFor("birthday");
    const calls = await mockApi(page);
    await page.goto("/");
    await page.getByRole("radio", { name: "Birthday" }).check();
    await expect(page.getByRole("group", { name: "Birthday details" })).toBeVisible();
    await expect(page.getByLabel("Couple's names")).toHaveCount(0);

    await fillIntake(page, intake);
    await page.getByRole("button", { name: "Generate plan" }).click();

    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByRole("heading", { level: 1, name: intake.eventName })).toBeVisible();
    await expect(page.getByText("Birthday", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your brief" })).toBeVisible();
    await expect(page.getByText("Meera turns 30")).toBeVisible();
    await expect(page.getByRole("table", { name: "Budget allocation" })).toBeVisible();

    expect(calls.plan).toBe(1);
    expect(calls.planBodies[0]).toMatchObject({
      eventType: "birthday",
      details: { honoreeName: "Meera", honoreeAge: 30 },
    });
  });

  test("an empty birthday form flags the honoree fields", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Birthday" }).check();
    await page.getByRole("button", { name: "Generate plan" }).click();
    await expect(page.getByLabel("Guest of honour's name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Age they are turning")).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("community events", () => {
  test("intake shows admission and permit fields and generates a community plan", async ({
    page,
  }) => {
    const intake = makeIntakeFor("community");
    const calls = await mockApi(page);
    await page.goto("/");
    await page.getByRole("radio", { name: "Community event" }).check();
    await expect(page.getByRole("group", { name: "Community event details" })).toBeVisible();

    await fillIntake(page, intake);
    await page.getByRole("button", { name: "Generate plan" }).click();

    await expect(page).toHaveURL(/\/plan$/);
    await expect(page.getByRole("heading", { level: 1, name: intake.eventName })).toBeVisible();
    await expect(page.getByText("Community event", { exact: true })).toBeVisible();
    await expect(page.getByText("Ticketed admission · permit required")).toBeVisible();
    await expect(page.getByRole("table", { name: "Budget allocation" })).toBeVisible();

    expect(calls.planBodies[0]).toMatchObject({
      eventType: "community",
      details: { admission: "ticketed", needsPermit: true },
    });
  });

  test("a seeded community workspace renders every tab", async ({ page }) => {
    const intake = makeIntakeFor("community");
    await seedWorkspace(page, makeWorkspace({ intake, plan: makePlan("Fair plan summary.") }));
    await page.goto("/plan");
    await expect(page.getByText("Fair plan summary.")).toBeVisible();
    await page.getByRole("tab", { name: "Timeline" }).click();
    await expect(page.getByRole("heading", { name: /Timeline to/ })).toBeVisible();
    await page.getByRole("tab", { name: "Vendors" }).click();
    await expect(page.getByRole("heading", { name: "Vendor checklist" })).toBeVisible();
    await page.getByRole("tab", { name: "Ideas" }).click();
    await expect(page.getByRole("heading", { name: "Personalised ideas" })).toBeVisible();
  });
});
