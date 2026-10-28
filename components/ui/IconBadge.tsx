import type { ReactElement, ReactNode } from "react";

type IconBadgeProps = { children: ReactNode; className?: string };

/** Decorative tinted square that frames an icon next to a heading or card title. */
export const IconBadge = ({ children, className = "size-9" }: IconBadgeProps): ReactElement => (
  <span
    aria-hidden="true"
    className={`flex shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand ${className}`}
  >
    {children}
  </span>
);
