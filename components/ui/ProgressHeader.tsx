import type { ReactElement, ReactNode } from "react";

import { SECTION_HEADING } from "@/components/ui/styles";
import type { Progress } from "@/lib/collections";

type ProgressHeaderProps = {
  /** Prefix for the heading and status ids; the section uses `${id}-heading` as its label. */
  id: string;
  heading: ReactNode;
  progress: Progress;
  /** What the count measures, such as "milestones done". */
  unit: string;
};

/** Section heading with a live "n of total" status and a progress bar labelled by it. */
export const ProgressHeader = ({
  id,
  heading,
  progress,
  unit,
}: ProgressHeaderProps): ReactElement => (
  <div className="flex flex-col gap-2">
    <h2 id={`${id}-heading`} className={SECTION_HEADING}>
      {heading}
    </h2>
    <p id={`${id}-progress`} role="status" className="text-sm font-medium text-ink-muted">
      {`${String(progress.done)} of ${String(progress.total)} ${unit}`}
    </p>
    <progress
      aria-labelledby={`${id}-progress`}
      value={progress.done}
      max={Math.max(progress.total, 1)}
    />
  </div>
);
