import type { ReactElement } from "react";

import { EYEBROW } from "@/components/ui/styles";
import { formatMoney } from "@/lib/format";
import type { BudgetLine } from "@/lib/schema";
import type { Currency } from "@/lib/types";

import { BudgetRow, RATIONALE_COLUMN } from "./BudgetRow";
import type { AmountChange, RegisterAmount, RemoveControl } from "./types";

type BudgetGridProps = {
  lines: readonly BudgetLine[];
  totalBudget: number;
  allocated: number;
  currency: Currency;
  onAmountChange: AmountChange | undefined;
  registerAmount: RegisterAmount;
  remove: RemoveControl | null;
};

export const BudgetGrid = ({
  lines,
  totalBudget,
  allocated,
  currency,
  onAmountChange,
  registerAmount,
  remove,
}: BudgetGridProps): ReactElement => (
  <div className="relative -mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">Budget allocation</caption>
      <thead>
        <tr className={`border-b border-line text-left ${EYEBROW}`}>
          <th scope="col" className="py-2.5 pr-3 font-semibold">
            Category
          </th>
          <th scope="col" className={`py-2.5 font-semibold ${RATIONALE_COLUMN}`}>
            <span className="max-sm:sr-only">Why it matters</span>
          </th>
          <th scope="col" className="py-2.5 text-right font-semibold">
            Amount
          </th>
          {remove ? (
            <th scope="col" className="py-2.5 pl-3">
              <span className="sr-only">Actions</span>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <BudgetRow
            key={line.id}
            line={line}
            index={index}
            currency={currency}
            onAmountChange={onAmountChange}
            registerAmount={registerAmount}
            remove={remove}
          />
        ))}
      </tbody>
      <tfoot>
        <tr className="font-semibold">
          <th scope="row" colSpan={2} className="pt-3 pr-3 text-left">
            Allocated of {formatMoney(totalBudget, currency)}
          </th>
          <td className="pt-3 text-right tabular-nums">{formatMoney(allocated, currency)}</td>
          {remove ? <td /> : null}
        </tr>
      </tfoot>
    </table>
  </div>
);
