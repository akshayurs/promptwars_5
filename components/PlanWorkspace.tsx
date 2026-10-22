"use client";

import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { useEffect, useRef, type ReactElement, type RefObject } from "react";

import { BudgetTable } from "@/components/BudgetTable";
import { IdeasList } from "@/components/IdeasList";
import { RefinePanel } from "@/components/RefinePanel";
import { Timeline } from "@/components/Timeline";
import { useWorkspace } from "@/components/useWorkspace";
import { VendorChecklist } from "@/components/VendorChecklist";
import { Alert } from "@/components/ui/Alert";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import type { StoredWorkspace } from "@/lib/schema";
import type { WorkspaceAction } from "@/lib/workspace";

const TABS = [
  { value: "budget", label: "Budget" },
  { value: "timeline", label: "Timeline" },
  { value: "vendors", label: "Vendors" },
  { value: "ideas", label: "Ideas" },
] as const;

const TRIGGER =
  "min-h-11 rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-soft data-[state=active]:bg-brand data-[state=active]:text-surface-raised data-[state=active]:hover:bg-brand";

const countdownLabel = (days: number): string => {
  if (days < 0) return "";
  if (days === 0) return " (today)";
  return days === 1 ? " (tomorrow)" : ` (${days} days away)`;
};

/** Moves focus to the page heading once on mount so route changes are announced. */
export const useHeadingFocus = (): RefObject<HTMLHeadingElement | null> => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return headingRef;
};

export const EventFacts = ({ workspace }: { workspace: StoredWorkspace }): ReactElement => {
  const { intake } = workspace;
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

export const EmptyWorkspace = ({ title = "Workspace" }: { title?: string }): ReactElement => (
  <div className="flex flex-col gap-4">
    <h1 className="text-3xl font-semibold">{title}</h1>
    <Alert tone="info" title="No plan yet">
      <p>
        Start from the{" "}
        <Link href="/" className="underline">
          intake form
        </Link>{" "}
        to generate a plan.
      </p>
    </Alert>
  </div>
);

export const LoadingNotice = ({ title = "Workspace" }: { title?: string }): ReactElement => (
  <div className="flex flex-col gap-4">
    <h1 className="text-3xl font-semibold">{title}</h1>
    <p role="status" className="text-ink-muted">
      Loading your plan…
    </p>
  </div>
);

const PlanTabs = ({
  workspace,
  dispatch,
}: {
  workspace: StoredWorkspace;
  dispatch: (action: WorkspaceAction) => void;
}): ReactElement => {
  const { intake, plan } = workspace;
  return (
    <Tabs.Root defaultValue="budget" className="flex flex-col gap-6">
      <Tabs.List
        aria-label="Plan sections"
        className="flex flex-wrap gap-2 border-b border-line pb-2"
      >
        {TABS.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value} className={TRIGGER}>
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="budget">
        <BudgetTable
          lines={plan.budget}
          totalBudget={intake.totalBudget}
          currency={intake.currency}
          onAmountChange={(id, amount) => {
            dispatch({ type: "setAmount", id, amount });
          }}
        />
      </Tabs.Content>
      <Tabs.Content value="timeline">
        <Timeline timeline={plan.timeline} eventDate={intake.eventDate} />
      </Tabs.Content>
      <Tabs.Content value="vendors">
        <VendorChecklist
          vendors={plan.vendors}
          onToggle={(id) => {
            dispatch({ type: "toggleVendor", id });
          }}
        />
      </Tabs.Content>
      <Tabs.Content value="ideas">
        <IdeasList ideas={plan.ideas} />
      </Tabs.Content>
    </Tabs.Root>
  );
};

const LoadedWorkspace = ({
  workspace,
  dispatch,
}: {
  workspace: StoredWorkspace;
  dispatch: (action: WorkspaceAction) => void;
}): ReactElement => {
  const headingRef = useHeadingFocus();
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold">
          {workspace.intake.eventName}
        </h1>
        <p className="text-ink-muted">{workspace.plan.summary}</p>
        <EventFacts workspace={workspace} />
        <Link href="/plan/summary" className="text-sm text-brand underline">
          Open printable summary
        </Link>
      </header>
      <PlanTabs workspace={workspace} dispatch={dispatch} />
      <RefinePanel
        workspace={workspace}
        onApply={(next) => {
          dispatch({ type: "applyPlan", plan: next });
        }}
        onUndo={() => {
          dispatch({ type: "undo" });
        }}
      />
    </div>
  );
};

export const PlanWorkspace = (): ReactElement => {
  const { workspace, status, dispatch } = useWorkspace();
  if (status === "loading") return <LoadingNotice />;
  if (!workspace) return <EmptyWorkspace />;
  return <LoadedWorkspace workspace={workspace} dispatch={dispatch} />;
};
