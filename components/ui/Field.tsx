import type {
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type ShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
};

const CONTROL =
  "w-full rounded-md border border-control bg-surface-raised px-3 py-2 text-ink aria-[invalid=true]:border-danger";

const FieldShell = ({ id, label, hint, error, children }: ShellProps): ReactElement => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {children(describedBy, Boolean(error))}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
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
        className={`${CONTROL} min-h-24`}
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
      <select
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={CONTROL}
        {...select}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )}
  </FieldShell>
);
