"use client";

import { useRef, useState, type RefObject, type SubmitEvent } from "react";

import { sanitizeAmount } from "@/lib/budget";
import { LIMITS, USER_ADDED_RATIONALE } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

import type { AddLine, Currency } from "./types";
import { isValidLineAmount, lineAmountError } from "./useAmountDraft";

type IdFactory = () => string;

const randomId: IdFactory = () => crypto.randomUUID();

export type AddLineOptions = {
  atMax: boolean;
  currency: Currency;
  onAdd: AddLine;
  /** Source of ids for new lines; injectable so tests stay deterministic. */
  createId?: IdFactory;
};

type AddDraft = { category: string; amount: string; rationale: string };
type DraftErrors = Partial<Record<"category" | "amount", string>>;

const EMPTY_DRAFT: AddDraft = { category: "", amount: "0", rationale: "" };

const validate = (draft: AddDraft, currency: Currency): DraftErrors => ({
  ...(draft.category.trim() === "" ? { category: "Enter a category." } : {}),
  ...(isValidLineAmount(Number(draft.amount)) ? {} : { amount: lineAmountError(currency) }),
});

const toBudgetLine = (draft: AddDraft, createId: IdFactory): BudgetLine => ({
  id: createId(),
  category: draft.category.trim(),
  amount: sanitizeAmount(Number(draft.amount), LIMITS.maxBudget),
  rationale: draft.rationale.trim() || USER_ADDED_RATIONALE,
});

export type AddLineDraft = {
  draft: AddDraft;
  errors: DraftErrors;
  categoryRef: RefObject<HTMLInputElement | null>;
  amountRef: RefObject<HTMLInputElement | null>;
  update: (patch: Partial<AddDraft>) => void;
  submit: (event: SubmitEvent<HTMLFormElement>) => void;
};

/** Draft state and validation for a new budget line; focuses the first invalid field. */
export const useAddLineDraft = ({
  atMax,
  currency,
  onAdd,
  createId = randomId,
}: AddLineOptions): AddLineDraft => {
  const [draft, setDraft] = useState<AddDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const categoryRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<AddDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }));
  };
  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (atMax) return;
    const found = validate(draft, currency);
    setErrors(found);
    if (found.category !== undefined) {
      categoryRef.current?.focus();
      return;
    }
    if (found.amount !== undefined) {
      amountRef.current?.focus();
      return;
    }
    setDraft(EMPTY_DRAFT);
    onAdd(toBudgetLine(draft, createId));
  };
  return { draft, errors, categoryRef, amountRef, update, submit };
};
