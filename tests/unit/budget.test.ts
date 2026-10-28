import { describe, expect, it } from "vitest";

import {
  budgetStatus,
  isValidTotal,
  sanitizeAmount,
  sumAllocated,
  updateLineAmount,
} from "@/lib/budget";
import { LIMITS } from "@/lib/constants";

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

  it("accepts lines without ids (model output)", () => {
    expect(sumAllocated([{ amount: 1.005 }, { amount: 2 }]).toString()).toBe("3.01");
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

  it("returns the same array for an unknown id", () => {
    const { budget } = makePlan();
    expect(updateLineAmount(budget, "missing", 1)).toBe(budget);
  });

  it("returns the same array when the amount is unchanged", () => {
    const { budget } = makePlan();
    const target = budget[0]!;
    expect(updateLineAmount(budget, target.id, target.amount)).toBe(budget);
  });
});

describe("isValidTotal", () => {
  it.each([0.01, 1, LIMITS.maxBudget])("accepts %s", (amount) => {
    expect(isValidTotal(amount)).toBe(true);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, LIMITS.maxBudget + 1])(
    "rejects %s",
    (amount) => {
      expect(isValidTotal(amount)).toBe(false);
    },
  );
});
