"use client";

import { useId, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/Icons";
import { LIMITS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { BudgetLine } from "@/lib/schema";

import { amountInputId, type AmountChange, type Currency, type RemoveControl } from "./types";
import { isValidLineAmount, lineAmountError, useAmountDraft } from "./useAmountDraft";

const AMOUNT_INPUT =
  "min-h-11 w-28 rounded-lg border border-control bg-surface-raised px-3 py-2 text-right tabular-nums shadow-xs transition-colors hover:border-ink-muted focus-visible:border-brand focus-visible:outline-offset-1 aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft sm:w-36";

// On phones the rationale column collapses to zero width (still read as a cell by screen readers)
// and a visual copy sits under the category, so the amount column stays on screen.
export const RATIONALE_COLUMN = "sm:pr-3 max-sm:w-0 max-sm:p-0";

type AmountInputProps = { line: BudgetLine; currency: Currency; onAmountChange: AmountChange };

const AmountInput = ({ line, currency, onAmountChange }: AmountInputProps): ReactElement => {
  const errorId = useId();
  const field = useAmountDraft(line.amount, isValidLineAmount, (amount) => {
    onAmountChange(line.id, amount);
  });
  return (
    <>
      <input
        id={amountInputId(line.id)}
        type="number"
        inputMode="decimal"
        aria-label={`${line.category} amount (${currency})`}
        aria-invalid={field.invalid || undefined}
        aria-describedby={field.invalid ? errorId : undefined}
        min={0}
        max={LIMITS.maxBudget}
        step={1}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        className={AMOUNT_INPUT}
      />
      {field.invalid ? (
        <p id={errorId} className="mt-1 ml-auto max-w-36 text-sm font-medium text-danger">
          {lineAmountError(currency)}
        </p>
      ) : null}
    </>
  );
};

const RemoveButton = ({
  line,
  control,
}: {
  line: BudgetLine;
  control: RemoveControl;
}): ReactElement => (
  <Button
    variant="danger"
    aria-label={`Remove ${line.category}`}
    aria-disabled={control.disabled || undefined}
    aria-describedby={control.disabled ? control.reasonId : undefined}
    onClick={() => {
      if (!control.disabled) control.onRemove(line);
    }}
  >
    <TrashIcon />
    <span className="max-sm:sr-only">Remove</span>
  </Button>
);

type BudgetRowProps = {
  line: BudgetLine;
  currency: Currency;
  onAmountChange: AmountChange | undefined;
  remove: RemoveControl | null;
};

export const BudgetRow = ({
  line,
  currency,
  onAmountChange,
  remove,
}: BudgetRowProps): ReactElement => (
  <tr className="border-b border-line align-middle transition-colors hover:bg-surface-muted/60">
    <th scope="row" className="py-3 pr-3 text-left font-semibold">
      {line.category}
      <span
        aria-hidden="true"
        className="mt-1 block leading-relaxed font-normal text-ink-muted sm:hidden"
      >
        {line.rationale}
      </span>
    </th>
    <td className={`py-3 leading-relaxed text-ink-muted ${RATIONALE_COLUMN}`}>
      <span className="max-sm:sr-only">{line.rationale}</span>
    </td>
    <td className="py-3 text-right tabular-nums">
      {onAmountChange ? (
        <AmountInput line={line} currency={currency} onAmountChange={onAmountChange} />
      ) : (
        formatMoney(line.amount, currency)
      )}
    </td>
    {remove ? (
      <td className="py-3 pl-2 text-right">
        <RemoveButton line={line} control={remove} />
      </td>
    ) : null}
  </tr>
);
