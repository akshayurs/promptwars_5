import { daysBetween, toIsoDay } from "@/lib/dates";
import type { GeneratedPlan, Intake, Milestone, Plan, Vendor } from "@/lib/schema";

type IdFactory = () => string;

const defaultIds: IdFactory = () => crypto.randomUUID();

const withIds = <T>(items: readonly T[], nextId: IdFactory): Array<T & { id: string }> =>
  items.map((item) => ({ ...item, id: nextId() }));

export const toPlan = (generated: GeneratedPlan, nextId: IdFactory = defaultIds): Plan => ({
  summary: generated.summary,
  budget: withIds(generated.budget, nextId),
  timeline: withIds(generated.timeline, nextId).map((milestone) => ({ ...milestone, done: false })),
  vendors: withIds(generated.vendors, nextId).map((vendor) => ({ ...vendor, booked: false })),
  ideas: withIds(generated.ideas, nextId),
});

const CENTS = 100;

/** Scales budget lines down proportionally (floored to cents) when they exceed the total. */
export const fitBudgetToTotal = (generated: GeneratedPlan, totalBudget: number): GeneratedPlan => {
  const allocated = generated.budget.reduce((sum, line) => sum + line.amount, 0);
  if (allocated <= totalBudget) return generated;
  const ratio = totalBudget / allocated;
  return {
    ...generated,
    budget: generated.budget.map((line) => ({
      ...line,
      amount: Math.floor(line.amount * ratio * CENTS) / CENTS,
    })),
  };
};

/** Caps every milestone at the days remaining so none lands in the past. */
export const clampMilestones = (
  generated: GeneratedPlan,
  daysUntilEvent: number,
): GeneratedPlan => {
  const latest = Math.max(daysUntilEvent, 0);
  return {
    ...generated,
    timeline: generated.timeline.map((milestone) => ({
      ...milestone,
      daysBeforeEvent: Math.min(milestone.daysBeforeEvent, latest),
    })),
  };
};

/** Applies the server-side consistency rules (budget total, reachable milestones) to model output. */
export const fitPlanToIntake = (
  generated: GeneratedPlan,
  intake: Pick<Intake, "eventDate" | "totalBudget">,
  today: string = toIsoDay(new Date()),
): GeneratedPlan =>
  clampMilestones(
    fitBudgetToTotal(generated, intake.totalBudget),
    daysBetween(today, intake.eventDate),
  );

const normalise = (value: string): string => value.trim().toLowerCase();

const countBy = (keys: readonly string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
};

const takeOne = (pool: Map<string, number>, key: string): boolean => {
  const left = pool.get(key) ?? 0;
  if (left === 0) return false;
  pool.set(key, left - 1);
  return true;
};

const carryBookings = (previous: readonly Vendor[], next: readonly Vendor[]): Vendor[] => {
  const booked = countBy(
    previous.filter((vendor) => vendor.booked).map((vendor) => normalise(vendor.category)),
  );
  return next.map((vendor) => ({ ...vendor, booked: takeOne(booked, normalise(vendor.category)) }));
};

const carryCompletion = (
  previous: readonly Milestone[],
  next: readonly Milestone[],
): Milestone[] => {
  const done = countBy(
    previous.filter((milestone) => milestone.done).map((milestone) => normalise(milestone.title)),
  );
  return next.map((milestone) => ({
    ...milestone,
    done: takeOne(done, normalise(milestone.title)),
  }));
};

export const mergeRefinedPlan = (
  previous: Plan,
  generated: GeneratedPlan,
  nextId: IdFactory = defaultIds,
): Plan => {
  const fresh = toPlan(generated, nextId);
  return {
    ...fresh,
    vendors: carryBookings(previous.vendors, fresh.vendors),
    timeline: carryCompletion(previous.timeline, fresh.timeline),
  };
};

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

export const diffPlans = (before: Plan, after: Plan): PlanDiff => ({
  budget: countChanges(before.budget, after.budget, (line) => `${line.category}:${line.amount}`),
  timeline: countChanges(before.timeline, after.timeline, (m) => `${m.title}:${m.daysBeforeEvent}`),
  vendors: countChanges(before.vendors, after.vendors, (vendor) => vendor.category),
  ideas: countChanges(before.ideas, after.ideas, (idea) => idea.title),
});
