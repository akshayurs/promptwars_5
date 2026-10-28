import { daysBetween } from "@/lib/dates";
import { eventDetailLines, type Labeled } from "@/lib/eventTypePrompts";
import { EVENT_TYPE_REGISTRY } from "@/lib/eventTypes";
import type { Intake, Plan } from "@/lib/schema";

/**
 * The intake under the plain-language labels a planner would use, so the model can cite what the
 * planner wrote without echoing internal field names.
 */
export const describeIntake = (intake: Intake, today: string): Labeled => ({
  "Event type": EVENT_TYPE_REGISTRY[intake.eventType].label,
  "Event name": intake.eventName,
  ...eventDetailLines(intake),
  "Event date": intake.eventDate,
  Today: today,
  "Days until the event": daysBetween(today, intake.eventDate),
  "Guest count": intake.guestCount,
  "Total budget": intake.totalBudget,
  Currency: intake.currency,
  Location: intake.location,
  Vibe: intake.vibe,
  ...(intake.mustHaves.length > 0 ? { "Must-haves": intake.mustHaves } : {}),
});

const APP_STATE_KEYS: ReadonlySet<string> = new Set(["id", "done", "booked", "addedByUser"]);

const withoutAppState = (item: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(item).filter(([key]) => !APP_STATE_KEYS.has(key)));

/** The plan content the model revises, without ids and progress flags. */
export const planContent = (plan: Plan): Record<string, unknown> => ({
  summary: plan.summary,
  budget: plan.budget.map(withoutAppState),
  timeline: plan.timeline.map(withoutAppState),
  vendors: plan.vendors.map(withoutAppState),
  ideas: plan.ideas.map(withoutAppState),
});

/** Names of the items carrying the planner's progress, which a refinement must keep. */
export const progressToKeep = (plan: Plan): Record<string, string[]> => ({
  "Completed milestones": plan.timeline.filter((item) => item.done).map((item) => item.title),
  "Booked vendors": plan.vendors.filter((item) => item.booked).map((item) => item.category),
  "Budget lines added by the planner": plan.budget
    .filter((line) => line.addedByUser === true)
    .map((line) => line.category),
});
