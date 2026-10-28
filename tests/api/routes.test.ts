import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanGenerator } from "@/lib/gemini";
import { createLogger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rateLimit";
import { LIMITS } from "@/lib/constants";
import { PlanSchema, type RefineRequest } from "@/lib/schema";

import { makeGeneratedPlan, makeIntake, makePlan } from "../unit/fixtures";

const generate = vi.fn<PlanGenerator["generate"]>();
const refine = vi.fn<PlanGenerator["refine"]>();

vi.mock("@/lib/api/deps", () => ({
  routeDependencies: {
    generator: () => ({ generate, refine }),
    limiter: createRateLimiter({ capacity: 100, refillPerSecond: 1 }),
    logger: createLogger(() => undefined),
  },
  cspReportDependencies: {
    limiter: createRateLimiter({ capacity: 100, refillPerSecond: 1 }),
    logger: createLogger(() => undefined),
  },
}));

const planRoute = await import("@/app/api/plan/route");
const refineRoute = await import("@/app/api/refine/route");
const cspReportRoute = await import("@/app/api/csp-report/route");
const { POST: planPost } = planRoute;
const { POST: refinePost } = refineRoute;

const request = (url: string, body: unknown): Request =>
  new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

const futureDate = new Date(Date.now() + 864e5 * 30).toISOString().slice(0, 10);

beforeEach(() => {
  generate.mockReset();
  refine.mockReset();
});

describe("app/api/plan route", () => {
  it("exports a POST that generates a plan", async () => {
    generate.mockResolvedValue(makeGeneratedPlan());
    const res = await planPost(
      request("http://localhost/api/plan", makeIntake({ eventDate: futureDate })),
    );
    expect(res.status).toBe(200);
    expect(PlanSchema.safeParse(await res.json()).success).toBe(true);
  });

  it("exports a 60 second maxDuration for both routes", async () => {
    const plan = await import("@/app/api/plan/route");
    const refine = await import("@/app/api/refine/route");
    expect(plan.maxDuration).toBe(60);
    expect(refine.maxDuration).toBe(60);
  });

  it("scales an over-budget plan and clamps unreachable milestones", async () => {
    generate.mockResolvedValue(makeGeneratedPlan());
    const res = await planPost(
      request(
        "http://localhost/api/plan",
        makeIntake({ eventDate: futureDate, totalBudget: 200_000 }),
      ),
    );
    const json = PlanSchema.parse(await res.json());
    expect(json.budget.map((line) => line.amount)).toEqual([100_000, 75_000, 25_000]);
    expect(Math.max(...json.timeline.map((m) => m.daysBeforeEvent))).toBe(30);
  });

  it("rejects invalid intake", async () => {
    const res = await planPost(request("http://localhost/api/plan", { nope: true }));
    expect(res.status).toBe(400);
  });
});

describe("app/api/refine route", () => {
  it("exports a POST that refines and carries booked vendors", async () => {
    const plan = makePlan();
    plan.vendors[0] = { ...plan.vendors[0]!, category: "Caterer", booked: true };
    refine.mockResolvedValue(makeGeneratedPlan());
    const res = await refinePost(
      request("http://localhost/api/refine", {
        intake: makeIntake(),
        plan,
        instruction: "Add more flowers",
      }),
    );
    expect(res.status).toBe(200);
    const json = PlanSchema.parse(await res.json());
    expect(json.vendors.find((v) => v.category === "Caterer")?.booked).toBe(true);
  });

  it("fits the refined plan to the intake budget and date", async () => {
    refine.mockResolvedValue(makeGeneratedPlan());
    const res = await refinePost(
      request("http://localhost/api/refine", {
        intake: makeIntake({ eventDate: futureDate, totalBudget: 40_000 }),
        plan: makePlan(),
        instruction: "Tighten everything",
      }),
    );
    const json = PlanSchema.parse(await res.json());
    expect(json.budget.reduce((sum, line) => sum + line.amount, 0)).toBeLessThanOrEqual(40_000);
    expect(json.timeline.every((m) => m.daysBeforeEvent <= 30)).toBe(true);
  });

  it("rejects a missing instruction", async () => {
    const res = await refinePost(
      request("http://localhost/api/refine", { intake: makeIntake(), plan: makePlan() }),
    );
    expect(res.status).toBe(400);
  });
});

describe.each([
  ["/api/plan", planRoute],
  ["/api/refine", refineRoute],
  ["/api/csp-report", cspReportRoute],
])("%s other methods", (_path, route) => {
  it.each(["GET", "PUT", "PATCH", "DELETE"] as const)(
    "answers %s with 405 and Allow: POST",
    (method) => {
      const res = route[method]();
      expect(res.status).toBe(405);
      expect(res.headers.get("Allow")).toBe("POST");
    },
  );
});

// Every text field at its schema maximum, in a character that takes three UTF-8 bytes.
const maxSizeRefineRequest = (): RefineRequest => {
  const text = (length: number): string => "क".repeat(length);
  const plan = makePlan();
  const id = plan.budget[0]!.id;
  const times = <T>(count: number, item: () => T): T[] => Array.from({ length: count }, item);
  return {
    intake: {
      ...makeIntake({
        eventName: text(LIMITS.shortText),
        location: text(LIMITS.mediumText),
        vibe: text(LIMITS.longText),
        mustHaves: text(LIMITS.longText),
        guestCount: LIMITS.maxGuests,
        totalBudget: LIMITS.maxBudget,
      }),
      eventType: "wedding",
      details: { coupleNames: text(LIMITS.shortText), ceremonyStyle: text(LIMITS.shortText) },
    },
    plan: {
      summary: text(LIMITS.summaryText),
      budget: times(LIMITS.budgetLines.max, () => ({
        id,
        category: text(LIMITS.shortText),
        amount: LIMITS.maxBudget / LIMITS.budgetLines.max,
        rationale: text(LIMITS.mediumText),
      })),
      timeline: times(LIMITS.milestones.max, () => ({
        id,
        title: text(LIMITS.shortText),
        phase: "final-prep" as const,
        daysBeforeEvent: LIMITS.maxDaysBeforeEvent,
        details: text(LIMITS.mediumText),
        done: false,
      })),
      vendors: times(LIMITS.vendors.max, () => ({
        id,
        category: text(LIMITS.shortText),
        whyNeeded: text(LIMITS.mediumText),
        questionsToAsk: times(LIMITS.questionsPerVendor, () => text(LIMITS.mediumText)),
        booked: false,
      })),
      ideas: times(LIMITS.ideas.max, () => ({
        id,
        title: text(LIMITS.shortText),
        description: text(LIMITS.longText),
        inspiredBy: text(LIMITS.mediumText),
      })),
    },
    instruction: text(LIMITS.longText),
  };
};

describe("request body limit", () => {
  it("accepts the largest schema-valid refine request instead of answering 413", async () => {
    refine.mockResolvedValue(makeGeneratedPlan());
    const body = maxSizeRefineRequest();
    const bytes = new TextEncoder().encode(JSON.stringify(body)).byteLength;
    expect(bytes).toBeGreaterThan(LIMITS.requestBodyBytes / 2);
    expect(bytes).toBeLessThanOrEqual(LIMITS.requestBodyBytes);
    const res = await refinePost(request("http://localhost/api/refine", body));
    expect(res.status).toBe(200);
  });
});

describe("app/api/csp-report route", () => {
  it("accepts a report and answers 204", async () => {
    const res = await cspReportRoute.POST(
      new Request("http://localhost/api/csp-report", {
        method: "POST",
        body: JSON.stringify({ "csp-report": { "violated-directive": "script-src" } }),
        headers: { "content-type": "application/csp-report" },
      }),
    );
    expect(res.status).toBe(204);
  });
});
