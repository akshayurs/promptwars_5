"use client";

import type { ReactElement } from "react";

import { MilestoneItem, type Toggle } from "@/components/timeline/MilestoneItem";
import { EYEBROW, SECTION_HEADING } from "@/components/ui/styles";
import { groupMilestonesByPhase, milestoneProgress, type Phase } from "@/lib/budget";
import { formatDate } from "@/lib/format";
import type { Milestone } from "@/lib/schema";

export type TimelineProps = {
  timeline: readonly Milestone[];
  eventDate: string;
  onToggle?: (id: string) => void;
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
  eventDate: string;
  onToggle: Toggle;
};

const PhaseGroup = ({ phase, milestones, eventDate, onToggle }: PhaseGroupProps): ReactElement => (
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
          eventDate={eventDate}
          onToggle={onToggle}
        />
      ))}
    </ol>
  </div>
);

export const Timeline = ({ timeline, eventDate, onToggle }: TimelineProps): ReactElement => {
  const progress = milestoneProgress(timeline);
  return (
    <section aria-labelledby="timeline-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="timeline-heading" className={SECTION_HEADING}>
          Timeline to {formatDate(eventDate)}
        </h2>
        <p id="timeline-progress" role="status" className="text-sm font-medium text-ink-muted">
          {progress.done} of {progress.total} milestones done
        </p>
        <progress
          aria-labelledby="timeline-progress"
          value={progress.done}
          max={Math.max(progress.total, 1)}
        />
      </div>
      {groupMilestonesByPhase(timeline).map((group) => (
        <PhaseGroup
          key={group.phase}
          phase={group.phase}
          milestones={group.milestones}
          eventDate={eventDate}
          onToggle={onToggle}
        />
      ))}
    </section>
  );
};
