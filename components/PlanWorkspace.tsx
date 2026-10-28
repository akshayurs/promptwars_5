"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ReactElement } from "react";

import { EventFacts } from "@/components/EventFacts";
import { NextUpCard } from "@/components/NextUpCard";
import { Alert } from "@/components/ui/Alert";
import { ArrowRightIcon, PencilIcon } from "@/components/ui/Icons";
import { LazyFallback } from "@/components/ui/LazyFallback";
import { PAGE_TITLE, TEXT_LINK } from "@/components/ui/styles";
import { useHeadingFocus } from "@/components/useHeadingFocus";
import { useWorkspace } from "@/components/useWorkspace";
import { PlanTabs } from "@/components/workspace/PlanTabs";
import type { Dispatch } from "@/components/workspace/types";
import { EmptyWorkspace, LoadingNotice } from "@/components/WorkspaceStates";
import { PAGE_TITLES } from "@/lib/messages";
import type { StoredWorkspace } from "@/lib/schema";

// Below the tabs and only needed once the plan is on screen, so it loads in its own chunk. The
// placeholder matches the panel's rendered height so nothing below it shifts when it arrives.
const RefinePanel = dynamic(
  () => import("@/components/RefinePanel").then((mod) => mod.RefinePanel),
  { loading: () => <LazyFallback label="refine panel" className="h-[32rem] sm:h-96" /> },
);

const HEADER_LINK = `${TEXT_LINK} flex min-h-11 w-fit items-center gap-1.5 text-sm`;

const SaveFailedAlert = (): ReactElement => (
  <Alert tone="error" title="Changes could not be saved in this browser">
    <p>
      Storage is full or blocked, so your latest changes will be lost when you leave or reload this
      page. To keep a copy, open the{" "}
      <Link href="/plan/summary" className={TEXT_LINK}>
        printable summary
      </Link>{" "}
      and choose Export JSON.
    </p>
  </Alert>
);

type LoadedWorkspaceProps = { workspace: StoredWorkspace; saveFailed: boolean; dispatch: Dispatch };

const LoadedWorkspace = ({
  workspace,
  saveFailed,
  dispatch,
}: LoadedWorkspaceProps): ReactElement => {
  const headingRef = useHeadingFocus();
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <h1 ref={headingRef} tabIndex={-1} className={PAGE_TITLE}>
          {workspace.intake.eventName}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-pretty wrap-anywhere text-ink-muted">
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
            {PAGE_TITLES.editDetails}
          </Link>
        </div>
      </header>
      {saveFailed ? <SaveFailedAlert /> : null}
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
  const { workspace, status, saveFailed, dispatch } = useWorkspace();
  if (status === "loading") {
    return <LoadingNotice />;
  }
  if (!workspace) {
    return <EmptyWorkspace />;
  }
  return <LoadedWorkspace workspace={workspace} saveFailed={saveFailed} dispatch={dispatch} />;
};
