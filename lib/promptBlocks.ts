import { USER_ADDED_RATIONALE } from "@/lib/constants";
import { daysBetween } from "@/lib/dates";
import type { Intake, Plan } from "@/lib/schema";

type Labelled = Record<string, string | number>;

const EVENT_TYPE_LABELS: Record<Intake["eventType"], string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

const typeDetails = (intake: Intake): Labelled => {
  switch (intake.eventType) {
    case "wedding":
      return {
        Couple: intake.details.coupleNames,
        "Ceremony style": intake.details.ceremonyStyle,
      };
    case "birthday":
      return {
        "Guest of honour": intake.details.honoreeName,
        "Age they are turning": intake.details.honoreeAge,
      };
    case "community":
      return {
        Admission: intake.details.admission === "free" ? "Free entry" : "Ticketed entry",
        "Public permit needed": intake.details.needsPermit ? "Yes" : "No",
      };
  }
};

/**
 * The intake under the plain-language labels a planner would use, so the model can cite what the
 * planner wrote without echoing internal field names.
 */
export const describeIntake = (intake: Intake, today: string): Labelled => ({
  "Event type": EVENT_TYPE_LABELS[intake.eventType],
  "Event name": intake.eventName,
  ...typeDetails(intake),
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

const APP_STATE_KEYS: ReadonlySet<string> = new Set(["id", "done", "booked"]);

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
    .filter((line) => line.rationale === USER_ADDED_RATIONALE)
    .map((line) => line.category),
});
