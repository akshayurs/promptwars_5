import { describe, expect, it } from "vitest";

import {
  budgetStatus,
  groupMilestonesByPhase,
  sanitizeAmount,
  sumAllocated,
  toggleVendor,
  updateLineAmount,
  vendorProgress,
} from "@/lib/budget";

import { makePlan } from "./fixtures";

const lineWith = (amount: number) => ({ ...makePlan().budget[0]!, amount });

describe("sumAllocated", () => {
  it("rounds floating point noise (0.1 + 0.2)", () => {
    expect(sumAllocated([lineWith(0.1), lineWith(0.2)])).toBeCloseTo(0.3, 10);
    expect(sumAllocated([lineWith(0.1), lineWith(0.2)]).toString()).toBe("0.3");
  });

  it("returns 0 for no lines", () => {
    expect(sumAllocated([])).toBe(0);
  });
});

describe("budgetStatus", () => {
  it("handles a zero total without dividing by zero", () => {
    expect(budgetStatus(0, [lineWith(10)])).toEqual({
      allocated: 10,
      remaining: -10,
      ratio: 0,
      overBudget: true,
    });
  });

  it("flags over budget", () => {
    const status = budgetStatus(100, [lineWith(60), lineWith(60)]);
    expect(status.overBudget).toBe(true);
    expect(status.remaining).toBe(-20);
    expect(status.ratio).toBeCloseTo(1.2);
  });

  it("is not over budget on an exact match", () => {
    const status = budgetStatus(100, [lineWith(40), lineWith(60)]);
    expect(status).toEqual({ allocated: 100, remaining: 0, ratio: 1, overBudget: false });
  });

  it("reports remaining under budget", () => {
    expect(budgetStatus(100, [lineWith(25)])).toMatchObject({ remaining: 75, ratio: 0.25 });
  });
});

describe("sanitizeAmount", () => {
  it.each([Number.NaN, -5, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY])(
    "returns 0 for %s",
    (raw) => {
      expect(sanitizeAmount(raw, 1000)).toBe(0);
    },
  );

  it("caps above max", () => {
    expect(sanitizeAmount(5000, 1000)).toBe(1000);
  });

  it("rounds to two decimals", () => {
    expect(sanitizeAmount(10.456, 1000).toString()).toBe("10.46");
    expect(sanitizeAmount(0, 1000)).toBe(0);
  });
});

describe("updateLineAmount", () => {
  it("updates only the matching line without mutating input", () => {
    const { budget } = makePlan();
    const snapshot = structuredClone(budget);
    const target = budget[1]!;
    const next = updateLineAmount(budget, target.id, 42);
    expect(next[1]?.amount).toBe(42);
    expect(next[0]).toBe(budget[0]);
    expect(budget).toEqual(snapshot);
    expect(next).not.toBe(budget);
  });

  it("leaves lines unchanged for an unknown id", () => {
    const { budget } = makePlan();
    expect(updateLineAmount(budget, "missing", 1)).toEqual(budget);
  });
});

describe("toggleVendor", () => {
  it("flips booked for the matching vendor only, without mutation", () => {
    const { vendors } = makePlan();
    const target = vendors[0]!;
    const next = toggleVendor(vendors, target.id);
    expect(next[0]?.booked).toBe(true);
    expect(next[1]).toBe(vendors[1]);
    expect(target.booked).toBe(false);
    expect(toggleVendor(next, target.id)[0]?.booked).toBe(false);
  });
});

describe("vendorProgress", () => {
  it("returns zeros for an empty list", () => {
    expect(vendorProgress([])).toEqual({ booked: 0, total: 0, ratio: 0 });
  });

  it("counts booked vendors", () => {
    const { vendors } = makePlan();
    const progress = vendorProgress([{ ...vendors[0]!, booked: true }, ...vendors.slice(1)]);
    expect(progress.booked).toBe(1);
    expect(progress.total).toBe(3);
    expect(progress.ratio).toBeCloseTo(1 / 3);
  });
});

describe("groupMilestonesByPhase", () => {
  it("orders phases canonically, sorts by days descending and drops empty phases", () => {
    const base = makePlan().timeline[0]!;
    const mk = (phase: typeof base.phase, days: number, title: string) => ({
      ...base,
      id: crypto.randomUUID(),
      phase,
      daysBeforeEvent: days,
      title,
    });
    const groups = groupMilestonesByPhase([
      mk("booking", 10, "b-small"),
      mk("event-day", 0, "day"),
      mk("booking", 100, "b-big"),
    ]);
    expect(groups.map((g) => g.phase)).toEqual(["booking", "event-day"]);
    expect(groups[0]?.milestones.map((m) => m.title)).toEqual(["b-big", "b-small"]);
  });

  it("returns an empty array for an empty timeline", () => {
    expect(groupMilestonesByPhase([])).toEqual([]);
  });
});
