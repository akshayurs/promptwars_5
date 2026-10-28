import { useState, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/Icons";
import { sanitizeAmount } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { BudgetLine } from "@/lib/schema";

import { amountInputId, type AmountChange, type Currency, type RemoveControl } from "./types";

const AMOUNT_INPUT =
  "min-h-11 w-36 rounded-lg border border-control bg-surface-raised px-3 py-2 text-right tabular-nums shadow-xs transition-colors hover:border-ink-muted focus-visible:border-brand focus-visible:outline-offset-1";

type AmountInputProps = { line: BudgetLine; currency: Currency; onAmountChange: AmountChange };

// A local draft lets the field be cleared while typing without committing 0.
const AmountInput = ({ line, currency, onAmountChange }: AmountInputProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      id={amountInputId(line.id)}
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
      if (!control.disabled) control.onRemove(line.id);
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
    </th>
    <td className="py-3 pr-3 leading-relaxed text-ink-muted">{line.rationale}</td>
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
