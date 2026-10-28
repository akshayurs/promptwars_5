"use client";

import { useId, type ReactElement } from "react";

import { CalendarIcon, MapPinIcon, UsersIcon, WalletIcon } from "@/components/ui/Icons";
import { CARD, EYEBROW, badgeClass } from "@/components/ui/styles";
import { daysUntil } from "@/lib/dates";
import { ADMISSION_LABELS, EVENT_TYPE_LABELS } from "@/lib/eventTypes";
import { formatDate, formatMoney } from "@/lib/format";
import type { Intake } from "@/lib/schema";

const countdownLabel = (days: number): string => {
  if (days < 0) return "";
  if (days === 0) return " (today)";
  return days === 1 ? " (tomorrow)" : ` (${days} days away)`;
};

const ceremonyLabel = (style: string): string =>
  /ceremony/i.test(style) ? style : `${style} ceremony`;

const detailsSummary = (intake: Intake): string => {
  switch (intake.eventType) {
    case "wedding":
      return `${intake.details.coupleNames} · ${ceremonyLabel(intake.details.ceremonyStyle)}`;
    case "birthday":
      return `${intake.details.honoreeName} turns ${intake.details.honoreeAge}`;
    case "community": {
      const admission = ADMISSION_LABELS[intake.details.admission];
      const permit = intake.details.needsPermit ? "permit required" : "no permit needed";
      return `${admission} admission · ${permit}`;
    }
  }
};

const FactList = ({ intake }: { intake: Intake }): ReactElement => {
  const countdown = countdownLabel(daysUntil(intake.eventDate));
  const facts = [
    [
      "Date",
      <>
        <time dateTime={intake.eventDate}>{formatDate(intake.eventDate)}</time>
        {countdown}
      </>,
      CalendarIcon,
    ],
    ["Guests", String(intake.guestCount), UsersIcon],
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
          <dd className="font-semibold break-words">{detail}</dd>
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
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-muted p-4 text-sm sm:p-5"
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
export const EventFacts = ({ intake }: { intake: Intake }): ReactElement => (
  <div className="flex flex-col gap-4">
    <p className={badgeClass("brand")}>{EVENT_TYPE_LABELS[intake.eventType]}</p>
    <FactList intake={intake} />
    <Brief intake={intake} />
  </div>
);
