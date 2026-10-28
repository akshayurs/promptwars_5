import { test as base, expect, type Page, type Route } from "@playwright/test";

import { DAY_MS, STORAGE_KEY } from "../../lib/constants";
import {
  IntakeSchema,
  RefineRequestSchema,
  type EventType,
  type Intake,
  type Plan,
  type StoredWorkspace,
} from "../../lib/schema";

export { expect };

const futureDate = (days = 60): string =>
  new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);

type IntakeOverrides = Partial<Omit<Intake, "eventType" | "details">>;

export const makeIntake = (overrides: IntakeOverrides = {}): Intake => ({
  eventType: "wedding",
  details: { coupleNames: "Asha and Ravi", ceremonyStyle: "Traditional Hindu" },
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

const COMMON_INTAKE = {
  eventDate: futureDate(),
  guestCount: 150,
  totalBudget: 500_000,
  currency: "INR",
  location: "Bengaluru",
  vibe: "Warm, floral and traditional",
  mustHaves: "Live music",
} as const;

const INTAKES: Record<EventType, Intake> = {
  wedding: makeIntake(),
  birthday: {
    ...COMMON_INTAKE,
    eventType: "birthday",
    details: { honoreeName: "Meera", honoreeAge: 30 },
    eventName: "Meera's 30th Birthday",
    vibe: "Garden party with fairy lights",
  },
  community: {
    ...COMMON_INTAKE,
    eventType: "community",
    details: { admission: "ticketed", needsPermit: true },
    eventName: "Lakeside Neighbourhood Fair",
    vibe: "Family friendly street fair",
  },
};

export const makeIntakeFor = (eventType: EventType): Intake => ({ ...INTAKES[eventType] });

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
      done: false,
      details: "Confirm the hall and pay the deposit.",
    },
    {
      id: crypto.randomUUID(),
      title: "Finalise the guest list",
      phase: "planning",
      daysBeforeEvent: 55,
      done: false,
      details: "Collect confirmed names from both families.",
    },
    {
      id: crypto.randomUUID(),
      title: "Confirm vendor arrivals",
      phase: "final-prep",
      daysBeforeEvent: 3,
      done: false,
      details: "Call every vendor with the schedule.",
    },
    {
      id: crypto.randomUUID(),
      title: "Ceremony begins",
      phase: "event-day",
      daysBeforeEvent: 0,
      done: false,
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
  version: 2,
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

export type ApiCalls = {
  plan: number;
  refine: number;
  planBodies: unknown[];
  refineBodies: unknown[];
};

const payloadProblems = (
  route: Route,
  schema: { safeParse: (v: unknown) => { success: boolean } },
) => {
  const request = route.request();
  const problems: string[] = [];
  if (request.method() !== "POST") problems.push(`${request.url()} used ${request.method()}`);
  if (!(request.headers()["content-type"] ?? "").startsWith("application/json")) {
    problems.push(`${request.url()} sent a non-JSON content type`);
  }
  const body: unknown = request.postDataJSON();
  if (!schema.safeParse(body).success) problems.push(`${request.url()} sent an invalid body`);
  return { problems, body };
};

const payloadViolations = new WeakMap<Page, string[]>();

/**
 * Intercepts both API routes with fixtures and records every request body. Requests that are not
 * JSON POSTs matching the shared request schemas are recorded as violations, which fail the test.
 */
export const mockApi = async (
  page: Page,
  responses: { plan?: Plan; refine?: Plan } = {},
): Promise<ApiCalls> => {
  const calls: ApiCalls = { plan: 0, refine: 0, planBodies: [], refineBodies: [] };
  const violations = payloadViolations.get(page) ?? [];
  payloadViolations.set(page, violations);
  await page.route("**/api/plan", async (route) => {
    calls.plan += 1;
    const { problems, body } = payloadProblems(route, IntakeSchema);
    violations.push(...problems);
    calls.planBodies.push(body);
    await fulfilJson(route, responses.plan ?? makePlan());
  });
  await page.route("**/api/refine", async (route) => {
    calls.refine += 1;
    const { problems, body } = payloadProblems(route, RefineRequestSchema);
    violations.push(...problems);
    calls.refineBodies.push(body);
    await fulfilJson(route, responses.refine ?? makePlan("Refined plan summary."));
  });
  return calls;
};

const EVENT_TYPE_NAMES: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

const fillDetails = async (page: Page, intake: Intake): Promise<void> => {
  switch (intake.eventType) {
    case "wedding":
      await page.getByLabel("Couple's names").fill(intake.details.coupleNames);
      await page.getByLabel("Ceremony style").fill(intake.details.ceremonyStyle);
      return;
    case "birthday":
      await page.getByLabel("Guest of honour's name").fill(intake.details.honoreeName);
      await page.getByLabel("Age they are turning").fill(String(intake.details.honoreeAge));
      return;
    case "community":
      await page.getByLabel("Admission").selectOption(intake.details.admission);
      await page
        .getByLabel("This event needs a public permit")
        .setChecked(intake.details.needsPermit);
  }
};

export const fillIntake = async (page: Page, intake: Intake = makeIntake()): Promise<void> => {
  await page.getByRole("radio", { name: EVENT_TYPE_NAMES[intake.eventType] }).check();
  await page.getByLabel("Event name").fill(intake.eventName);
  await fillDetails(page, intake);
  await page.getByLabel("Event date").fill(intake.eventDate);
  await page.getByLabel("Guest count").fill(String(intake.guestCount));
  await page.getByLabel("Total budget").fill(String(intake.totalBudget));
  await page.getByLabel("City or venue area").fill(intake.location);
  await page.getByLabel("Vibe and preferences").fill(intake.vibe);
};

type PageGuard = { problems: string[] };

const installGuard = async (page: Page): Promise<PageGuard> => {
  const guard: PageGuard = { problems: [] };
  await page.exposeFunction("reportCspViolation", (detail: string) => {
    guard.problems.push(`CSP violation: ${detail}`);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      const report = (window as unknown as { reportCspViolation: (detail: string) => void })
        .reportCspViolation;
      report(`${event.violatedDirective} blocked ${event.blockedURI}`);
    });
  });
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) guard.problems.push(message.text());
  });
  page.on("pageerror", (error) => {
    guard.problems.push(`Uncaught page error: ${error.message}`);
  });
  return guard;
};

/** Every test fails on a CSP violation, an uncaught page error or a malformed mocked API request. */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const guard = await installGuard(page);
    await provide(page);
    expect(guard.problems, "CSP violations and uncaught page errors").toEqual([]);
    expect(payloadViolations.get(page) ?? [], "malformed API requests").toEqual([]);
  },
});
