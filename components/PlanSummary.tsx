"use client";

import { useRouter } from "next/navigation";
import type { ReactElement } from "react";

import { BudgetTable } from "@/components/BudgetTable";
import { EventFacts } from "@/components/EventFacts";
import { IdeasList } from "@/components/IdeasList";
import { SummaryActions } from "@/components/summary/SummaryActions";
import { usePrintExpandedDetails } from "@/components/summary/usePrintExpandedDetails";
import { Timeline } from "@/components/Timeline";
import { PAGE_TITLE } from "@/components/ui/styles";
import { useHeadingFocus } from "@/components/useHeadingFocus";
import { useWorkspace } from "@/components/useWorkspace";
import { VendorChecklist } from "@/components/VendorChecklist";
import { EmptyWorkspace, LoadingNotice } from "@/components/WorkspaceStates";
import type { StoredWorkspace } from "@/lib/schema";

const LoadedSummary = ({
  workspace,
  onReset,
}: {
  workspace: StoredWorkspace;
  onReset: () => void;
}): ReactElement => {
  const headingRef = useHeadingFocus();
  usePrintExpandedDetails();
  const { intake, plan } = workspace;
  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 ref={headingRef} tabIndex={-1} className={PAGE_TITLE}>
          {intake.eventName}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-pretty">{plan.summary}</p>
        <EventFacts intake={workspace.intake} />
        <SummaryActions workspace={workspace} onReset={onReset} />
      </header>
      <BudgetTable
        lines={plan.budget}
        totalBudget={intake.totalBudget}
        currency={intake.currency}
      />
      <Timeline timeline={plan.timeline} eventDate={intake.eventDate} />
      <VendorChecklist vendors={plan.vendors} />
      <IdeasList ideas={plan.ideas} />
    </article>
  );
};

export const PlanSummary = (): ReactElement => {
  const router = useRouter();
  const { workspace, status, dispatch } = useWorkspace();
  if (status === "loading") return <LoadingNotice title="Summary" />;
  if (!workspace) return <EmptyWorkspace title="Summary" />;
  return (
    <LoadedSummary
      workspace={workspace}
      onReset={() => {
        dispatch({ type: "replace", workspace: null });
        router.push("/");
      }}
    />
  );
};
