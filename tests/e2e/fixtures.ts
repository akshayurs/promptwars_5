import { test as base, expect, type Page, type Route } from "@playwright/test";

import { DAY_MS, STORAGE_KEY } from "../../lib/constants";
import type { Intake, Plan, StoredWorkspace } from "../../lib/schema";

export { expect };

const futureDate = (days = 60): string =>
  new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

export const makeIntake = (overrides: Partial<Intake> = {}): Intake => ({
  eventType: "wedding",
  eventName: "Asha and Ravi Wedding",
  eventDate: futureDate(),
  guestCount: 150,
  totalBudget: 500_000,
  currency: "INR",
  location: "Bengaluru",
  vibe: "Warm, floral and traditional",
  mustHaves: "Live music",
  ...overrides,
});

export const makePlan = (summary = "A warm floral celebration with live music."): Plan => ({
  summary,
  budget: [
    { id: crypto.randomUUID(), category: "Venue", amount: 200_000, rationale: "Hall for guests" },
    { id: crypto.randomUUID(), category: "Catering", amount: 150_000, rationale: "Food and drink" },
    { id: crypto.randomUUID(), category: "Decor", amount: 50_000, rationale: "Flowers and lights" },
  ],
  timeline: [
    {
      id: crypto.randomUUID(),
      title: "Book the venue",
      phase: "booking",
      daysBeforeEvent: 50,
      details: "Confirm the hall and pay the deposit.",
    },
    {
      id: crypto.randomUUID(),
      title: "Finalise the guest list",
      phase: "planning",
      daysBeforeEvent: 55,
      details: "Collect confirmed names from both families.",
    },
    {
      id: crypto.randomUUID(),
      title: "Confirm vendor arrivals",
      phase: "final-prep",
      daysBeforeEvent: 3,
      details: "Call every vendor with the schedule.",
    },
    {
      id: crypto.randomUUID(),
      title: "Ceremony begins",
      phase: "event-day",
      daysBeforeEvent: 0,
      details: "Guests are seated and the ceremony starts.",
    },
  ],
  vendors: [
    {
      id: crypto.randomUUID(),
      category: "Photographer",
      whyNeeded: "Captures the day.",
      questionsToAsk: ["How many hours are included?"],
      booked: false,
    },
    {
      id: crypto.randomUUID(),
      category: "Caterer",
      whyNeeded: "Feeds 150 guests.",
      questionsToAsk: ["Can you handle vegetarian menus?"],
      booked: false,
    },
    {
      id: crypto.randomUUID(),
      category: "Florist",
      whyNeeded: "Delivers the floral theme.",
      questionsToAsk: ["Which flowers are in season?"],
      booked: false,
    },
  ],
  ideas: [
    {
      id: crypto.randomUUID(),
      title: "Marigold entrance arch",
      description: "A hand-strung marigold arch welcomes guests.",
      inspiredBy: "Warm, floral and traditional vibe",
    },
    {
      id: crypto.randomUUID(),
      title: "Live sitar set",
      description: "A sitar player performs during cocktails.",
      inspiredBy: "Must-have live music",
    },
    {
      id: crypto.randomUUID(),
      title: "Family recipe stalls",
      description: "Stalls serve recipes from both families.",
      inspiredBy: "Traditional feel",
    },
  ],
});

export const makeWorkspace = (overrides: Partial<StoredWorkspace> = {}): StoredWorkspace => ({
  version: 1,
  intake: makeIntake(),
  plan: makePlan(),
  previousPlan: null,
  savedAt: new Date().toISOString(),
  ...overrides,
});

export const seedWorkspace = async (page: Page, workspace: StoredWorkspace): Promise<void> => {
  await page.addInitScript(
    ([key, value]) => {
      const marker = `${key}.seeded`;
      if (window.sessionStorage.getItem(marker) !== null) return;
      window.sessionStorage.setItem(marker, "1");
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, JSON.stringify(workspace)] as const,
  );
};

export const fulfilJson = (route: Route, body: unknown, status = 200): Promise<void> =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

export type ApiCalls = { plan: number; refine: number };

export const mockApi = async (
  page: Page,
  responses: { plan?: Plan; refine?: Plan } = {},
): Promise<ApiCalls> => {
  const calls: ApiCalls = { plan: 0, refine: 0 };
  await page.route("**/api/plan", async (route) => {
    calls.plan += 1;
    await fulfilJson(route, responses.plan ?? makePlan());
  });
  await page.route("**/api/refine", async (route) => {
    calls.refine += 1;
    await fulfilJson(route, responses.refine ?? makePlan("Refined plan summary."));
  });
  return calls;
};

export const fillIntake = async (page: Page, intake: Intake = makeIntake()): Promise<void> => {
  await page.getByLabel("Event name").fill(intake.eventName);
  await page.getByLabel("Event date").fill(intake.eventDate);
  await page.getByLabel("Guest count").fill(String(intake.guestCount));
  await page.getByLabel("Total budget").fill(String(intake.totalBudget));
  await page.getByLabel("City or venue area").fill(intake.location);
  await page.getByLabel("Vibe and preferences").fill(intake.vibe);
};

export const test = base;
