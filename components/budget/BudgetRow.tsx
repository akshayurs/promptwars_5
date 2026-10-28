"use client";

import { memo, useId, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/Icons";
import { isValidLineAmount } from "@/lib/budget";
import { LIMITS, MONEY_STEP } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { BudgetLine } from "@/lib/schema";
import type { Currency } from "@/lib/types";

import type { AmountChange, RegisterAmount, RemoveControl } from "./types";
import { lineAmountError, useAmountDraft } from "./useAmountDraft";

const AMOUNT_INPUT =
  "min-h-11 w-28 rounded-lg border border-control bg-surface-raised px-3 py-2 text-right tabular-nums shadow-xs transition-colors hover:border-ink-muted focus-visible:border-brand focus-visible:outline-offset-1 aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft sm:w-36";

// On phones the rationale column collapses to zero width (still read as a cell by screen readers)
// and a visual copy sits under the category, so the amount column stays on screen.
export const RATIONALE_COLUMN = "sm:pr-3 max-sm:w-0 max-sm:p-0";

type AmountInputProps = {
  line: BudgetLine;
  currency: Currency;
  edit: { onAmountChange: AmountChange; registerAmount: RegisterAmount };
};

const AmountInput = ({ line, currency, edit }: AmountInputProps): ReactElement => {
  const errorId = useId();
  const field = useAmountDraft(line.amount, isValidLineAmount, (amount) => {
    edit.onAmountChange(line.id, amount);
  });
  return (
    <>
      <input
        ref={edit.registerAmount(line.id)}
        type="number"
        inputMode="decimal"
        aria-label={`${line.category} amount (${currency})`}
        aria-invalid={field.invalid || undefined}
        aria-describedby={field.invalid ? errorId : undefined}
        min={0}
        max={LIMITS.maxBudget}
        step={MONEY_STEP}
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

type RemoveButtonProps = { line: BudgetLine; index: number; control: RemoveControl };

const RemoveButton = ({ line, index, control }: RemoveButtonProps): ReactElement => (
  <Button
    variant="danger"
    aria-label={`Remove ${line.category}`}
    aria-disabled={control.disabled || undefined}
    aria-describedby={control.disabled ? control.reasonId : undefined}
    onClick={() => {
      if (!control.disabled) {
        control.onRemove(line, index);
      }
    }}
  >
    <TrashIcon />
    <span className="max-sm:sr-only">Remove</span>
  </Button>
);

type BudgetRowProps = {
  line: BudgetLine;
  index: number;
  currency: Currency;
  onAmountChange: AmountChange | undefined;
  registerAmount: RegisterAmount;
  remove: RemoveControl | null;
};

// Memoised so a keystroke in one row re-renders only that row, not the whole table.
export const BudgetRow = memo(function BudgetRow({
  line,
  index,
  currency,
  onAmountChange,
  registerAmount,
  remove,
}: BudgetRowProps): ReactElement {
  return (
    <tr className="border-b border-line align-middle wrap-anywhere transition-colors hover:bg-surface-muted/60">
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
          <AmountInput line={line} currency={currency} edit={{ onAmountChange, registerAmount }} />
        ) : (
          formatMoney(line.amount, currency)
        )}
      </td>
      {remove ? (
        <td className="py-3 pl-2 text-right">
          <RemoveButton line={line} index={index} control={remove} />
        </td>
      ) : null}
    </tr>
  );
});
