import { describe, expect, it } from "vitest";

import {
  clampMilestones,
  diffPlans,
  fitBudgetToTotal,
  fitPlanToIntake,
  mergeRefinedPlan,
  toPlan,
} from "@/lib/plan";
import { PlanSchema } from "@/lib/schema";

import { makeGeneratedPlan, makePlan } from "./fixtures";

const counterIds = () => {
  let n = 0;
  return () => `id-${String(++n)}`;
};

describe("toPlan", () => {
  it("assigns ids from the factory and marks vendors unbooked", () => {
    const plan = toPlan(makeGeneratedPlan(), counterIds());
    expect(plan.budget.map((b) => b.id)).toEqual(["id-1", "id-2", "id-3"]);
    expect(plan.timeline[0]?.id).toBe("id-4");
    expect(plan.vendors.every((v) => !v.booked)).toBe(true);
    const ids = [...plan.budget, ...plan.timeline, ...plan.vendors, ...plan.ideas].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses random uuids by default producing a schema-valid plan", () => {
    expect(PlanSchema.safeParse(toPlan(makeGeneratedPlan())).success).toBe(true);
  });
});

describe("mergeRefinedPlan", () => {
  it("carries booked state by category, case-insensitively and trimmed", () => {
    const previous = makePlan();
    previous.vendors[0] = { ...previous.vendors[0]!, category: "Caterer", booked: true };
    previous.vendors[1] = { ...previous.vendors[1]!, category: "Florist", booked: false };
    const generated = makeGeneratedPlan();
    generated.vendors[0] = { ...generated.vendors[0]!, category: "  caterer " };
    generated.vendors[2] = { ...generated.vendors[2]!, category: "DJ" };
    const merged = mergeRefinedPlan(previous, generated, counterIds());
    expect(merged.vendors.map((v) => v.booked)).toEqual([true, false, false]);
    expect(merged.vendors[0]?.id).toBe("id-8");
  });

  it("carries each booking once when categories repeat", () => {
    const previous = makePlan();
    previous.vendors[0] = { ...previous.vendors[0]!, category: "Caterer", booked: true };
    previous.vendors[1] = { ...previous.vendors[1]!, category: "Florist", booked: false };
    const generated = makeGeneratedPlan();
    generated.vendors = generated.vendors.map((vendor) => ({ ...vendor, category: "CATERER" }));
    const merged = mergeRefinedPlan(previous, generated, counterIds());
    expect(merged.vendors.map((v) => v.booked)).toEqual([true, false, false]);
  });

  it("carries two bookings of the same category to two matches", () => {
    const previous = makePlan();
    previous.vendors = previous.vendors.map((vendor, i) => ({
      ...vendor,
      category: "Caterer",
      booked: i < 2,
    }));
    const generated = makeGeneratedPlan();
    generated.vendors = generated.vendors.map((vendor) => ({ ...vendor, category: "caterer" }));
    const merged = mergeRefinedPlan(previous, generated, counterIds());
    expect(merged.vendors.map((v) => v.booked)).toEqual([true, true, false]);
  });

  it("defaults to random ids", () => {
    const merged = mergeRefinedPlan(makePlan(), makeGeneratedPlan());
    expect(PlanSchema.safeParse(merged).success).toBe(true);
  });
});

