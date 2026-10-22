import type { ReactElement } from "react";

import { groupMilestonesByPhase, type Phase } from "@/lib/budget";
import { formatDate, shiftDate } from "@/lib/format";
import type { Milestone } from "@/lib/schema";

export type TimelineProps = { timeline: readonly Milestone[]; eventDate: string };

const PHASE_LABELS: Record<Phase, string> = {
  planning: "Planning",
  booking: "Booking",
  "final-prep": "Final preparations",
  "event-day": "Event day",
};

const relativeLabel = (daysBeforeEvent: number): string => {
  if (daysBeforeEvent === 0) return "On the day";
  return daysBeforeEvent === 1 ? "1 day before" : `${daysBeforeEvent} days before`;
};

export const Timeline = ({ timeline, eventDate }: TimelineProps): ReactElement => (
  <section aria-labelledby="timeline-heading" className="flex flex-col gap-6">
    <h2 id="timeline-heading" className="text-lg font-semibold">
      Timeline to {formatDate(eventDate)}
    </h2>
    {groupMilestonesByPhase(timeline).map((group) => (
      <div key={group.phase}>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {PHASE_LABELS[group.phase]}
        </h3>
        <ol className="flex flex-col gap-3 border-l-2 border-brand-soft pl-4">
          {group.milestones.map((milestone) => (
            <li key={milestone.id} className="flex flex-col gap-1">
              <p className="font-medium">{milestone.title}</p>
              <p className="text-sm text-ink-muted">
                <time dateTime={shiftDate(eventDate, -milestone.daysBeforeEvent)}>
                  {formatDate(shiftDate(eventDate, -milestone.daysBeforeEvent))}
                </time>
                {" · "}
                {relativeLabel(milestone.daysBeforeEvent)}
              </p>
              <p className="text-sm">{milestone.details}</p>
            </li>
          ))}
        </ol>
      </div>
    ))}
  </section>
);
