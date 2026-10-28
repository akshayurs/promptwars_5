"use client";

import { memo, useId, type ReactElement } from "react";

import { CalendarIcon, MapPinIcon, UsersIcon, WalletIcon } from "@/components/ui/Icons";
import { CARD, EYEBROW, badgeClass } from "@/components/ui/styles";
import { daysBetween, localTodayIso, systemClock, type Clock } from "@/lib/dates";
import { detailsSummary, EVENT_TYPE_REGISTRY } from "@/lib/eventTypes";
import { formatCount, formatDate, formatMoney } from "@/lib/format";
import type { Intake } from "@/lib/schema";

const countdownLabel = (days: number): string => {
  if (days < 0) {
    return "";
  }
  if (days === 0) {
    return " (today)";
  }
  return days === 1 ? " (tomorrow)" : ` (${formatCount(days)} days away)`;
};

type EventFactsProps = {
  intake: Intake;
  /** Source of "today" for the countdown; the planner's local calendar day is used. */
  now?: Clock;
};

const FactList = ({ intake, now }: Required<EventFactsProps>): ReactElement => {
  const countdown = countdownLabel(daysBetween(localTodayIso(now), intake.eventDate));
  const facts = [
    [
      "Date",
      <>
        <time dateTime={intake.eventDate}>{formatDate(intake.eventDate)}</time>
        {countdown}
      </>,
      CalendarIcon,
    ],
    ["Guests", formatCount(intake.guestCount), UsersIcon],
    ["Budget", formatMoney(intake.totalBudget, intake.currency), WalletIcon],
    ["Location", intake.location, MapPinIcon],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {facts.map(([term, detail, Icon]) => (
        <div key={term} className={`${CARD} flex min-w-0 flex-col gap-1 p-3.5 sm:p-4`}>
          <dt className={`flex items-center gap-1.5 ${EYEBROW}`}>
            <Icon className="size-3.5 text-brand" />
            {term}
          </dt>
          <dd className="font-semibold wrap-anywhere">{detail}</dd>
        </div>
      ))}
    </dl>
  );
};

const Brief = ({ intake }: { intake: Intake }): ReactElement => {
  const headingId = useId();
  const preferences = [
    ["Vibe", intake.vibe],
    ["Must-haves", intake.mustHaves],
  ].filter(([, text]) => text !== "");
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-muted p-4 text-sm wrap-anywhere sm:p-5"
    >
      <h2 id={headingId} className={EYEBROW}>
        Your brief
      </h2>
      <p className="text-base font-medium">{detailsSummary(intake)}</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {preferences.map(([term, detail]) => (
          <div key={term} className="flex flex-col gap-0.5">
            <dt className="font-medium text-ink-muted">{term}</dt>
            <dd className="leading-relaxed">{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

/** Event type badge, key facts and the brief the planner wrote. */
export const EventFacts = memo(function EventFacts({
  intake,
  now = systemClock,
}: EventFactsProps): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <p className={badgeClass("brand")}>{EVENT_TYPE_REGISTRY[intake.eventType].label}</p>
      <FactList intake={intake} now={now} />
      <Brief intake={intake} />
    </div>
  );
});
