import type { BudgetLine, Intake } from "@/lib/schema";

export type Currency = Intake["currency"];
export type AmountChange = (id: string, amount: number) => void;
export type AddLine = (line: BudgetLine) => void;
export type RemoveLine = (id: string) => void;
export type TotalChange = (amount: number) => void;
export type RemoveControl = {
  onRemove: (line: BudgetLine) => void;
  disabled: boolean;
  reasonId: string;
};

export const amountInputId = (lineId: string): string => `budget-amount-${lineId}`;
