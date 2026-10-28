import { describe, expect, it } from "vitest";

import { addBudgetLine, isValidLineAmount, removeBudgetLine } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

const line = (index: number): BudgetLine => ({
  id: crypto.randomUUID(),
  category: `Line ${index}`,
  amount: index * 100,
  rationale: "Reason",
});

const linesOf = (count: number): BudgetLine[] =>
  Array.from({ length: count }, (_, index) => line(index));

describe("addBudgetLine", () => {
  it("appends below the maximum without mutating the input", () => {
    const lines = Object.freeze(linesOf(LIMITS.budgetLines.min));
    const extra = line(50);
    const next = addBudgetLine(lines, extra);
    expect(next).toEqual([...lines, extra]);
    expect(lines).toHaveLength(LIMITS.budgetLines.min);
  });

  it("appends at one below the maximum", () => {
    const lines = linesOf(LIMITS.budgetLines.max - 1);
    expect(addBudgetLine(lines, line(50))).toHaveLength(LIMITS.budgetLines.max);
  });

  it("inserts at the given index, restoring a removed line in place", () => {
    const lines = linesOf(LIMITS.budgetLines.min + 1);
    const removed = lines[1]!;
    const restored = addBudgetLine(removeBudgetLine(lines, removed.id), removed, 1);
    expect(restored).toEqual(lines);
  });

  it("returns the same array at the maximum", () => {
    const lines = Object.freeze(linesOf(LIMITS.budgetLines.max));
    expect(addBudgetLine(lines, line(50))).toBe(lines);
  });

  it("returns the same array above the maximum", () => {
    const lines = linesOf(LIMITS.budgetLines.max + 1);
    expect(addBudgetLine(lines, line(50))).toBe(lines);
  });

  it("returns the same array when a line with that id already exists", () => {
    const lines = linesOf(LIMITS.budgetLines.min);
    expect(addBudgetLine(lines, { ...lines[0]!, category: "Copy" }, 0)).toBe(lines);
  });
});

describe("removeBudgetLine", () => {
  it("removes the matching line above the minimum without mutating the input", () => {
    const lines = Object.freeze(linesOf(LIMITS.budgetLines.min + 1));
    const next = removeBudgetLine(lines, lines[1]!.id);
    expect(next).toEqual([lines[0], ...lines.slice(2)]);
    expect(lines).toHaveLength(LIMITS.budgetLines.min + 1);
  });

  it("returns the same array at the minimum", () => {
    const lines = Object.freeze(linesOf(LIMITS.budgetLines.min));
    expect(removeBudgetLine(lines, lines[0]!.id)).toBe(lines);
  });

  it("returns the same array below the minimum", () => {
    const lines = linesOf(LIMITS.budgetLines.min - 1);
    expect(removeBudgetLine(lines, lines[0]!.id)).toBe(lines);
  });

  it("returns the same array when the id is unknown", () => {
    const lines = linesOf(LIMITS.budgetLines.min + 2);
    expect(removeBudgetLine(lines, "missing")).toBe(lines);
  });
});

describe("isValidLineAmount", () => {
  it.each([0, 1, 0.5, LIMITS.maxBudget])("accepts %d", (amount) => {
    expect(isValidLineAmount(amount)).toBe(true);
  });

  it.each([-1, LIMITS.maxBudget + 1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %d",
    (amount) => {
      expect(isValidLineAmount(amount)).toBe(false);
    },
  );
});
