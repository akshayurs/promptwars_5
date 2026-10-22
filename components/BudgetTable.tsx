"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type SubmitEvent,
  type ReactElement,
  type RefObject,
} from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { budgetStatus, sanitizeAmount, type BudgetStatus } from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import { formatMoney, formatPercent } from "@/lib/format";
import type { BudgetLine, Intake } from "@/lib/schema";

type Currency = Intake["currency"];
type AmountChange = (id: string, amount: number) => void;
type AddLine = (line: BudgetLine) => void;
type RemoveLine = (id: string) => void;
type TotalChange = (amount: number) => void;

export type BudgetTableProps = {
  lines: readonly BudgetLine[];
  totalBudget: number;
  currency: Currency;
  onAmountChange?: AmountChange;
  onAddLine?: AddLine;
  onRemoveLine?: RemoveLine;
  onTotalChange?: TotalChange;
};

const AMOUNT_INPUT = "w-32 rounded-md border border-control bg-surface-raised px-2 py-1 text-right";
const DEFAULT_RATIONALE = "Added by you";
const MIN_REASON = `A plan needs at least ${LIMITS.budgetLines.min} budget lines.`;
const MAX_REASON = `A plan can have at most ${LIMITS.budgetLines.max} budget lines.`;

const amountInputId = (lineId: string): string => `budget-amount-${lineId}`;

const isValidTotal = (amount: number): boolean =>
  Number.isFinite(amount) && amount > 0 && amount <= LIMITS.maxBudget;

type AmountInputProps = { line: BudgetLine; currency: Currency; onAmountChange: AmountChange };

// A local draft lets the field be cleared while typing without committing 0.
const AmountInput = ({ line, currency, onAmountChange }: AmountInputProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      id={amountInputId(line.id)}
      type="number"
      inputMode="decimal"
      aria-label={`${line.category} amount (${currency})`}
      min={0}
      max={LIMITS.maxBudget}
      step={1}
      value={draft ?? String(line.amount)}
      onChange={(event) => {
        setDraft(event.target.value);
        const raw = event.target.valueAsNumber;
        if (Number.isFinite(raw)) onAmountChange(line.id, sanitizeAmount(raw, LIMITS.maxBudget));
      }}
      onBlur={() => {
        setDraft(null);
      }}
      className={AMOUNT_INPUT}
    />
  );
};

type RemoveControl = { onRemove: RemoveLine; disabled: boolean; reasonId: string };

const RemoveButton = ({
  line,
  control,
}: {
  line: BudgetLine;
  control: RemoveControl;
}): ReactElement => (
  <Button
    variant="danger"
    aria-label={`Remove ${line.category}`}
    aria-disabled={control.disabled || undefined}
    aria-describedby={control.disabled ? control.reasonId : undefined}
    onClick={() => {
      if (!control.disabled) control.onRemove(line.id);
    }}
  >
    Remove
  </Button>
);

type BudgetRowProps = {
  line: BudgetLine;
  currency: Currency;
  onAmountChange: AmountChange | undefined;
  remove: RemoveControl | null;
};

const BudgetRow = ({ line, currency, onAmountChange, remove }: BudgetRowProps): ReactElement => (
  <tr className="border-b border-line align-top">
    <th scope="row" className="py-2 pr-3 font-medium">
      {line.category}
    </th>
    <td className="py-2 pr-3 text-ink-muted">{line.rationale}</td>
    <td className="py-2 text-right">
      {onAmountChange ? (
        <AmountInput line={line} currency={currency} onAmountChange={onAmountChange} />
      ) : (
        formatMoney(line.amount, currency)
      )}
    </td>
    {remove ? (
      <td className="py-2 pl-3 text-right">
        <RemoveButton line={line} control={remove} />
      </td>
    ) : null}
  </tr>
);

type BudgetTotalProps = { totalBudget: number; currency: Currency; onTotalChange: TotalChange };

// Same draft pattern as line amounts: only valid totals are committed, blur reverts the field.
const BudgetTotal = ({ totalBudget, currency, onTotalChange }: BudgetTotalProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="max-w-xs">
      <TextField
        id={`${useId()}-total`}
        label={`Total budget (${currency})`}
        type="number"
        inputMode="decimal"
        min={1}
        max={LIMITS.maxBudget}
        step={1}
        value={draft ?? String(totalBudget)}
        onChange={(event) => {
          setDraft(event.target.value);
          const raw = event.target.valueAsNumber;
          if (isValidTotal(raw)) onTotalChange(sanitizeAmount(raw, LIMITS.maxBudget));
        }}
        onBlur={() => {
          setDraft(null);
        }}
      />
    </div>
  );
};

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

