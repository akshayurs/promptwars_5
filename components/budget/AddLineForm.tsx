import { useId, useState, type ReactElement, type RefObject, type SubmitEvent } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { sanitizeAmount } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

import type { AddLine, Currency } from "./types";

const DEFAULT_RATIONALE = "Added by you";
const MAX_REASON = `A plan can have at most ${LIMITS.budgetLines.max} budget lines.`;

type AddLineFormProps = {
  atMax: boolean;
  currency: Currency;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onAdd: AddLine;
};

type AddDraft = { category: string; amount: string; rationale: string };

const EMPTY_DRAFT: AddDraft = { category: "", amount: "0", rationale: "" };

const toBudgetLine = (draft: AddDraft): BudgetLine => ({
  id: crypto.randomUUID(),
  category: draft.category.trim(),
  amount: sanitizeAmount(Number(draft.amount), LIMITS.maxBudget),
  rationale: draft.rationale.trim() || DEFAULT_RATIONALE,
});

const useAddLineDraft = (
  atMax: boolean,
  onAdd: AddLine,
): {
  draft: AddDraft;
  error: string | undefined;
  update: (patch: Partial<AddDraft>) => void;
  submit: (event: SubmitEvent<HTMLFormElement>) => void;
} => {
  const [draft, setDraft] = useState<AddDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | undefined>(undefined);
  const update = (patch: Partial<AddDraft>): void => {
    setDraft((current) => ({ ...current, ...patch }));
  };
  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (atMax) return;
    if (draft.category.trim() === "") {
      setError("Enter a category.");
      event.currentTarget.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    setError(undefined);
    setDraft(EMPTY_DRAFT);
    onAdd(toBudgetLine(draft));
  };
  return { draft, error, update, submit };
};

type AddLineSubmitProps = {
  atMax: boolean;
  reasonId: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
};

const AddLineSubmit = ({ atMax, reasonId, buttonRef }: AddLineSubmitProps): ReactElement => (
  <>
    {atMax ? (
      <p id={reasonId} className="text-sm text-ink-muted">
        {MAX_REASON}
      </p>
    ) : null}
    <Button
      ref={buttonRef}
      type="submit"
      variant="secondary"
      className="self-start"
      aria-disabled={atMax || undefined}
      aria-describedby={atMax ? reasonId : undefined}
    >
      Add line
    </Button>
  </>
);

export const AddLineForm = ({
  atMax,
  currency,
  buttonRef,
  onAdd,
}: AddLineFormProps): ReactElement => {
  const id = useId();
  const { draft, error, update, submit } = useAddLineDraft(atMax, onAdd);
  return (
    <form
      aria-labelledby={`${id}-title`}
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-dashed border-control p-4 sm:p-5"
    >
      <h3 id={`${id}-title`} className="font-semibold">
        Add a budget line
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${id}-category`}
          label="Category"
          required
          maxLength={LIMITS.shortText}
          value={draft.category}
          onChange={(event) => {
            update({ category: event.target.value });
          }}
          {...(error ? { error } : {})}
        />
        <TextField
          id={`${id}-amount`}
          label={`Amount (${currency})`}
          type="number"
          inputMode="decimal"
          min={0}
          max={LIMITS.maxBudget}
          step={1}
          value={draft.amount}
          onChange={(event) => {
            update({ amount: event.target.value });
          }}
        />
      </div>
      <TextField
        id={`${id}-rationale`}
        label="Why it matters"
        hint="Optional"
        maxLength={LIMITS.mediumText}
        value={draft.rationale}
        onChange={(event) => {
          update({ rationale: event.target.value });
        }}
      />
      <AddLineSubmit atMax={atMax} reasonId={`${id}-max`} buttonRef={buttonRef} />
    </form>
  );
};
