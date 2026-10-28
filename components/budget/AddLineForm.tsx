"use client";

import { useId, type ReactElement, type RefObject } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { LIMITS } from "@/lib/constants";

import type { Currency } from "./types";
import { useAddLineDraft, type AddLineDraft, type AddLineOptions } from "./useAddLineDraft";

const MAX_REASON = `A plan can have at most ${LIMITS.budgetLines.max} budget lines.`;

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

type LineFieldsProps = Omit<AddLineDraft, "submit"> & { id: string; currency: Currency };

const LineFields = ({
  id,
  currency,
  draft,
  errors,
  update,
  categoryRef,
  amountRef,
}: LineFieldsProps): ReactElement => (
  <>
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        ref={categoryRef}
        id={`${id}-category`}
        label="Category"
        required
        maxLength={LIMITS.shortText}
        value={draft.category}
        onChange={(event) => {
          update({ category: event.target.value });
        }}
        {...(errors.category ? { error: errors.category } : {})}
      />
      <TextField
        ref={amountRef}
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
        {...(errors.amount ? { error: errors.amount } : {})}
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
  </>
);

type AddLineFormProps = AddLineOptions & { buttonRef: RefObject<HTMLButtonElement | null> };

export const AddLineForm = ({ buttonRef, ...options }: AddLineFormProps): ReactElement => {
  const id = useId();
  const { submit, ...fields } = useAddLineDraft(options);
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
      <LineFields id={id} currency={options.currency} {...fields} />
      <AddLineSubmit atMax={options.atMax} reasonId={`${id}-max`} buttonRef={buttonRef} />
    </form>
  );
};
