import { DUE_SOON_DAYS } from "@/lib/constants";
import { daysBetween, shiftDate } from "@/lib/dates";
import type { Milestone } from "@/lib/schema";

export const relativeLabel = (daysBeforeEvent: number): string => {
  if (daysBeforeEvent === 0) {
    return "On the day";
  }
  return daysBeforeEvent === 1 ? "1 day before" : `${daysBeforeEvent} days before`;
};

export const milestoneDate = (eventDate: string, milestone: Milestone): string =>
  shiftDate(eventDate, -milestone.daysBeforeEvent);

export type Urgency = "overdue" | "due-soon" | null;

/**
 * Urgency of an open milestone due on `date`, relative to `today` (the planner's local calendar
 * day); completed milestones are never urgent.
 */
export const milestoneUrgency = (date: string, done: boolean, today: string): Urgency => {
  if (done) {
    return null;
  }
  const days = daysBetween(today, date);
  if (days < 0) {
    return "overdue";
  }
  return days <= DUE_SOON_DAYS ? "due-soon" : null;
};
