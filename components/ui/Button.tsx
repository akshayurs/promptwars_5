import type { ComponentPropsWithRef, MouseEvent, ReactElement } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: Variant;
  busy?: boolean;
  busyLabel?: string;
};

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-55 aria-disabled:active:translate-y-0 forced-colors:border";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand shadow-sm hover:bg-brand-strong aria-disabled:hover:bg-brand disabled:hover:bg-brand",
  secondary:
    "border border-control bg-surface-raised text-ink shadow-xs hover:border-ink-muted hover:bg-surface-muted",
  ghost: "text-ink hover:bg-surface-muted",
  danger: "border border-danger bg-surface-raised text-danger hover:bg-danger-soft",
};

const Spinner = (): ReactElement => (
  <span
    aria-hidden="true"
    className="size-4 animate-spin rounded-full motion-reduce:animate-none border-2 border-current border-r-transparent"
  />
);

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
    {busy ? (
      <>
        <Spinner />
        {busyLabel}
      </>
    ) : (
      children
    )}
  </button>
);
