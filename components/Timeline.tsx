"use client";

import { useId, type ReactElement } from "react";

import { MilestoneItem } from "@/components/timeline/MilestoneItem";
import type { Toggle } from "@/components/ui/CheckControl";
import { ProgressHeader } from "@/components/ui/ProgressHeader";
import { EYEBROW } from "@/components/ui/styles";
import { localTodayIso, systemClock, type Clock } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { groupMilestonesByPhase, milestoneProgress } from "@/lib/milestones";
import type { Milestone } from "@/lib/schema";
import type { Phase } from "@/lib/types";

export type TimelineProps = {
  timeline: readonly Milestone[];
  eventDate: string;
  onToggle?: Toggle;
  /** Source of "today" for the due badges; the planner's local calendar day is used. */
  now?: Clock;
};

const PHASE_LABELS: Record<Phase, string> = {
  planning: "Planning",
  booking: "Booking",
  "final-prep": "Final preparations",
  "event-day": "Event day",
};

type PhaseGroupProps = {
  phase: Phase;
  milestones: readonly Milestone[];
  dates: { eventDate: string; today: string };
  onToggle: Toggle | undefined;
};

const PhaseGroup = ({ phase, milestones, dates, onToggle }: PhaseGroupProps): ReactElement => (
  <div className="flex flex-col gap-3">
    <h3 className={`flex items-center gap-2 ${EYEBROW}`}>
      <span aria-hidden="true" className="size-2 rounded-full bg-brand" />
      {PHASE_LABELS[phase]}
    </h3>
    <ol className="ml-[3px] flex flex-col gap-3 border-l-2 border-line pl-4 sm:pl-5">
      {milestones.map((milestone) => (
        <MilestoneItem
          key={milestone.id}
          milestone={milestone}
          eventDate={dates.eventDate}
          today={dates.today}
          onToggle={onToggle}
        />
      ))}
    </ol>
  </div>
);

export const Timeline = ({
  timeline,
  eventDate,
  onToggle,
  now = systemClock,
}: TimelineProps): ReactElement => {
  const id = useId();
  const dates = { eventDate, today: localTodayIso(now) };
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-6">
      <ProgressHeader
        id={id}
        heading={`Timeline to ${formatDate(eventDate)}`}
        progress={milestoneProgress(timeline)}
        unit="milestones done"
      />
      {groupMilestonesByPhase(timeline).map((group) => (
        <PhaseGroup
          key={group.phase}
          phase={group.phase}
          milestones={group.milestones}
          dates={dates}
          onToggle={onToggle}
        />
      ))}
    </section>
  );
};
