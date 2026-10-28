import type { Metadata } from "next";
import type { ReactElement } from "react";

import { IntakeForm } from "@/components/IntakeForm";
import {
  BulbIcon,
  CalendarIcon,
  ChecklistIcon,
  SparklesIcon,
  WalletIcon,
} from "@/components/ui/Icons";
import { CARD_PADDED, badgeClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Plan a new event" };

const DELIVERABLES = [
  { label: "Budget breakdown", Icon: WalletIcon },
  { label: "Dated timeline", Icon: CalendarIcon },
  { label: "Vendor checklist", Icon: ChecklistIcon },
  { label: "Personalised ideas", Icon: BulbIcon },
] as const;

export default function HomePage(): ReactElement {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <section className="flex flex-col items-center gap-5 text-center">
        <p className={badgeClass("brand")}>
          <SparklesIcon className="size-3.5" />
          Weddings · Birthdays · Community events
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Plan your event with an <span className="text-brand">AI co-planner</span>
        </h1>
        <p className="max-w-2xl text-lg text-pretty text-ink-muted">
          Describe your wedding, birthday or community event. Gemini drafts a budget breakdown, a
          dated timeline, a vendor checklist and ideas tailored to what you told it. You can then
          edit, refine and export the plan.
        </p>
        <ul
          aria-label="Every plan includes"
          className="flex flex-wrap justify-center gap-2 text-sm font-medium"
        >
          {DELIVERABLES.map(({ label, Icon }) => (
            <li
              key={label}
              className="flex items-center gap-2 rounded-full border border-line bg-surface-raised px-3 py-1.5 shadow-xs"
            >
              <Icon className="size-4 text-brand" />
              {label}
            </li>
          ))}
        </ul>
      </section>
      <div className={CARD_PADDED}>
        <IntakeForm />
      </div>
    </div>
  );
}
