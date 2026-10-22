import { MILESTONE_PHASES } from "@/lib/constants";
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
