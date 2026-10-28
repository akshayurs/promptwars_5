"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useCallback, useMemo, type ReactElement } from "react";

import { BudgetTable, type BudgetTableProps } from "@/components/BudgetTable";
import { IdeasList } from "@/components/IdeasList";
import { BulbIcon, CalendarIcon, ChecklistIcon, WalletIcon } from "@/components/ui/Icons";
import { Timeline } from "@/components/Timeline";
import { VendorChecklist } from "@/components/VendorChecklist";
import type { Dispatch } from "@/components/workspace/types";
import type { StoredWorkspace } from "@/lib/schema";

const TABS = [
  { value: "budget", label: "Budget", Icon: WalletIcon },
  { value: "timeline", label: "Timeline", Icon: CalendarIcon },
  { value: "vendors", label: "Vendors", Icon: ChecklistIcon },
  { value: "ideas", label: "Ideas", Icon: BulbIcon },
] as const;

const TRIGGER =
  "-mb-px flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 border-transparent px-2 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-control hover:text-ink sm:flex-none sm:px-4 data-[state=active]:border-brand data-[state=active]:font-semibold data-[state=active]:text-ink";

const PANEL = "rounded-lg focus-visible:outline-offset-4";

type BudgetHandlers = Required<
  Pick<BudgetTableProps, "onAmountChange" | "onAddLine" | "onRemoveLine" | "onTotalChange">
>;

// Stable handlers let memoised rows skip re-rendering on every keystroke elsewhere in the table.
const useBudgetHandlers = (dispatch: Dispatch): BudgetHandlers =>
  useMemo(
    () => ({
      onAmountChange: (id, amount) => {
        dispatch({ type: "setAmount", id, amount });
      },
      onAddLine: (line, index) => {
        dispatch({ type: "addLine", line, index });
      },
      onRemoveLine: (id) => {
        dispatch({ type: "removeLine", id });
      },
      onTotalChange: (amount) => {
        dispatch({ type: "setTotalBudget", amount });
      },
    }),
    [dispatch],
  );

export const PlanTabs = ({
  workspace,
  dispatch,
}: {
  workspace: StoredWorkspace;
  dispatch: Dispatch;
}): ReactElement => {
  const { intake, plan } = workspace;
  const budgetHandlers = useBudgetHandlers(dispatch);
  const toggleMilestone = useCallback(
    (id: string) => {
      dispatch({ type: "toggleMilestone", id });
    },
    [dispatch],
  );
  const toggleVendor = useCallback(
    (id: string) => {
      dispatch({ type: "toggleVendor", id });
    },
    [dispatch],
  );
  return (
    <Tabs.Root defaultValue="budget" className="flex flex-col gap-5">
      <Tabs.List aria-label="Plan sections" className="flex flex-wrap border-b border-line">
        {TABS.map(({ value, label, Icon }) => (
          <Tabs.Trigger key={value} value={value} className={TRIGGER}>
            <Icon className="hidden size-4 min-[400px]:block" />
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="budget" className={PANEL}>
        <BudgetTable
          lines={plan.budget}
          totalBudget={intake.totalBudget}
          currency={intake.currency}
          {...budgetHandlers}
        />
      </Tabs.Content>
      <Tabs.Content value="timeline" className={PANEL}>
        <Timeline
          timeline={plan.timeline}
          eventDate={intake.eventDate}
          onToggle={toggleMilestone}
        />
      </Tabs.Content>
      <Tabs.Content value="vendors" className={PANEL}>
        <VendorChecklist vendors={plan.vendors} onToggle={toggleVendor} />
      </Tabs.Content>
      <Tabs.Content value="ideas" className={PANEL}>
        <IdeasList ideas={plan.ideas} />
      </Tabs.Content>
    </Tabs.Root>
  );
};
