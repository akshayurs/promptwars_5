import Link from "next/link";
import type { ReactElement } from "react";

import { Alert } from "@/components/ui/Alert";
import { PAGE_TITLE, TEXT_LINK } from "@/components/ui/styles";
import { PAGE_TITLES } from "@/lib/messages";

export const EmptyWorkspace = ({
  title = PAGE_TITLES.workspace,
}: {
  title?: string;
}): ReactElement => (
  <div className="mx-auto flex max-w-xl flex-col gap-5">
    <h1 className={PAGE_TITLE}>{title}</h1>
    <Alert tone="info" title="No plan yet">
      <p>
        Start from the{" "}
        <Link href="/" className={TEXT_LINK}>
          intake form
        </Link>{" "}
        to generate a plan.
      </p>
    </Alert>
  </div>
);

// Shaped like the loaded page (summary, facts, next-up card, tabs, first panel); together with
// the viewport-high minimum it keeps the footer below the fold, so nothing visible shifts.
const SKELETON_BLOCKS = ["h-20", "h-48 sm:h-28", "h-36", "h-40", "h-11", "h-[36rem]"] as const;

export const LoadingNotice = ({
  title = PAGE_TITLES.workspace,
}: {
  title?: string;
}): ReactElement => (
  <div className="flex min-h-svh flex-col gap-5">
    <h1 className={PAGE_TITLE}>{title}</h1>
    <p role="status" className="text-ink-muted">
      Loading your plan…
    </p>
    <div aria-hidden="true" className="flex flex-col gap-4">
      {SKELETON_BLOCKS.map((height) => (
        <div
          key={height}
          className={`${height} animate-pulse rounded-2xl motion-reduce:animate-none bg-surface-muted`}
        />
      ))}
    </div>
  </div>
);
