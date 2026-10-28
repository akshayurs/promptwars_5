import { describe, expect, it } from "vitest";

import { LIMITS } from "@/lib/constants";
import { GeneratedPlanSchema, LenientGeneratedPlanSchema, PlanSchema } from "@/lib/schema";

import { makeGeneratedPlan, makePlan } from "./fixtures";

const rep = (n: number): string => "a".repeat(n);

describe("GeneratedPlanSchema", () => {
  const rows = <T>(item: T, n: number): T[] => Array.from({ length: n }, () => item);
  const base = makeGeneratedPlan();
  const [line] = base.budget;
  const [milestone] = base.timeline;
  const [vendor] = base.vendors;
  const [idea] = base.ideas;
  if (!line || !milestone || !vendor || !idea) throw new Error("fixture");

  it("accepts a valid plan", () => {
    expect(GeneratedPlanSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    { key: "budget", item: line, min: 3, max: 15 },
    { key: "timeline", item: milestone, min: 4, max: 25 },
    { key: "vendors", item: vendor, min: 3, max: 15 },
    { key: "ideas", item: idea, min: 3, max: 10 },
  ])("enforces $key array size bounds", ({ key, item, min, max }) => {
    const attempt = (n: number) =>
      GeneratedPlanSchema.safeParse({ ...base, [key]: rows(item, n) }).success;
    expect(attempt(min - 1)).toBe(false);
    expect(attempt(min)).toBe(true);
    expect(attempt(max)).toBe(true);
    expect(attempt(max + 1)).toBe(false);
  });

  it("enforces text limits", () => {
    expect(GeneratedPlanSchema.safeParse({ ...base, summary: rep(600) }).success).toBe(true);
    expect(GeneratedPlanSchema.safeParse({ ...base, summary: rep(601) }).success).toBe(false);
    expect(GeneratedPlanSchema.safeParse({ ...base, summary: "  " }).success).toBe(false);
  });

  it("rejects negative amounts and out-of-range days", () => {
    const bad = { ...base, budget: [{ ...line, amount: -1 }, ...base.budget.slice(1)] };
    expect(GeneratedPlanSchema.safeParse(bad).success).toBe(false);
    const days = {
      ...base,
      timeline: [{ ...milestone, daysBeforeEvent: 1096 }, ...base.timeline.slice(1)],
    };
    expect(GeneratedPlanSchema.safeParse(days).success).toBe(false);
    const frac = {
      ...base,
      timeline: [{ ...milestone, daysBeforeEvent: 1.5 }, ...base.timeline.slice(1)],
    };
    expect(GeneratedPlanSchema.safeParse(frac).success).toBe(false);
  });

  it("limits questions per vendor to 1..5", () => {
    const withQuestions = (n: number) => ({
      ...base,
      vendors: [{ ...vendor, questionsToAsk: rows("Q?", n) }, ...base.vendors.slice(1)],
    });
    expect(GeneratedPlanSchema.safeParse(withQuestions(0)).success).toBe(false);
    expect(GeneratedPlanSchema.safeParse(withQuestions(5)).success).toBe(true);
    expect(GeneratedPlanSchema.safeParse(withQuestions(6)).success).toBe(false);
  });

  it("rejects an unknown milestone phase", () => {
    const bad = {
      ...base,
      timeline: [{ ...milestone, phase: "later" }, ...base.timeline.slice(1)],
    };
    expect(GeneratedPlanSchema.safeParse(bad).success).toBe(false);
  });
});

describe("LenientGeneratedPlanSchema", () => {
  const base = makeGeneratedPlan();
  const [line] = base.budget;
  const [vendor] = base.vendors;
  const [idea] = base.ideas;
  if (!line || !vendor || !idea) throw new Error("fixture");

  it("accepts a valid plan unchanged", () => {
    expect(LenientGeneratedPlanSchema.parse(base)).toEqual(base);
  });

  it("trims and truncates over-long strings instead of rejecting", () => {
    const parsed = LenientGeneratedPlanSchema.parse({
      ...base,
      summary: `  ${rep(700)}  `,
      ideas: [{ ...idea, description: rep(LIMITS.longText + 5) }, ...base.ideas.slice(1)],
    });
    expect(parsed.summary).toBe(`${rep(LIMITS.summaryText - 1)}…`);
    expect(parsed.ideas[0]?.description).toHaveLength(LIMITS.longText);
    expect(GeneratedPlanSchema.safeParse(parsed).success).toBe(true);
  });

  it("slices arrays to their maximum length", () => {
    const parsed = LenientGeneratedPlanSchema.parse({
      ...base,
      budget: Array.from({ length: LIMITS.budgetLines.max + 3 }, () => line),
      vendors: [
        { ...vendor, questionsToAsk: Array.from({ length: 9 }, () => "Q?") },
        ...base.vendors.slice(1),
      ],
    });
    expect(parsed.budget).toHaveLength(LIMITS.budgetLines.max);
    expect(parsed.vendors[0]?.questionsToAsk).toHaveLength(LIMITS.questionsPerVendor);
  });

  it("still rejects minimum violations", () => {
    expect(LenientGeneratedPlanSchema.safeParse({ ...base, summary: "   " }).success).toBe(false);
    expect(
      LenientGeneratedPlanSchema.safeParse({ ...base, ideas: base.ideas.slice(0, 2) }).success,
    ).toBe(false);
  });
});

describe("PlanSchema", () => {
  it("accepts a plan with uuid ids and vendor.booked", () => {
    expect(PlanSchema.safeParse(makePlan()).success).toBe(true);
  });

  it("rejects non-uuid ids", () => {
    const plan = makePlan();
    const [first, ...rest] = plan.budget;
    if (!first) throw new Error("fixture");
    expect(
      PlanSchema.safeParse({ ...plan, budget: [{ ...first, id: "abc" }, ...rest] }).success,
    ).toBe(false);
  });

  it("requires vendor.booked", () => {
    const plan = makePlan();
    const [first, ...rest] = plan.vendors;
    if (!first) throw new Error("fixture");
    const unbooked: Record<string, unknown> = { ...first };
    delete unbooked.booked;
    expect(PlanSchema.safeParse({ ...plan, vendors: [unbooked, ...rest] }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(PlanSchema.safeParse({ ...makePlan(), extra: true }).success).toBe(false);
  });
});
