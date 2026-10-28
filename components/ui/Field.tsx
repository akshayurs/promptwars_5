import type {
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { ChevronDownIcon } from "@/components/ui/Icons";

type ShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
};

const CONTROL =
  "min-h-11 w-full rounded-lg border border-control bg-surface-raised px-3 py-2 text-base text-ink shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-ink-muted hover:border-ink-muted focus-visible:border-brand focus-visible:outline-offset-1 aria-[invalid=true]:border-danger aria-[invalid=true]:bg-danger-soft sm:text-sm";

const FieldShell = ({ id, label, hint, error, children }: ShellProps): ReactElement => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {children(describedBy, Boolean(error))}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
};

type Meta = Omit<ShellProps, "children">;

export const TextField = ({
  id,
  label,
  hint,
  error,
  ...input
}: Meta & InputHTMLAttributes<HTMLInputElement>): ReactElement => (
  <FieldShell id={id} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}>
    {(describedBy, invalid) => (
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={CONTROL}
        {...input}
      />
    )}
  </FieldShell>
);

export const TextAreaField = ({
  id,
  label,
  hint,
  error,
  ...textarea
}: Meta & TextareaHTMLAttributes<HTMLTextAreaElement>): ReactElement => (
  <FieldShell id={id} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}>
    {(describedBy, invalid) => (
      <textarea
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={`${CONTROL} min-h-28 resize-y leading-relaxed`}
        {...textarea}
      />
    )}
  </FieldShell>
);

export const SelectField = ({
  id,
  label,
  hint,
  error,
  options,
  ...select
}: Meta &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: ReadonlyArray<{ value: string; label: string }>;
  }): ReactElement => (
  <FieldShell id={id} label={label} {...(hint ? { hint } : {})} {...(error ? { error } : {})}>
    {(describedBy, invalid) => (
      <div className="relative">
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={`${CONTROL} cursor-pointer appearance-none pr-10`}
          {...select}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" />
      </div>
    )}
  </FieldShell>
);
