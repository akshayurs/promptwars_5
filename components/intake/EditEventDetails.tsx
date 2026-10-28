"use client";

import Link from "next/link";
import type { ReactElement } from "react";

import { IntakeForm } from "@/components/IntakeForm";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { CARD_PADDED, PAGE_TITLE, TEXT_LINK } from "@/components/ui/styles";
import { useWorkspace } from "@/components/useWorkspace";
import { useHeadingFocus } from "@/components/useHeadingFocus";
import { EmptyWorkspace, LoadingNotice } from "@/components/WorkspaceStates";
import type { StoredWorkspace } from "@/lib/schema";

import { editPlanFlow } from "./intakeFlows";

const TITLE = "Edit event details";

const EditForm = ({ workspace }: { workspace: StoredWorkspace }): ReactElement => {
  const headingRef = useHeadingFocus();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 ref={headingRef} tabIndex={-1} className={PAGE_TITLE}>
          {TITLE}
        </h1>
        <p className="text-lg text-pretty text-ink-muted">
          Change the details of {workspace.intake.eventName} and Gemini adapts the plan to them.
          Checked milestones and booked vendors carry over where they still apply.
        </p>
        <Link
          href="/plan"
          className={`${TEXT_LINK} flex min-h-11 w-fit items-center gap-1.5 text-sm`}
        >
          Back to the workspace
          <ArrowRightIcon />
        </Link>
      </header>
      <div className={CARD_PADDED}>
        <IntakeForm flow={editPlanFlow(workspace.plan)} initial={workspace.intake} />
      </div>
    </div>
  );
};

/** Edits the saved event details and adapts the plan to them. */
export const EditEventDetails = (): ReactElement => {
  const { workspace, status } = useWorkspace();
  if (status === "loading") return <LoadingNotice title={TITLE} />;
  if (!workspace) return <EmptyWorkspace title={TITLE} />;
  return <EditForm workspace={workspace} />;
};
