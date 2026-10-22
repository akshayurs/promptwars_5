import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanGenerator } from "@/lib/gemini";
import { createLogger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rateLimit";
import { PlanSchema } from "@/lib/schema";

import { makeGeneratedPlan, makeIntake, makePlan } from "../unit/fixtures";

const generate = vi.fn<PlanGenerator["generate"]>();
const refine = vi.fn<PlanGenerator["refine"]>();

vi.mock("@/lib/api/deps", () => ({
  routeDependencies: {
    generator: () => ({ generate, refine }),
    limiter: createRateLimiter({ capacity: 100, refillPerSecond: 1 }),
    logger: createLogger(() => undefined),
  },
}));

const { POST: planPost } = await import("@/app/api/plan/route");
const { POST: refinePost } = await import("@/app/api/refine/route");

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
