"use client";

import { useId, type ReactElement } from "react";

import { TextField } from "@/components/ui/Field";
import { isValidTotal } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";

import type { Currency, TotalChange } from "./types";
import { totalBudgetError, useAmountDraft } from "./useAmountDraft";

type BudgetTotalProps = { totalBudget: number; currency: Currency; onTotalChange: TotalChange };

export const BudgetTotal = ({
  totalBudget,
  currency,
  onTotalChange,
}: BudgetTotalProps): ReactElement => {
  const id = useId();
  const field = useAmountDraft(totalBudget, isValidTotal, onTotalChange);
  return (
    <div className="w-full sm:w-56">
      <TextField
        id={`${id}-total`}
        label={`Total budget (${currency})`}
        type="number"
        inputMode="decimal"
        min={0}
        max={LIMITS.maxBudget}
        step={1}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        {...(field.invalid ? { error: totalBudgetError(currency) } : {})}
      />
    </div>
  );
};
