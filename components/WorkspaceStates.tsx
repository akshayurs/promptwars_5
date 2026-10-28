import Link from "next/link";
import { useEffect, useRef, type ReactElement, type RefObject } from "react";

import { Alert } from "@/components/ui/Alert";
import { PAGE_TITLE, TEXT_LINK } from "@/components/ui/styles";

/** Moves focus to the page heading once on mount so route changes are announced. */
export const useHeadingFocus = (): RefObject<HTMLHeadingElement | null> => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return headingRef;
};

export const EmptyWorkspace = ({ title = "Workspace" }: { title?: string }): ReactElement => (
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

const SKELETON_BLOCKS = ["h-24", "h-12", "h-64"] as const;

export const LoadingNotice = ({ title = "Workspace" }: { title?: string }): ReactElement => (
  <div className="flex flex-col gap-5">
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
