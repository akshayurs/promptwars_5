"use client";

import type { ReactElement } from "react";

import { milestoneDate, milestoneUrgency, relativeLabel } from "@/components/Timeline";
import { nextMilestone } from "@/lib/budget";
import { formatDate } from "@/lib/format";
import type { Milestone } from "@/lib/schema";

export type NextUpCardProps = { timeline: readonly Milestone[]; eventDate: string };

const NextMilestone = ({
  milestone,
  eventDate,
}: {
  milestone: Milestone;
  eventDate: string;
}): ReactElement => {
  const date = milestoneDate(eventDate, milestone);
  const overdue = milestoneUrgency(date, milestone.done) === "overdue";
  return (
    <div className="flex flex-col gap-1">
      <p className="font-medium">{milestone.title}</p>
      <p className="text-sm text-ink-muted">
        <time dateTime={date}>{formatDate(date)}</time>
        {" · "}
        {relativeLabel(milestone.daysBeforeEvent)}
      </p>
      {overdue ? (
        <p className="text-sm font-semibold text-danger">
          Overdue: this was due {formatDate(date)}.
        </p>
      ) : null}
      <p className="text-sm">{milestone.details}</p>
    </div>
  );
};

export const NextUpCard = ({ timeline, eventDate }: NextUpCardProps): ReactElement => {
  const next = nextMilestone(timeline);
  return (
    <section
      aria-labelledby="next-up-heading"
      className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-4"
    >
      <h2 id="next-up-heading" className="text-lg font-semibold">
        Next up
      </h2>
      {next ? (
        <NextMilestone milestone={next} eventDate={eventDate} />
      ) : (
        <p className="text-sm">All milestones are complete.</p>
      )}
    </section>
  );
};
