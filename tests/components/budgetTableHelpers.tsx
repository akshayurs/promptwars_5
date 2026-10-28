import { useState, type ReactElement } from "react";

import { BudgetTable } from "@/components/BudgetTable";
import { addBudgetLine, removeBudgetLine } from "@/lib/budget";
import type { BudgetLine } from "@/lib/schema";

import { makePlan } from "./fixtures";

export const budgetLines = makePlan().budget; // 200k + 150k + 50k = 400k

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const extraLines = (count: number): BudgetLine[] =>
  Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    category: `Extra ${index}`,
    amount: 1,
    rationale: "More",
  }));

export const StatefulTable = ({ initial }: { initial: readonly BudgetLine[] }): ReactElement => {
  const [current, setCurrent] = useState<readonly BudgetLine[]>(initial);
  return (
    <BudgetTable
      lines={current}
      totalBudget={500_000}
      currency="INR"
      onAmountChange={vi.fn()}
      onAddLine={(line, index) => {
        setCurrent((previous) => addBudgetLine(previous, line, index));
      }}
      onRemoveLine={(id) => {
        setCurrent((previous) => removeBudgetLine(previous, id));
      }}
    />
  );
};