describe("diffPlans", () => {
  it("reports zero changes for identical content", () => {
    const plan = makePlan();
    expect(diffPlans(plan, plan)).toEqual({ budget: 0, timeline: 0, vendors: 0, ideas: 0 });
  });

  it("counts changed and added items", () => {
    const before = makePlan();
    const after = makePlan({
      budget: before.budget.map((line, i) =>
        i === 0 ? { ...line, amount: line.amount + 1 } : line,
      ),
      ideas: [...before.ideas, { ...before.ideas[0]!, id: crypto.randomUUID(), title: "New" }],
    });
    expect(diffPlans(before, after)).toEqual({ budget: 1, timeline: 0, vendors: 0, ideas: 1 });
  });

  it("counts duplicates as a multiset", () => {
    const before = makePlan();
    const [first] = before.vendors;
    const after = makePlan({
      vendors: before.vendors.map((vendor) => ({ ...vendor, category: first!.category })),
    });
    const duplicated = after;
    expect(diffPlans(before, duplicated).vendors).toBe(2);
    expect(diffPlans(duplicated, before).vendors).toBe(2);
  });

  it("counts removals", () => {
    const before = makePlan();
    const after = makePlan({
      vendors: before.vendors.slice(0, 1),
      timeline: before.timeline.slice(0, 2),
    });
    const diff = diffPlans(before, after);
    expect(diff.vendors).toBe(2);
    expect(diff.timeline).toBe(2);
  });
});

describe("fitBudgetToTotal", () => {
  it("returns the plan unchanged when the budget fits", () => {
    const generated = makeGeneratedPlan();
    expect(fitBudgetToTotal(generated, 400_000)).toBe(generated);
    expect(fitBudgetToTotal(generated, 1_000_000)).toBe(generated);
  });

  it("scales amounts proportionally so the sum fits the total", () => {
    const fitted = fitBudgetToTotal(makeGeneratedPlan(), 200_000);
    expect(fitted.budget.map((line) => line.amount)).toEqual([100_000, 75_000, 25_000]);
  });

  it("floors to two decimals and never exceeds the total", () => {
    const generated = makeGeneratedPlan({
      budget: [
        { category: "A", amount: 1, rationale: "r" },
        { category: "B", amount: 1, rationale: "r" },
        { category: "C", amount: 1, rationale: "r" },
      ],
    });
    const fitted = fitBudgetToTotal(generated, 1);
    expect(fitted.budget.map((line) => line.amount)).toEqual([0.33, 0.33, 0.33]);
    const sum = fitted.budget.reduce((total, line) => total + line.amount, 0);
    expect(sum).toBeLessThanOrEqual(1);
  });

  it("keeps other plan sections intact", () => {
    const generated = makeGeneratedPlan();
    const fitted = fitBudgetToTotal(generated, 10);
    expect(fitted.timeline).toBe(generated.timeline);
    expect(fitted.budget[0]?.rationale).toBe(generated.budget[0]?.rationale);
  });
});

describe("clampMilestones", () => {
  it("caps daysBeforeEvent at the days remaining", () => {
    const clamped = clampMilestones(makeGeneratedPlan(), 30);
    expect(clamped.timeline.map((m) => m.daysBeforeEvent)).toEqual([30, 30, 14, 0]);
  });

  it("leaves reachable milestones alone", () => {
    const generated = makeGeneratedPlan();
    expect(clampMilestones(generated, 365).timeline).toEqual(generated.timeline);
  });

  it("treats past events as zero days remaining", () => {
    const clamped = clampMilestones(makeGeneratedPlan(), -5);
    expect(clamped.timeline.every((m) => m.daysBeforeEvent === 0)).toBe(true);
  });
});

describe("fitPlanToIntake", () => {
  it("applies the budget fit and milestone clamp from the intake", () => {
    const fitted = fitPlanToIntake(
      makeGeneratedPlan(),
      { eventDate: "2030-01-21", totalBudget: 200_000 },
      "2030-01-01",
    );
    expect(fitted.budget.map((line) => line.amount)).toEqual([100_000, 75_000, 25_000]);
    expect(fitted.timeline.map((m) => m.daysBeforeEvent)).toEqual([20, 20, 14, 0]);
  });

  it("defaults today to the current UTC day", () => {
    const eventDate = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
    const fitted = fitPlanToIntake(makeGeneratedPlan(), { eventDate, totalBudget: 1e9 });
    expect(fitted.timeline.map((m) => m.daysBeforeEvent)).toEqual([10, 10, 10, 0]);
  });
});
