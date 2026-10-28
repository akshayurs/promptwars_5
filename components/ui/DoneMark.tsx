import type { ReactElement } from "react";

import { CheckIcon } from "@/components/ui/Icons";

/** Decorative read-only completion marker; callers supply the state in text for assistive tech. */
export const DoneMark = ({ done }: { done: boolean }): ReactElement => (
  <span
    aria-hidden="true"
    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${done ? "border-success bg-success-soft text-success" : "border-control"}`}
  >
    {done ? <CheckIcon className="size-3" /> : null}
  </span>
);
