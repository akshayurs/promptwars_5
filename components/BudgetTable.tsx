"use client";

import { useId, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { CARD_PADDED, SECTION_HEADING } from "@/components/ui/styles";
import { budgetStatus } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";
import type { Currency } from "@/lib/types";

import { AddLineForm } from "./budget/AddLineForm";
import { BudgetGrid } from "./budget/BudgetGrid";
import { BudgetStatusPanel } from "./budget/BudgetStatusPanel";
import { BudgetTotal } from "./budget/BudgetTotal";
import type { AddLine, AmountChange, RemoveControl, RemoveLine, TotalChange } from "./budget/types";
import { useLineEditing } from "./budget/useLineEditing";

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

type RemovalNotesProps = {
  remove: RemoveControl;
  announcement: string;
  undo: { category: string; run: () => void } | null;
};

// Confirms a removal or restore, offers to undo the last removal and explains a blocked removal.
const RemovalNotes = ({ remove, announcement, undo }: RemovalNotesProps): ReactElement => (
  <>
    {/* Until there is something to show, the wrapper adds no box (and no gap) to the layout. */}
    <div className={announcement ? "flex flex-wrap items-center gap-3" : "contents"}>
      <p role="status" className={announcement ? "text-sm text-ink-muted" : "sr-only"}>
        {announcement}
      </p>
      {undo ? (
        <Button
          variant="secondary"
          aria-label={`Undo removing ${undo.category}`}
          onClick={undo.run}
        >
          Undo
        </Button>
      ) : null}
    </div>
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
  const { remove, addButtonRef, headingRef, handleAdd, registerAmount, announcement, undo } =
    useLineEditing(lines, onAddLine, onRemoveLine);
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
        registerAmount={registerAmount}
        remove={remove}
      />
      {remove ? <RemovalNotes remove={remove} announcement={announcement} undo={undo} /> : null}
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
