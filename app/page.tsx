import type { Metadata } from "next";
import type { ReactElement } from "react";

import { IntakeForm } from "@/components/IntakeForm";

export const metadata: Metadata = { title: "Plan a new event" };

export default function HomePage(): ReactElement {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">Plan your event with an AI co-planner</h1>
        <p className="max-w-2xl text-ink-muted">
          Describe your wedding, birthday or community event. Gemini drafts a budget breakdown, a
          dated timeline, a vendor checklist and ideas tailored to what you told it. You can then
          edit, refine and export the plan.
        </p>
      </section>
      <IntakeForm />
    </div>
  );
}
