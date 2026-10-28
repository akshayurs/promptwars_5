import { useId, type ReactElement } from "react";

import {
  milestoneDate,
  milestoneUrgency,
  relativeLabel,
  type Urgency,
} from "@/components/timeline/milestoneDates";
import { bindToggle, CheckControl } from "@/components/ui/CheckControl";
import { CheckIcon } from "@/components/ui/Icons";
import { CARD, badgeClass } from "@/components/ui/styles";
import type { Toggle } from "@/components/workspace/types";
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

type ItemProps = { milestone: Milestone; eventDate: string; onToggle: Toggle | undefined };

export const MilestoneItem = ({ milestone, eventDate, onToggle }: ItemProps): ReactElement => {
  const date = milestoneDate(eventDate, milestone);
  const urgency = milestoneUrgency(date, milestone.done);
  const titleClass = milestone.done ? TITLE_DONE : TITLE;
  const id = useId();
  return (
    <li className={`${CARD} flex break-inside-avoid items-start gap-3 p-4`}>
      <CheckControl
        id={id}
        checked={milestone.done}
        describedBy={`${id}-date`}
        readOnlyText={milestone.done ? "(done)" : "(open)"}
        onToggle={bindToggle(onToggle, milestone.id)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {onToggle ? (
          <label htmlFor={id} className={`cursor-pointer ${titleClass}`}>
            {milestone.title}
          </label>
        ) : (
          <p className={titleClass}>{milestone.title}</p>
        )}
        <p id={`${id}-date`} className="text-sm font-medium text-ink-muted">
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
