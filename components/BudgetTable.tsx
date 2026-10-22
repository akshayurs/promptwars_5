"use client";

import { useState, type ReactElement } from "react";

import { Alert } from "@/components/ui/Alert";
import { budgetStatus, sanitizeAmount, type BudgetStatus } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import { formatMoney, formatPercent } from "@/lib/format";
import type { BudgetLine, Intake } from "@/lib/schema";

type Currency = Intake["currency"];
type AmountChange = (id: string, amount: number) => void;

export type BudgetTableProps = {
  lines: readonly BudgetLine[];
  totalBudget: number;
  currency: Currency;
  onAmountChange?: AmountChange;
};

const AMOUNT_INPUT = "w-32 rounded-md border border-control bg-surface-raised px-2 py-1 text-right";

type AmountInputProps = { line: BudgetLine; currency: Currency; onAmountChange: AmountChange };

// A local draft lets the field be cleared while typing without committing 0.
const AmountInput = ({ line, currency, onAmountChange }: AmountInputProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={`${line.category} amount (${currency})`}
      min={0}
      max={LIMITS.maxBudget}
      step={1}
      value={draft ?? String(line.amount)}
      onChange={(event) => {
        setDraft(event.target.value);
        const raw = event.target.valueAsNumber;
        if (Number.isFinite(raw)) onAmountChange(line.id, sanitizeAmount(raw, LIMITS.maxBudget));
      }}
      onBlur={() => {
        setDraft(null);
      }}
      className={AMOUNT_INPUT}
    />
  );
};

const BudgetRow = ({
  line,
  currency,
  onAmountChange,
}: {
  line: BudgetLine;
  currency: Currency;
  onAmountChange?: AmountChange;
}): ReactElement => (
  <tr className="border-b border-line align-top">
    <th scope="row" className="py-2 pr-3 font-medium">
      {line.category}
    </th>
    <td className="py-2 pr-3 text-ink-muted">{line.rationale}</td>
    <td className="py-2 text-right">
      {onAmountChange ? (
        <AmountInput line={line} currency={currency} onAmountChange={onAmountChange} />
      ) : (
        formatMoney(line.amount, currency)
      )}
    </td>
  </tr>
);

const BudgetStatusPanel = ({
  status,
  totalBudget,
  currency,
}: {
  status: BudgetStatus;
  totalBudget: number;
  currency: Currency;
}): ReactElement => {
  const overage = formatMoney(Math.abs(status.remaining), currency);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span>{formatPercent(Math.min(status.ratio, 1))} of budget allocated</span>
        <progress
          value={Math.min(status.allocated, totalBudget)}
          max={totalBudget}
          className="h-2 w-full"
        />
      </label>
      <p role="status" className="sr-only">
        {status.overBudget ? `Over budget by ${overage}` : ""}
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

export const BudgetTable = ({
  lines,
  totalBudget,
  currency,
  onAmountChange,
}: BudgetTableProps): ReactElement => {
  const status = budgetStatus(totalBudget, lines);
  return (
    <section aria-labelledby="budget-heading" className="flex flex-col gap-4">
      <h2 id="budget-heading" className="text-lg font-semibold">
        Budget allocation
      </h2>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Budget allocation</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="py-2 pr-3">
              Category
            </th>
            <th scope="col" className="py-2 pr-3">
              Why it matters
            </th>
            <th scope="col" className="py-2 text-right">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <BudgetRow
              key={line.id}
              line={line}
              currency={currency}
              {...(onAmountChange ? { onAmountChange } : {})}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" colSpan={2} className="py-2 pr-3 text-left">
              Allocated of {formatMoney(totalBudget, currency)}
            </th>
            <td className="py-2 text-right">{formatMoney(status.allocated, currency)}</td>
          </tr>
        </tfoot>
      </table>
      <BudgetStatusPanel status={status} totalBudget={totalBudget} currency={currency} />
    </section>
  );
};
