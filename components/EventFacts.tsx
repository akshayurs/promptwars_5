import { useId, type ReactElement } from "react";

import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import type { EventType, Intake, StoredWorkspace } from "@/lib/schema";

const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

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
      const admission = intake.details.admission === "free" ? "Free" : "Ticketed";
      const permit = intake.details.needsPermit ? "permit required" : "no permit needed";
      return `${admission} admission · ${permit}`;
    }
  }
};

const FactList = ({ intake }: { intake: Intake }): ReactElement => {
  const countdown = countdownLabel(daysUntil(intake.eventDate));
  const facts = [
    ["Date", formatDate(intake.eventDate) + countdown],
    ["Guests", String(intake.guestCount)],
    ["Budget", formatMoney(intake.totalBudget, intake.currency)],
    ["Location", intake.location],
  ] as const;
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-4">
      {facts.map(([term, detail]) => (
        <div key={term}>
          <dt className="text-ink-muted">{term}</dt>
          <dd>{detail}</dd>
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
    <section aria-labelledby={headingId} className="flex flex-col gap-2 text-sm">
      <h2 id={headingId} className="text-base font-semibold">
        Your brief
      </h2>
      <p>{detailsSummary(intake)}</p>
      <dl className="grid gap-2 sm:grid-cols-2">
        {preferences.map(([term, detail]) => (
          <div key={term}>
            <dt className="text-ink-muted">{term}</dt>
            <dd>{detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export const EventFacts = ({ workspace }: { workspace: StoredWorkspace }): ReactElement => {
  const { intake } = workspace;
  return (
    <div className="flex flex-col gap-4">
      <p className="w-fit rounded-full border border-brand bg-brand-soft px-3 py-1 text-sm font-medium text-ink">
        {EVENT_LABELS[intake.eventType]}
      </p>
      <FactList intake={intake} />
      <Brief intake={intake} />
    </div>
  );
};
