import { sumAllocated } from "@/lib/budget";
import { countBy } from "@/lib/collections";
import { daysBetween, todayIso } from "@/lib/dates";
import { NON_SUPPLIER_BUDGET_WORDS } from "@/lib/constants";
import { randomId, type IdFactory } from "@/lib/ids";
import { orderTimeline } from "@/lib/milestones";
import { floorMoney } from "@/lib/money";
import type { GeneratedPlan, Intake, Plan } from "@/lib/schema";

const withIds = <T>(items: readonly T[], nextId: IdFactory): Array<T & { id: string }> =>
  items.map((item) => ({ ...item, id: nextId() }));

/** Turns model output into a fresh plan: new ids, nothing booked and nothing done. */
export const toPlan = (generated: GeneratedPlan, nextId: IdFactory = randomId): Plan => ({
  summary: generated.summary,
  budget: withIds(generated.budget, nextId),
  timeline: withIds(generated.timeline, nextId).map((milestone) => ({ ...milestone, done: false })),
  vendors: withIds(generated.vendors, nextId).map((vendor) => ({ ...vendor, booked: false })),
  ideas: withIds(generated.ideas, nextId),
});

/** Scales budget lines down proportionally (floored to minor units) when they exceed the total. */
const fitBudgetToTotal = (generated: GeneratedPlan, totalBudget: number): GeneratedPlan => {
  const allocated = sumAllocated(generated.budget);
  if (allocated <= totalBudget) {
    return generated;
  }
  const ratio = totalBudget / allocated;
  return {
    ...generated,
    budget: generated.budget.map((line) => ({ ...line, amount: floorMoney(line.amount * ratio) })),
  };
};

/**
 * Caps every milestone at the days remaining so none lands in the past, then orders the timeline
 * chronologically with phases that only move forward (see orderTimeline).
 */
const clampMilestones = (generated: GeneratedPlan, daysUntilEvent: number): GeneratedPlan => {
  const latest = Math.max(daysUntilEvent, 0);
  return {
    ...generated,
    timeline: orderTimeline(
      generated.timeline.map((milestone) => ({
        ...milestone,
        daysBeforeEvent: Math.min(milestone.daysBeforeEvent, latest),
      })),
    ),
  };
};

/** Applies the server-side rules (budget fits the total, milestones reachable) to model output. */
export const fitPlanToIntake = (
  generated: GeneratedPlan,
  intake: Pick<Intake, "eventDate" | "totalBudget">,
  today: string = todayIso(),
): GeneratedPlan =>
  clampMilestones(
    fitBudgetToTotal(generated, intake.totalBudget),
    daysBetween(today, intake.eventDate),
  );

const normalize = (value: string): string => value.trim().toLowerCase();

const takeOne = (pool: Map<string, number>, key: string): boolean => {
  const left = pool.get(key) ?? 0;
  if (left === 0) {
    return false;
  }
  pool.set(key, left - 1);
  return true;
};

type Carry<T> = {
  flagged: (item: T) => boolean;
  key: (item: T) => string;
  apply: (item: T, matched: boolean) => T;
};

// Each flagged previous item lends its flag to at most one next item with the same key.
const carryOver = <T>(previous: readonly T[], next: readonly T[], carry: Carry<T>): T[] => {
  const pool = countBy(previous.filter(carry.flagged).map((item) => normalize(carry.key(item))));
  return next.map((item) => carry.apply(item, takeOne(pool, normalize(carry.key(item)))));
};

/**
 * Builds the refined plan, carrying bookings (by vendor category), completion (by milestone
 * title) and planner-added budget lines (by category) over from the previous plan; matches
 * ignore case and surrounding spaces.
 */
export const mergeRefinedPlan = (
  previous: Plan,
  generated: GeneratedPlan,
  nextId: IdFactory = randomId,
): Plan => {
  const fresh = toPlan(generated, nextId);
  return {
    ...fresh,
    budget: carryOver(previous.budget, fresh.budget, {
      flagged: (line) => line.addedByUser === true,
      key: (line) => line.category,
      apply: (line, matched) => (matched ? { ...line, addedByUser: true } : line),
    }),
    vendors: carryOver(previous.vendors, fresh.vendors, {
      flagged: (vendor) => vendor.booked,
      key: (vendor) => vendor.category,
      apply: (vendor, booked) => ({ ...vendor, booked }),
    }),
    timeline: carryOver(previous.timeline, fresh.timeline, {
      flagged: (milestone) => milestone.done,
      key: (milestone) => milestone.title,
      apply: (milestone, done) => ({ ...milestone, done }),
    }),
  };
};

const NON_SUPPLIER_WORDS: ReadonlySet<string> = new Set(NON_SUPPLIER_BUDGET_WORDS);

// A line pays an outside supplier unless it is empty or a held-back reserve such as contingency.
const paysSupplier = ({ category, amount }: GeneratedPlan["budget"][number]): boolean =>
  amount > 0 &&
  !normalize(category)
    .split(/[^\p{L}\p{N}]+/u)
    .some((word) => NON_SUPPLIER_WORDS.has(word));

/**
 * Categories of supplier budget lines that no vendor serves. A vendor serves the line its
 * budgetCategory names, or the line sharing its own category; matches ignore case and spaces.
 */
export const uncoveredBudgetCategories = (generated: GeneratedPlan): string[] => {
  const served = new Set(
    generated.vendors.flatMap((vendor) => [
      normalize(vendor.budgetCategory),
      normalize(vendor.category),
    ]),
  );
  return generated.budget
    .filter((line) => paysSupplier(line) && !served.has(normalize(line.category)))
    .map((line) => line.category);
};

/** Number of added, removed or changed items per plan section. */
export type PlanDiff = { budget: number; timeline: number; vendors: number; ideas: number };

const countChanges = <T>(
  before: readonly T[],
  after: readonly T[],
  key: (item: T) => string,
): number => {
  const pool = countBy(before.map(key));
  const matched = after.filter((item) => takeOne(pool, key(item))).length;
  return Math.max(before.length, after.length) - matched;
};

/** Counts per-section changes between two plans, comparing content rather than ids. */
export const diffPlans = (before: Plan, after: Plan): PlanDiff => ({
  budget: countChanges(before.budget, after.budget, (line) => `${line.category}:${line.amount}`),
  timeline: countChanges(before.timeline, after.timeline, (m) => `${m.title}:${m.daysBeforeEvent}`),
  vendors: countChanges(before.vendors, after.vendors, (vendor) => vendor.category),
  ideas: countChanges(before.ideas, after.ideas, (idea) => idea.title),
});
