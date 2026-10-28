"use client";

import dynamic from "next/dynamic";
import { useId, type ReactElement } from "react";

import { LazyFallback } from "@/components/ui/LazyFallback";
import { CARD_PADDED, SECTION_HEADING } from "@/components/ui/styles";
import { budgetStatus } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

import { BudgetGrid } from "./budget/BudgetGrid";
import { BudgetStatusPanel } from "./budget/BudgetStatusPanel";
import { BudgetTotal } from "./budget/BudgetTotal";
import type {
  AddLine,
  AmountChange,
  Currency,
  RemoveControl,
  RemoveLine,
  TotalChange,
} from "./budget/types";
import { useLineEditing } from "./budget/useLineEditing";

// Only the editable workspace shows the form, so the read-only summary never downloads it.
const AddLineForm = dynamic(() => import("./budget/AddLineForm").then((mod) => mod.AddLineForm), {
  loading: () => <LazyFallback label="add line form" className="h-72" />,
});

export type BudgetTableProps = {
  lines: readonly BudgetLine[];
  totalBudget: number;
  currency: Currency;
  onAmountChange?: AmountChange;
  onAddLine?: AddLine;
  onRemoveLine?: RemoveLine;
  onTotalChange?: TotalChange;
};

const MIN_REASON = `A plan needs at least ${LIMITS.budgetLines.min} budget lines.`;

// Screen-reader text for row removal: the confirmation and why removing is blocked.
const RemovalNotes = ({
  remove,
  announcement,
}: {
  remove: RemoveControl;
  announcement: string;
}): ReactElement => (
  <>
    <p role="status" className="sr-only">
      {announcement}
    </p>
    {remove.disabled ? (
      <p id={remove.reasonId} className="sr-only">
        {MIN_REASON}
      </p>
    ) : null}
  </>
);

export const BudgetTable = ({
  lines,
  totalBudget,
  currency,
  onAmountChange,
  onAddLine,
  onRemoveLine,
  onTotalChange,
}: BudgetTableProps): ReactElement => {
  const status = budgetStatus(totalBudget, lines);
  const headingId = useId();
  const { remove, addButtonRef, headingRef, handleAdd, announcement } = useLineEditing(
    lines,
    onAddLine,
    onRemoveLine,
  );
  return (
    <section aria-labelledby={headingId} className={`${CARD_PADDED} flex flex-col gap-5`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className={`${SECTION_HEADING} focus:outline-none`}
        >
          Budget allocation
        </h2>
        {onTotalChange ? (
          <BudgetTotal
            totalBudget={totalBudget}
            currency={currency}
            onTotalChange={onTotalChange}
          />
        ) : null}
      </div>
      <BudgetGrid
        lines={lines}
        totalBudget={totalBudget}
        allocated={status.allocated}
        currency={currency}
        onAmountChange={onAmountChange}
        remove={remove}
      />
      {remove ? <RemovalNotes remove={remove} announcement={announcement} /> : null}
      <BudgetStatusPanel status={status} totalBudget={totalBudget} currency={currency} />
      {onAddLine ? (
        <AddLineForm
          atMax={lines.length >= LIMITS.budgetLines.max}
          currency={currency}
          buttonRef={addButtonRef}
          onAdd={handleAdd}
        />
      ) : null}
    </section>
  );
};
