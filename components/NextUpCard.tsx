import { useId, type ReactElement } from "react";

import {
  milestoneDate,
  milestoneUrgency,
  relativeLabel,
} from "@/components/timeline/milestoneDates";
import { IconBadge } from "@/components/ui/IconBadge";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/Icons";
import { CARD } from "@/components/ui/styles";
import { nextMilestone } from "@/lib/milestones";
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
    <div className="flex flex-col gap-1.5">
      <p className="text-base font-semibold">{milestone.title}</p>
      <p className="text-sm font-medium text-ink-muted">
        <time dateTime={date}>{formatDate(date)}</time>
        {" · "}
        {relativeLabel(milestone.daysBeforeEvent)}
      </p>
      {overdue ? (
        <p className="w-fit rounded-lg bg-danger-soft forced-colors:border px-2 py-1 text-sm font-semibold text-danger">
          Overdue: this was due {formatDate(date)}.
        </p>
      ) : null}
      <p className="text-sm leading-relaxed">{milestone.details}</p>
    </div>
  );
};

export const NextUpCard = ({ timeline, eventDate }: NextUpCardProps): ReactElement => {
  const next = nextMilestone(timeline);
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={`${CARD} flex gap-4 border-l-4 border-l-brand p-5`}
    >
      <IconBadge>{next ? <ArrowRightIcon /> : <CheckIcon />}</IconBadge>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id={headingId} className="text-xs font-semibold tracking-wider text-brand uppercase">
          Next up
        </h2>
        {next ? (
          <NextMilestone milestone={next} eventDate={eventDate} />
        ) : (
          <p className="text-sm font-medium">All milestones are complete.</p>
        )}
      </div>
    </section>
  );
};
