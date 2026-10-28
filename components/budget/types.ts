import type { BudgetLine } from "@/lib/schema";

export type AmountChange = (id: string, amount: number) => void;
/** Adds a line; `index` inserts it at that position (used to restore a removed line). */
export type AddLine = (line: BudgetLine, index?: number) => void;
export type RemoveLine = (id: string) => void;
export type TotalChange = (amount: number) => void;
export type RemoveControl = {
  onRemove: (line: BudgetLine, index: number) => void;
  disabled: boolean;
  reasonId: string;
};
/** Ref callback factory that records a row's amount input so focus can move to it. */
export type RegisterAmount = (lineId: string) => (input: HTMLInputElement) => () => void;
