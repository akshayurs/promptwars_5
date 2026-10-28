import * as Checkbox from "@radix-ui/react-checkbox";
import type { ReactElement } from "react";

import {
  milestoneDate,
  milestoneUrgency,
  relativeLabel,
  type Urgency,
} from "@/components/timeline/milestoneDates";
import { DoneMark } from "@/components/ui/DoneMark";
import { CheckIcon } from "@/components/ui/Icons";
import { CARD, CHECKBOX, badgeClass } from "@/components/ui/styles";
import { formatDate } from "@/lib/format";
import type { Milestone } from "@/lib/schema";

const URGENCY_LABELS: Record<Exclude<Urgency, null>, string> = {
  overdue: "Overdue",
  "due-soon": "Due this week",
};

const URGENCY_CLASSES: Record<Exclude<Urgency, null>, string> = {
  overdue: badgeClass("danger"),
  "due-soon": badgeClass("warning"),
};

const StatusBadge = ({
  urgency,
  done,
}: {
  urgency: Urgency;
  done: boolean;
}): ReactElement | null => {
  if (done) {
    return (
      <span className={badgeClass("success")}>
        <CheckIcon className="size-3" />
        Done
      </span>
    );
  }
  if (urgency === null) return null;
  return <span className={URGENCY_CLASSES[urgency]}>{URGENCY_LABELS[urgency]}</span>;
};

const TITLE = "font-semibold";
const TITLE_DONE = "font-semibold text-ink-muted line-through decoration-1";

export type Toggle = ((id: string) => void) | undefined;

type ItemProps = { milestone: Milestone; eventDate: string; onToggle: Toggle };

const MilestoneControl = ({ milestone, onToggle }: Omit<ItemProps, "eventDate">): ReactElement =>
  onToggle ? (
    <Checkbox.Root
      id={`milestone-${milestone.id}`}
      checked={milestone.done}
      aria-describedby={`milestone-${milestone.id}-date`}
      onCheckedChange={() => {
        onToggle(milestone.id);
      }}
      className={CHECKBOX}
    >
      <Checkbox.Indicator aria-hidden="true">
        <CheckIcon />
      </Checkbox.Indicator>
    </Checkbox.Root>
  ) : (
    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
      <DoneMark done={milestone.done} />
      <span className="sr-only">{milestone.done ? "(done)" : "(open)"}</span>
    </span>
  );

export const MilestoneItem = ({ milestone, eventDate, onToggle }: ItemProps): ReactElement => {
  const date = milestoneDate(eventDate, milestone);
  const urgency = milestoneUrgency(date, milestone.done);
  const titleClass = milestone.done ? TITLE_DONE : TITLE;
  return (
    <li className={`${CARD} flex break-inside-avoid items-start gap-3 p-4`}>
      <MilestoneControl milestone={milestone} onToggle={onToggle} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {onToggle ? (
          <label htmlFor={`milestone-${milestone.id}`} className={`cursor-pointer ${titleClass}`}>
            {milestone.title}
          </label>
        ) : (
          <p className={titleClass}>{milestone.title}</p>
        )}
        <p id={`milestone-${milestone.id}-date`} className="text-sm font-medium text-ink-muted">
          <time dateTime={date}>{formatDate(date)}</time>
          {" · "}
          {relativeLabel(milestone.daysBeforeEvent)}
        </p>
        <StatusBadge urgency={urgency} done={milestone.done} />
        <p className="text-sm leading-relaxed">{milestone.details}</p>
      </div>
    </li>
  );
};
