import type { ReactElement } from "react";

type LazyFallbackProps = { label: string; className: string };

/** Placeholder that reserves space while a lazily loaded section downloads. */
export const LazyFallback = ({ label, className }: LazyFallbackProps): ReactElement => (
  <div
    aria-busy="true"
    className={`animate-pulse rounded-2xl bg-surface-muted motion-reduce:animate-none ${className}`}
  >
    <span className="sr-only">Loading {label}…</span>
  </div>
);
