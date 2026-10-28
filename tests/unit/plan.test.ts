import { describe, expect, it } from "vitest";

import {
  diffPlans,
  fitPlanToIntake,
  mergeRefinedPlan,
  toPlan,
  uncoveredBudgetCategories,
} from "@/lib/plan";
import { DAY_MS, LIMITS } from "@/lib/constants";
import { shiftDate, toIsoDay } from "@/lib/dates";
import { PlanSchema, type GeneratedPlan } from "@/lib/schema";

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

  it("marks every milestone as not done", () => {
    const plan = toPlan(makeGeneratedPlan(), counterIds());
    expect(plan.timeline).toHaveLength(4);
    expect(plan.timeline.every((m) => !m.done)).toBe(true);
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

  it("carries milestone completion by title, case-insensitively and trimmed", () => {
    const previous = makePlan();
    previous.timeline[0] = { ...previous.timeline[0]!, title: "Book venue", done: true };
    previous.timeline[1] = { ...previous.timeline[1]!, title: "Pick theme", done: false };
    const generated = makeGeneratedPlan();
    generated.timeline[0] = { ...generated.timeline[0]!, title: "  BOOK venue " };
    const merged = mergeRefinedPlan(previous, generated, counterIds());
    expect(merged.timeline.map((m) => m.done)).toEqual([true, false, false, false]);
  });

  it("carries each completion once when titles repeat", () => {
    const previous = makePlan();
    previous.timeline[0] = { ...previous.timeline[0]!, title: "Book venue", done: true };
    const generated = makeGeneratedPlan();
    generated.timeline = generated.timeline.map((m) => ({ ...m, title: "book venue" }));
    const merged = mergeRefinedPlan(previous, generated, counterIds());
    expect(merged.timeline.map((m) => m.done)).toEqual([true, false, false, false]);
  });

  it("carries two completions of the same title to two matches", () => {
    const previous = makePlan();
    previous.timeline = previous.timeline.map((m, i) => ({ ...m, title: "Call", done: i < 2 }));
    const generated = makeGeneratedPlan();
    generated.timeline = generated.timeline.map((m) => ({ ...m, title: "call" }));
    const merged = mergeRefinedPlan(previous, generated, counterIds());
    expect(merged.timeline.map((m) => m.done)).toEqual([true, true, false, false]);
  });

  it("does not carry completion when the title changes", () => {
    const previous = makePlan();
    previous.timeline = previous.timeline.map((m) => ({ ...m, done: true }));
    const generated = makeGeneratedPlan();
    generated.timeline = generated.timeline.map((m) => ({ ...m, title: `${m.title} (revised)` }));
    const merged = mergeRefinedPlan(previous, generated, counterIds());
    expect(merged.timeline.every((m) => !m.done)).toBe(true);
  });

  it("keeps the planner-added flag on lines the model kept, matched once by category", () => {
    const previous = makePlan();
    previous.budget[0] = { ...previous.budget[0]!, category: "Mehendi", addedByUser: true };
    previous.budget[1] = { ...previous.budget[1]!, addedByUser: false };
    const generated = makeGeneratedPlan();
    generated.budget = [
      { category: " mehendi ", amount: 10, rationale: "Henna" },
      { category: "MEHENDI", amount: 10, rationale: "Henna again" },
      { category: "Catering", amount: 10, rationale: "Food" },
    ];
    const merged = mergeRefinedPlan(previous, generated, counterIds());
    expect(merged.budget.map((line) => line.addedByUser)).toEqual([true, undefined, undefined]);
    expect(merged.budget[1]).not.toHaveProperty("addedByUser");
  });

  it("drops the planner-added flag when the model removed that line", () => {
    const previous = makePlan();
    previous.budget[0] = { ...previous.budget[0]!, category: "Mehendi", addedByUser: true };
    const merged = mergeRefinedPlan(previous, makeGeneratedPlan(), counterIds());
    expect(merged.budget.some((line) => line.addedByUser)).toBe(false);
  });

  it("keeps each vendor's linked budget category", () => {
    const merged = mergeRefinedPlan(makePlan(), makeGeneratedPlan(), counterIds());
    expect(merged.vendors.map((vendor) => vendor.budgetCategory)).toEqual([
      "Catering",
      "Decor",
      "Venue",
    ]);
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

const TODAY = "2030-01-01";

// Both rules run through fitPlanToIntake; each helper leaves the other rule with nothing to do.
const fitBudgetToTotal = (generated: GeneratedPlan, totalBudget: number): GeneratedPlan =>
  fitPlanToIntake(
    generated,
    { eventDate: shiftDate(TODAY, LIMITS.maxDaysBeforeEvent), totalBudget },
    TODAY,
  );

const clampMilestones = (generated: GeneratedPlan, daysUntilEvent: number): GeneratedPlan =>
  fitPlanToIntake(
    generated,
    { eventDate: shiftDate(TODAY, daysUntilEvent), totalBudget: LIMITS.maxBudget },
    TODAY,
  );

describe("fitPlanToIntake budget fit", () => {
  it("keeps the budget lines unchanged when the budget fits", () => {
    const generated = makeGeneratedPlan();
    expect(fitBudgetToTotal(generated, 400_000).budget).toBe(generated.budget);
    expect(fitBudgetToTotal(generated, 1_000_000).budget).toBe(generated.budget);
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
    expect(fitted.vendors).toBe(generated.vendors);
    expect(fitted.ideas).toBe(generated.ideas);
    expect(fitted.budget[0]?.rationale).toBe(generated.budget[0]?.rationale);
  });
});

describe("fitPlanToIntake milestone clamp", () => {
  type GeneratedMilestone = GeneratedPlan["timeline"][number];
  const step = (title: string, phase: GeneratedMilestone["phase"], days: number) => ({
    title,
    phase,
    daysBeforeEvent: days,
    details: "d",
  });
  const titles = (plan: GeneratedPlan): string[] => plan.timeline.map((m) => m.title);

  it("caps daysBeforeEvent at the days remaining", () => {
    const clamped = clampMilestones(makeGeneratedPlan(), 30);
    expect(clamped.timeline.map((m) => m.daysBeforeEvent)).toEqual([30, 30, 14, 0]);
  });

  it("orders the timeline by days and raises phases that would move backwards", () => {
    const generated = makeGeneratedPlan({
      timeline: [
        step("Send invites", "planning", 30),
        step("Book caterer", "booking", 120),
        step("Set budget", "planning", 150),
        step("Rehearse", "event-day", 2),
        step("Confirm", "final-prep", 1),
        step("Day of", "event-day", 0),
      ],
    });
    const clamped = clampMilestones(generated, 400);
    expect(clamped.timeline.map((m) => [m.title, m.phase])).toEqual([
      ["Set budget", "planning"],
      ["Book caterer", "booking"],
      ["Send invites", "booking"],
      ["Rehearse", "event-day"],
      ["Confirm", "event-day"],
      ["Day of", "event-day"],
    ]);
    expect(generated.timeline[0]?.phase).toBe("planning");
  });

  it("breaks day ties by phase so a clamped planning step stays first", () => {
    const generated = makeGeneratedPlan({
      timeline: [
        step("Book", "booking", 90),
        step("Plan", "planning", 90),
        step("Day", "event-day", 0),
      ],
    });
    expect(titles(clampMilestones(generated, 400))).toEqual(["Plan", "Book", "Day"]);
  });

  it("keeps reachable milestones' days and orders them by phase", () => {
    const generated = makeGeneratedPlan();
    const clamped = clampMilestones(generated, 365);
    expect(titles(clamped)).toEqual(["Pick theme", "Book venue", "Final headcount", "Wedding day"]);
    expect(clamped.timeline.map((m) => m.daysBeforeEvent)).toEqual([240, 180, 14, 0]);
    expect(titles(generated)).toEqual([
      "Book venue",
      "Pick theme",
      "Final headcount",
      "Wedding day",
    ]);
  });

  it("orders each phase chronologically, most days before the event first", () => {
    const generated = makeGeneratedPlan({
      timeline: [
        step("Book caterer", "booking", 60),
        step("Day of", "event-day", 0),
        step("Book venue", "booking", 120),
        step("Set budget", "planning", 150),
        step("Confirm", "final-prep", 3),
        step("Seating plan", "final-prep", 10),
      ],
    });
    expect(titles(clampMilestones(generated, 400))).toEqual([
      "Set budget",
      "Book venue",
      "Book caterer",
      "Seating plan",
      "Confirm",
      "Day of",
    ]);
  });

  it("keeps the model's order for milestones that tie after clamping", () => {
    const generated = makeGeneratedPlan({
      timeline: [
        step("Second", "booking", 90),
        step("First", "booking", 200),
        step("Third", "booking", 40),
        step("Day", "event-day", 0),
      ],
    });
    expect(titles(clampMilestones(generated, 50))).toEqual(["Second", "First", "Third", "Day"]);
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
    expect(fitted.timeline.map((m) => m.phase)).toEqual([
      "planning",
      "booking",
      "final-prep",
      "event-day",
    ]);
  });

  it("defaults today to the current UTC day", () => {
    const eventDate = toIsoDay(Date.now() + 10 * DAY_MS);
    const fitted = fitPlanToIntake(makeGeneratedPlan(), { eventDate, totalBudget: 1e9 });
    expect(fitted.timeline.map((m) => m.daysBeforeEvent)).toEqual([10, 10, 10, 0]);
  });
});

describe("uncoveredBudgetCategories", () => {
  const vendor = (category: string, budgetCategory: string) => ({
    category,
    budgetCategory,
    whyNeeded: "w",
    questionsToAsk: ["q"],
  });
  const line = (category: string, amount = 100) => ({ category, amount, rationale: "r" });

  it("reports nothing when every supplier line has a vendor", () => {
    expect(uncoveredBudgetCategories(makeGeneratedPlan())).toEqual([]);
  });

  it("lists supplier lines with no vendor, in budget order", () => {
    const generated = makeGeneratedPlan({
      budget: [line("Venue"), line("Photography"), line("Catering"), line("Music")],
      vendors: [vendor("Caterer", "Catering")],
    });
    expect(uncoveredBudgetCategories(generated)).toEqual(["Venue", "Photography", "Music"]);
  });

  it("matches budgetCategory or the vendor's own category, ignoring case and spaces", () => {
    const generated = makeGeneratedPlan({
      budget: [line("Venue & Catering"), line("Photography"), line("DJ")],
      vendors: [vendor("Hall", "  venue & CATERING "), vendor("dj", "Entertainment")],
    });
    expect(uncoveredBudgetCategories(generated)).toEqual(["Photography"]);
  });

  it("skips reserves, buffers and zero-amount lines", () => {
    const generated = makeGeneratedPlan({
      budget: [
        line("Contingency"),
        line("Contingency Reserve"),
        line("Misc. expenses"),
        line("Miscellaneous"),
        line("Buffer fund"),
        line("Unallocated"),
        line("Donated venue", 0),
        line("Reservations desk staff"),
      ],
      vendors: [vendor("Caterer", "Catering")],
    });
    expect(uncoveredBudgetCategories(generated)).toEqual(["Reservations desk staff"]);
  });
});
