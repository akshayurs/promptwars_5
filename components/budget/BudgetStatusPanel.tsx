"use client";

import { useState, type ReactElement } from "react";

import { Alert } from "@/components/ui/Alert";
import type { BudgetStatus } from "@/lib/budget";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Currency } from "@/lib/types";

// Announces only crossings into or out of overspending, not every keystroke while over budget.
const useOverBudgetAnnouncement = (overBudget: boolean, overage: string): string => {
  const [last, setLast] = useState({ overBudget, message: "" });
  if (last.overBudget !== overBudget) {
    setLast({ overBudget, message: overBudget ? `Over budget by ${overage}.` : "Within budget." });
  }
  return last.message;
};

type BudgetStatusPanelProps = { status: BudgetStatus; totalBudget: number; currency: Currency };

export const BudgetStatusPanel = ({
  status,
  totalBudget,
  currency,
}: BudgetStatusPanelProps): ReactElement => {
  const overage = formatMoney(Math.abs(status.remaining), currency);
  const announcement = useOverBudgetAnnouncement(status.overBudget, overage);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        <span>{formatPercent(Math.min(status.ratio, 1))} of budget allocated</span>
        <progress value={Math.min(status.allocated, totalBudget)} max={totalBudget} />
      </label>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {status.overBudget ? (
        <Alert tone="warning" title="Over budget" live={false}>
          Allocations exceed the total by {overage}.
        </Alert>
      ) : (
        <p className="text-sm text-ink-muted">
          {formatMoney(status.remaining, currency)} still unallocated.
        </p>
      )}
    </div>
  );
};
