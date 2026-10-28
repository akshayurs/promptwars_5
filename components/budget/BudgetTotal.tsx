import { useId, useState, type ReactElement } from "react";

import { TextField } from "@/components/ui/Field";
import { sanitizeAmount } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";

import type { Currency, TotalChange } from "./types";

const isValidTotal = (amount: number): boolean =>
  Number.isFinite(amount) && amount > 0 && amount <= LIMITS.maxBudget;

type BudgetTotalProps = { totalBudget: number; currency: Currency; onTotalChange: TotalChange };

// Same draft pattern as line amounts: only valid totals are committed, blur reverts the field.
export const BudgetTotal = ({
  totalBudget,
  currency,
  onTotalChange,
}: BudgetTotalProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="w-full sm:w-56">
      <TextField
        id={`${useId()}-total`}
        label={`Total budget (${currency})`}
        type="number"
        inputMode="decimal"
        min={1}
        max={LIMITS.maxBudget}
        step={1}
        value={draft ?? String(totalBudget)}
        onChange={(event) => {
          setDraft(event.target.value);
          const raw = event.target.valueAsNumber;
          if (isValidTotal(raw)) onTotalChange(sanitizeAmount(raw, LIMITS.maxBudget));
        }}
        onBlur={() => {
          setDraft(null);
        }}
      />
    </div>
  );
};
