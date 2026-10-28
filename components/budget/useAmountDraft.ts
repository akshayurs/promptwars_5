"use client";

import { useState, type ChangeEvent } from "react";

import { sanitizeAmount } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

import type { Currency } from "./types";

/** Whether a line amount is a finite number from 0 to the supported maximum. */
export const isValidLineAmount = (amount: number): boolean =>
  Number.isFinite(amount) && amount >= 0 && amount <= LIMITS.maxBudget;

export const lineAmountError = (currency: Currency): string =>
  `Enter an amount from ${formatMoney(0, currency)} to ${formatMoney(LIMITS.maxBudget, currency)}.`;

export const totalBudgetError = (currency: Currency): string =>
  `Enter a total above ${formatMoney(0, currency)}, up to ${formatMoney(LIMITS.maxBudget, currency)}.`;

type AmountDraft = {
  value: string;
  invalid: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
};

/**
 * Local draft for a money input. Valid amounts are committed as they are typed; out-of-range ones
 * stay on screen flagged as invalid instead of being clamped or silently reverted. An emptied
 * field is not an error: it shows the committed amount again on blur.
 */
export const useAmountDraft = (
  committed: number,
  isValid: (amount: number) => boolean,
  onCommit: (amount: number) => void,
): AmountDraft => {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && draft !== "" && !isValid(Number(draft));
  return {
    value: draft ?? String(committed),
    invalid,
    onChange: (event) => {
      setDraft(event.target.value);
      const raw = event.target.valueAsNumber;
      if (isValid(raw)) onCommit(sanitizeAmount(raw, LIMITS.maxBudget));
    },
    onBlur: () => {
      if (!invalid) setDraft(null);
    },
  };
};
