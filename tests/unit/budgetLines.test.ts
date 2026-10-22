import { describe, expect, it } from "vitest";

import { addBudgetLine, removeBudgetLine } from "@/lib/budget";
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

  it("returns an unchanged copy at the maximum", () => {
    const lines = Object.freeze(linesOf(LIMITS.budgetLines.max));
    const next = addBudgetLine(lines, line(50));
    expect(next).toEqual(lines);
    expect(next).not.toBe(lines);
  });

  it("returns an unchanged copy above the maximum", () => {
    const lines = linesOf(LIMITS.budgetLines.max + 1);
    expect(addBudgetLine(lines, line(50))).toEqual(lines);
  });
});

describe("removeBudgetLine", () => {
  it("removes the matching line above the minimum without mutating the input", () => {
    const lines = Object.freeze(linesOf(LIMITS.budgetLines.min + 1));
    const next = removeBudgetLine(lines, lines[1]!.id);
    expect(next).toEqual([lines[0], ...lines.slice(2)]);
    expect(lines).toHaveLength(LIMITS.budgetLines.min + 1);
  });

  it("returns an unchanged copy at the minimum", () => {
    const lines = Object.freeze(linesOf(LIMITS.budgetLines.min));
    const next = removeBudgetLine(lines, lines[0]!.id);
    expect(next).toEqual(lines);
    expect(next).not.toBe(lines);
  });

  it("returns an unchanged copy below the minimum", () => {
    const lines = linesOf(LIMITS.budgetLines.min - 1);
    expect(removeBudgetLine(lines, lines[0]!.id)).toEqual(lines);
  });

  it("returns an equal copy when the id is unknown", () => {
    const lines = linesOf(LIMITS.budgetLines.min + 2);
    const next = removeBudgetLine(lines, "missing");
    expect(next).toEqual(lines);
    expect(next).not.toBe(lines);
  });
});
