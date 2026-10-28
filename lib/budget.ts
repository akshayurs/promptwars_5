import { LIMITS } from "@/lib/constants";
import { roundMoney } from "@/lib/money";
import type { BudgetLine } from "@/lib/schema";

export type BudgetStatus = {
  allocated: number;
  remaining: number;
  ratio: number;
  overBudget: boolean;
};

type Lines = readonly BudgetLine[];

/** Sum of every line amount, rounded to the minor unit. */
export const sumAllocated = (lines: ReadonlyArray<Pick<BudgetLine, "amount">>): number =>
  roundMoney(lines.reduce((total, line) => total + line.amount, 0));

/** Allocation against the total budget: amount left, share used and whether it is overspent. */
export const budgetStatus = (totalBudget: number, lines: Lines): BudgetStatus => {
  const allocated = sumAllocated(lines);
  const remaining = roundMoney(totalBudget - allocated);
  return {
    allocated,
    remaining,
    ratio: totalBudget > 0 ? allocated / totalBudget : 0,
    overBudget: remaining < 0,
  };
};

/** Whether a total budget is a positive, finite amount within the supported maximum. */
export const isValidTotal = (amount: number): boolean =>
  Number.isFinite(amount) && amount > 0 && amount <= LIMITS.maxBudget;

/** Whether a line amount is a finite number from 0 to the supported maximum. */
export const isValidLineAmount = (amount: number): boolean =>
  Number.isFinite(amount) && amount >= 0 && amount <= LIMITS.maxBudget;

/** Clamps a typed amount to 0..max and rounds it to the minor unit; non-numbers become 0. */
export const sanitizeAmount = (raw: number, max: number): number => {
  if (!Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return roundMoney(Math.min(raw, max));
};

/** Sets one line's amount; returns the same array when no amount actually changes. */
export const updateLineAmount = <T extends Lines>(
  lines: T,
  id: string,
  amount: number,
): T | BudgetLine[] =>
  lines.some((line) => line.id === id && line.amount !== amount)
    ? lines.map((line) => (line.id === id ? { ...line, amount } : line))
    : lines;

/**
 * Inserts a line at `index` (appending by default). Returns the same array when the plan already
 * has the maximum number of lines or a line with that id.
 */
export const addBudgetLine = <T extends Lines>(
  lines: T,
  line: BudgetLine,
  index: number = lines.length,
): T | BudgetLine[] =>
  lines.length >= LIMITS.budgetLines.max || lines.some((existing) => existing.id === line.id)
    ? lines
    : lines.toSpliced(index, 0, line);

/** Removes a line; returns the same array at the minimum number of lines or for an unknown id. */
export const removeBudgetLine = <T extends Lines>(lines: T, id: string): T | BudgetLine[] =>
  lines.length <= LIMITS.budgetLines.min || !lines.some((line) => line.id === id)
    ? lines
    : lines.filter((line) => line.id !== id);
