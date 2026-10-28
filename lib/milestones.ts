import { progressOf, toggleById, type Progress } from "@/lib/collections";
import { MILESTONE_PHASES } from "@/lib/constants";
import type { Milestone } from "@/lib/schema";
import type { Phase } from "@/lib/types";

type Scheduled = Pick<Milestone, "phase" | "daysBeforeEvent">;

const phaseRank = (phase: Phase): number => MILESTONE_PHASES.indexOf(phase);

/** Orders milestones chronologically (most days before the event first), then by phase. */
const compareMilestones = (a: Scheduled, b: Scheduled): number =>
  b.daysBeforeEvent - a.daysBeforeEvent || phaseRank(a.phase) - phaseRank(b.phase);

/**
 * Sorts milestones chronologically (stable) and raises each phase to the latest phase listed
 * before it, so grouping by phase never breaks chronological order.
 */
export const orderTimeline = <T extends Scheduled>(timeline: readonly T[]): T[] => {
  let latest: Phase = MILESTONE_PHASES[0];
  return timeline.toSorted(compareMilestones).map((milestone) => {
    if (phaseRank(milestone.phase) >= phaseRank(latest)) {
      latest = milestone.phase;
      return milestone;
    }
    return { ...milestone, phase: latest };
  });
};

type MilestoneGroup = { phase: Phase; milestones: Milestone[] };

/** Non-empty phases in canonical order, each listing its milestones chronologically. */
export const groupMilestonesByPhase = (
  timeline: readonly Milestone[],
): readonly MilestoneGroup[] => {
  const ordered = orderTimeline(timeline);
  return MILESTONE_PHASES.map((phase) => ({
    phase,
    milestones: ordered.filter((milestone) => milestone.phase === phase),
  })).filter((group) => group.milestones.length > 0);
};

/** Flips one milestone between open and done; returns the same array for an unknown id. */
export const toggleMilestone = <T extends readonly Milestone[]>(
  timeline: T,
  id: string,
): T | Milestone[] => toggleById<Milestone, T>(timeline, id, "done");

/** Completed milestones out of the total. */
export const milestoneProgress = (timeline: readonly Milestone[]): Progress =>
  progressOf(timeline, (milestone) => milestone.done);

/** The earliest-due open milestone (first in list order on ties), or null when all are done. */
export const nextMilestone = (timeline: readonly Milestone[]): Milestone | null => {
  let next: Milestone | null = null;
  for (const milestone of timeline) {
    if (milestone.done) {
      continue;
    }
    if (next === null || milestone.daysBeforeEvent > next.daysBeforeEvent) {
      next = milestone;
    }
  }
  return next;
};
