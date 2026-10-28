import { useId, type ReactElement } from "react";

import { MilestoneItem } from "@/components/timeline/MilestoneItem";
import { EYEBROW, SECTION_HEADING } from "@/components/ui/styles";
import type { Toggle } from "@/components/workspace/types";
import { formatDate } from "@/lib/format";
import { groupMilestonesByPhase, milestoneProgress } from "@/lib/milestones";
import type { Milestone } from "@/lib/schema";
import type { Phase } from "@/lib/types";

export type TimelineProps = {
  timeline: readonly Milestone[];
  eventDate: string;
  onToggle?: Toggle;
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
  onToggle: Toggle | undefined;
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
  const id = useId();
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id={`${id}-heading`} className={SECTION_HEADING}>
          Timeline to {formatDate(eventDate)}
        </h2>
        <p id={`${id}-progress`} role="status" className="text-sm font-medium text-ink-muted">
          {progress.done} of {progress.total} milestones done
        </p>
        <progress
          aria-labelledby={`${id}-progress`}
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
