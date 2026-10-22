import type { ComponentPropsWithRef, MouseEvent, ReactElement } from "react";

type Variant = "primary" | "secondary" | "danger";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: Variant;
  busy?: boolean;
  busyLabel?: string;
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-surface-raised hover:bg-brand-strong",
  secondary: "border border-control bg-surface-raised text-ink hover:bg-brand-soft",
  danger: "border border-danger text-danger hover:bg-danger-soft",
};

// Busy buttons stay focusable (aria-disabled) so keyboard focus is not dropped mid-request.
export const Button = ({
  variant = "primary",
  busy = false,
  busyLabel = "Working…",
  children,
  className = "",
  type = "button",
  onClick,
  ...rest
}: ButtonProps): ReactElement => (
  <button
    type={type}
    aria-busy={busy || undefined}
    aria-disabled={busy || undefined}
    className={`${BASE} ${VARIANTS[variant]} ${className}`}
    onClick={(event: MouseEvent<HTMLButtonElement>) => {
      if (busy) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    }}
    {...rest}
  >
    {busy ? busyLabel : children}
  </button>
);