const AddLineForm = ({ atMax, currency, buttonRef, onAdd }: AddLineFormProps): ReactElement => {
  const id = useId();
  const { draft, error, update, submit } = useAddLineDraft(atMax, onAdd);
  return (
    <form
      aria-labelledby={`${id}-title`}
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-3"
    >
      <h3 id={`${id}-title`} className="text-base font-semibold">
        Add a budget line
      </h3>
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

const BudgetStatusPanel = ({
  status,
  totalBudget,
  currency,
}: {
  status: BudgetStatus;
  totalBudget: number;
  currency: Currency;
}): ReactElement => {
  const overage = formatMoney(Math.abs(status.remaining), currency);
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span>{formatPercent(Math.min(status.ratio, 1))} of budget allocated</span>
        <progress
          value={Math.min(status.allocated, totalBudget)}
          max={totalBudget}
          className="h-2 w-full"
        />
      </label>
      <p role="status" className="sr-only">
        {status.overBudget ? `Over budget by ${overage}` : ""}
      </p>
      {status.overBudget ? (
        <Alert tone="warning" title="Over budget" live={false}>
          Allocations exceed the total by {overage}.
        </Alert>
      ) : (
        <p className="text-sm text-ink-muted">
          {formatMoney(status.remaining, currency)} still unallocated.
        </p>
      )}
    </div>
  );
};

type LineEditing = {
  remove: RemoveControl | null;
  addButtonRef: RefObject<HTMLButtonElement | null>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  handleAdd: AddLine;
};

// Keeps keyboard focus on a stable control after rows are added or removed.
const useLineEditing = (
  lines: readonly BudgetLine[],
  onAddLine: AddLine | undefined,
  onRemoveLine: RemoveLine | undefined,
): LineEditing => {
  const reasonId = useId();
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingFocusId.current;
    if (id === null || !lines.some((line) => line.id === id)) return;
    pendingFocusId.current = null;
    document.getElementById(amountInputId(id))?.focus();
  }, [lines]);

  const handleRemove = (id: string): void => {
    (addButtonRef.current ?? headingRef.current)?.focus();
    onRemoveLine?.(id);
  };
  const handleAdd = (line: BudgetLine): void => {
    pendingFocusId.current = line.id;
    onAddLine?.(line);
  };
  const remove = onRemoveLine
    ? { onRemove: handleRemove, disabled: lines.length <= LIMITS.budgetLines.min, reasonId }
    : null;
  return { remove, addButtonRef, headingRef, handleAdd };
};

type BudgetGridProps = {
  lines: readonly BudgetLine[];
  totalBudget: number;
  allocated: number;
  currency: Currency;
  onAmountChange: AmountChange | undefined;
  remove: RemoveControl | null;
};

const BudgetGrid = ({
  lines,
  totalBudget,
  allocated,
  currency,
  onAmountChange,
  remove,
}: BudgetGridProps): ReactElement => (
  <table className="w-full border-collapse text-sm">
    <caption className="sr-only">Budget allocation</caption>
    <thead>
      <tr className="border-b border-line text-left">
        <th scope="col" className="py-2 pr-3">
          Category
        </th>
        <th scope="col" className="py-2 pr-3">
          Why it matters
        </th>
        <th scope="col" className="py-2 text-right">
          Amount
        </th>
        {remove ? (
          <th scope="col" className="py-2 pl-3">
            <span className="sr-only">Actions</span>
          </th>
        ) : null}
      </tr>
    </thead>
    <tbody>
      {lines.map((line) => (
        <BudgetRow
          key={line.id}
          line={line}
          currency={currency}
          onAmountChange={onAmountChange}
          remove={remove}
        />
      ))}
    </tbody>
    <tfoot>
      <tr className="font-semibold">
        <th scope="row" colSpan={2} className="py-2 pr-3 text-left">
          Allocated of {formatMoney(totalBudget, currency)}
        </th>
        <td className="py-2 text-right">{formatMoney(allocated, currency)}</td>
        {remove ? <td /> : null}
      </tr>
    </tfoot>
  </table>
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
  const { remove, addButtonRef, headingRef, handleAdd } = useLineEditing(
    lines,
    onAddLine,
    onRemoveLine,
  );
  return (
    <section aria-labelledby="budget-heading" className="flex flex-col gap-4">
      <h2 id="budget-heading" ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
        Budget allocation
      </h2>
      {onTotalChange ? (
        <BudgetTotal totalBudget={totalBudget} currency={currency} onTotalChange={onTotalChange} />
      ) : null}
      <BudgetGrid
        lines={lines}
        totalBudget={totalBudget}
        allocated={status.allocated}
        currency={currency}
        onAmountChange={onAmountChange}
        remove={remove}
      />
      {remove?.disabled ? (
        <p id={remove.reasonId} className="sr-only">
          {MIN_REASON}
        </p>
      ) : null}
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
