"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import type { ReactElement } from "react";

import { groupMilestonesByPhase, milestoneProgress, type Phase } from "@/lib/budget";
import { DUE_SOON_DAYS } from "@/lib/constants";
import { daysUntil, formatDate, shiftDate } from "@/lib/format";
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

export const relativeLabel = (daysBeforeEvent: number): string => {
  if (daysBeforeEvent === 0) return "On the day";
  return daysBeforeEvent === 1 ? "1 day before" : `${daysBeforeEvent} days before`;
};

export const milestoneDate = (eventDate: string, milestone: Milestone): string =>
  shiftDate(eventDate, -milestone.daysBeforeEvent);

export type Urgency = "overdue" | "due-soon" | null;

/** Urgency of an open milestone relative to today; completed milestones are never urgent. */
export const milestoneUrgency = (date: string, done: boolean): Urgency => {
  if (done) return null;
  const days = daysUntil(date);
  if (days < 0) return "overdue";
  return days <= DUE_SOON_DAYS ? "due-soon" : null;
};

const URGENCY_LABELS: Record<Exclude<Urgency, null>, string> = {
  overdue: "Overdue",
  "due-soon": "Due this week",
};

const URGENCY_CLASSES: Record<Exclude<Urgency, null>, string> = {
  overdue: "border-danger text-danger",
  "due-soon": "border-warning text-warning",
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
      <span className="inline-flex items-center gap-1 self-start rounded border border-success bg-success-soft px-1.5 text-xs font-semibold text-success">
        <span aria-hidden="true">✓</span>
        Done
      </span>
    );
  }
  if (urgency === null) return null;
  return (
    <span
      className={`inline-flex self-start rounded border px-1.5 text-xs font-semibold ${URGENCY_CLASSES[urgency]}`}
    >
      {URGENCY_LABELS[urgency]}
    </span>
  );
};

type Toggle = ((id: string) => void) | undefined;

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
      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded border border-control bg-surface data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-surface-raised"
    >
      <Checkbox.Indicator aria-hidden="true">✓</Checkbox.Indicator>
    </Checkbox.Root>
  ) : (
    <span className="mt-0.5 w-6 shrink-0 text-center">
      <span aria-hidden="true">{milestone.done ? "✓" : "○"}</span>
      <span className="sr-only">{milestone.done ? "(done)" : "(open)"}</span>
    </span>
  );

const MilestoneItem = ({ milestone, eventDate, onToggle }: ItemProps): ReactElement => {
  const date = milestoneDate(eventDate, milestone);
  const urgency = milestoneUrgency(date, milestone.done);
  return (
    <li className="flex items-start gap-3">
      <MilestoneControl milestone={milestone} onToggle={onToggle} />
      <div className="flex flex-col gap-1">
        {onToggle ? (
          <label htmlFor={`milestone-${milestone.id}`} className="font-medium">
            {milestone.title}
          </label>
        ) : (
          <p className="font-medium">{milestone.title}</p>
        )}
        <p id={`milestone-${milestone.id}-date`} className="text-sm text-ink-muted">
          <time dateTime={date}>{formatDate(date)}</time>
          {" · "}
          {relativeLabel(milestone.daysBeforeEvent)}
        </p>
        <StatusBadge urgency={urgency} done={milestone.done} />
        <p className="text-sm">{milestone.details}</p>
      </div>
    </li>
  );
};

type PhaseGroupProps = {
  phase: Phase;
  milestones: readonly Milestone[];
  eventDate: string;
  onToggle: Toggle;
};

const PhaseGroup = ({ phase, milestones, eventDate, onToggle }: PhaseGroupProps): ReactElement => (
  <div>
    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
      {PHASE_LABELS[phase]}
    </h3>
    <ol className="flex flex-col gap-3 border-l-2 border-brand-soft pl-4">
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
      <div className="flex flex-col gap-1">
        <h2 id="timeline-heading" className="text-lg font-semibold">
          Timeline to {formatDate(eventDate)}
        </h2>
        <p id="timeline-progress" role="status" className="text-sm text-ink-muted">
          {progress.done} of {progress.total} milestones done
        </p>
        <progress
          aria-labelledby="timeline-progress"
          value={progress.done}
          max={Math.max(progress.total, 1)}
          className="h-2 w-full"
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
