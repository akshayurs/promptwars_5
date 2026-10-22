import { LIMITS, MILESTONE_PHASES } from "@/lib/constants";
import type { BudgetLine, Milestone, Vendor } from "@/lib/schema";

export type BudgetStatus = {
  allocated: number;
  remaining: number;
  ratio: number;
  overBudget: boolean;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const sumAllocated = (lines: readonly BudgetLine[]): number =>
  roundMoney(lines.reduce((total, line) => total + line.amount, 0));

export const budgetStatus = (totalBudget: number, lines: readonly BudgetLine[]): BudgetStatus => {
  const allocated = sumAllocated(lines);
  const remaining = roundMoney(totalBudget - allocated);
  return {
    allocated,
    remaining,
    ratio: totalBudget > 0 ? allocated / totalBudget : 0,
    overBudget: remaining < 0,
  };
};

export const sanitizeAmount = (raw: number, max: number): number => {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return roundMoney(Math.min(raw, max));
};

export const updateLineAmount = (
  lines: readonly BudgetLine[],
  id: string,
  amount: number,
): BudgetLine[] => lines.map((line) => (line.id === id ? { ...line, amount } : line));

export const toggleVendor = (vendors: readonly Vendor[], id: string): Vendor[] =>
  vendors.map((vendor) => (vendor.id === id ? { ...vendor, booked: !vendor.booked } : vendor));

export type VendorProgress = { booked: number; total: number; ratio: number };

export const vendorProgress = (vendors: readonly Vendor[]): VendorProgress => {
  const booked = vendors.filter((vendor) => vendor.booked).length;
  return { booked, total: vendors.length, ratio: vendors.length > 0 ? booked / vendors.length : 0 };
};

export type Phase = Milestone["phase"];

export const groupMilestonesByPhase = (
  timeline: readonly Milestone[],
): ReadonlyArray<{ phase: Phase; milestones: Milestone[] }> =>
  MILESTONE_PHASES.map((phase) => ({
    phase,
    milestones: timeline
      .filter((milestone) => milestone.phase === phase)
      .toSorted((a, b) => b.daysBeforeEvent - a.daysBeforeEvent),
  })).filter((group) => group.milestones.length > 0);

export const toggleMilestone = (timeline: readonly Milestone[], id: string): Milestone[] =>
  timeline.map((milestone) =>
    milestone.id === id ? { ...milestone, done: !milestone.done } : milestone,
  );

export type MilestoneProgress = { done: number; total: number; ratio: number };

export const milestoneProgress = (timeline: readonly Milestone[]): MilestoneProgress => {
  const done = timeline.filter((milestone) => milestone.done).length;
  return { done, total: timeline.length, ratio: timeline.length > 0 ? done / timeline.length : 0 };
};

/** The earliest-due milestone that is still open, or null when everything is done. */
export const nextMilestone = (timeline: readonly Milestone[]): Milestone | null =>
  timeline
    .filter((milestone) => !milestone.done)
    .toSorted((a, b) => b.daysBeforeEvent - a.daysBeforeEvent)[0] ?? null;

export const addBudgetLine = (lines: readonly BudgetLine[], line: BudgetLine): BudgetLine[] =>
  lines.length >= LIMITS.budgetLines.max ? [...lines] : [...lines, line];

export const removeBudgetLine = (lines: readonly BudgetLine[], id: string): BudgetLine[] =>
  lines.length <= LIMITS.budgetLines.min ? [...lines] : lines.filter((line) => line.id !== id);
