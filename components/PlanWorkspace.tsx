"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactElement } from "react";

import { EventFacts } from "@/components/EventFacts";
import { NextUpCard } from "@/components/NextUpCard";
import { ArrowRightIcon, PencilIcon } from "@/components/ui/Icons";
import { LazyFallback } from "@/components/ui/LazyFallback";
import { PAGE_TITLE, TEXT_LINK } from "@/components/ui/styles";
import { useHeadingFocus } from "@/components/useHeadingFocus";
import { useWorkspace } from "@/components/useWorkspace";
import { PlanTabs } from "@/components/workspace/PlanTabs";
import type { Dispatch } from "@/components/workspace/types";
import { EmptyWorkspace, LoadingNotice } from "@/components/WorkspaceStates";
import type { StoredWorkspace } from "@/lib/schema";

// Below the tabs and only needed once the plan is on screen, so it loads in its own chunk.
const RefinePanel = dynamic(
  () => import("@/components/RefinePanel").then((mod) => mod.RefinePanel),
  { loading: () => <LazyFallback label="refine panel" className="h-80" /> },
);

const HEADER_LINK = `${TEXT_LINK} flex min-h-11 w-fit items-center gap-1.5 text-sm`;

const LoadedWorkspace = ({
  workspace,
  dispatch,
}: {
  workspace: StoredWorkspace;
  dispatch: Dispatch;
}): ReactElement => {
  const headingRef = useHeadingFocus();
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 ref={headingRef} tabIndex={-1} className={PAGE_TITLE}>
          {workspace.intake.eventName}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-pretty text-ink-muted">
          {workspace.plan.summary}
        </p>
        <EventFacts intake={workspace.intake} />
        <div className="flex flex-wrap gap-x-6">
          <Link href="/plan/summary" className={HEADER_LINK}>
            Open printable summary
            <ArrowRightIcon />
          </Link>
          <Link href="/plan/edit" className={HEADER_LINK}>
            <PencilIcon />
            Edit event details
          </Link>
        </div>
      </header>
      <NextUpCard timeline={workspace.plan.timeline} eventDate={workspace.intake.eventDate} />
      <PlanTabs workspace={workspace} dispatch={dispatch} />
      <RefinePanel
        workspace={workspace}
        onApply={(next) => {
          dispatch({ type: "applyPlan", plan: next });
        }}
        onUndo={() => {
          dispatch({ type: "undo" });
        }}
      />
    </div>
  );
};

export const PlanWorkspace = (): ReactElement => {
  const { workspace, status, dispatch } = useWorkspace();
  if (status === "loading") return <LoadingNotice />;
  if (!workspace) return <EmptyWorkspace />;
  return <LoadedWorkspace workspace={workspace} dispatch={dispatch} />;
};
