"use client";

import Link from "next/link";
import type { ReactElement } from "react";

import { NextUpCard } from "@/components/NextUpCard";
import { RefinePanel } from "@/components/RefinePanel";
import { useWorkspace } from "@/components/useWorkspace";
import { EventFacts } from "@/components/EventFacts";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { PAGE_TITLE, TEXT_LINK } from "@/components/ui/styles";
import { EmptyWorkspace, LoadingNotice, useHeadingFocus } from "@/components/WorkspaceStates";
import { PlanTabs } from "@/components/workspace/PlanTabs";
import type { StoredWorkspace } from "@/lib/schema";
import type { WorkspaceAction } from "@/lib/workspace";

const LoadedWorkspace = ({
  workspace,
  dispatch,
}: {
  workspace: StoredWorkspace;
  dispatch: (action: WorkspaceAction) => void;
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
        <EventFacts workspace={workspace} />
        <Link
          href="/plan/summary"
          className={`${TEXT_LINK} flex min-h-11 w-fit items-center gap-1.5 text-sm`}
        >
          Open printable summary
          <ArrowRightIcon />
        </Link>
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
