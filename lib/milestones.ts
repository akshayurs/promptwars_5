import { MILESTONE_PHASES } from "@/lib/constants";
import type { Milestone } from "@/lib/schema";
import type { Phase } from "@/lib/types";

type Scheduled = Pick<Milestone, "phase" | "daysBeforeEvent">;

const phaseRank = (phase: Phase): number => MILESTONE_PHASES.indexOf(phase);

/** Orders milestones by phase, then chronologically (most days before the event first). */
export const compareMilestones = (a: Scheduled, b: Scheduled): number =>
  phaseRank(a.phase) - phaseRank(b.phase) || b.daysBeforeEvent - a.daysBeforeEvent;

type MilestoneGroup = { phase: Phase; milestones: Milestone[] };

/** Non-empty phases in canonical order, each listing its milestones chronologically. */
export const groupMilestonesByPhase = (timeline: readonly Milestone[]): readonly MilestoneGroup[] =>
  MILESTONE_PHASES.map((phase) => ({
    phase,
    milestones: timeline
      .filter((milestone) => milestone.phase === phase)
      .toSorted(compareMilestones),
  })).filter((group) => group.milestones.length > 0);

/** Flips one milestone between open and done. */
export const toggleMilestone = (timeline: readonly Milestone[], id: string): Milestone[] =>
  timeline.map((milestone) =>
    milestone.id === id ? { ...milestone, done: !milestone.done } : milestone,
  );

export type MilestoneProgress = { done: number; total: number; ratio: number };

/** Completed milestones out of the total, with the completed share as a 0..1 ratio. */
export const milestoneProgress = (timeline: readonly Milestone[]): MilestoneProgress => {
  const done = timeline.filter((milestone) => milestone.done).length;
  return { done, total: timeline.length, ratio: timeline.length > 0 ? done / timeline.length : 0 };
};

/** The earliest-due open milestone (first in list order on ties), or null when all are done. */
export const nextMilestone = (timeline: readonly Milestone[]): Milestone | null => {
  let next: Milestone | null = null;
  for (const milestone of timeline) {
    if (milestone.done) continue;
    if (next === null || milestone.daysBeforeEvent > next.daysBeforeEvent) next = milestone;
  }
  return next;
};
