"use client";

import Link from "next/link";
import type { ReactElement } from "react";

import { Alert } from "@/components/ui/Alert";
import { TEXT_LINK } from "@/components/ui/styles";
import { useWorkspace } from "@/components/useWorkspace";

/** Points back to the plan saved in this browser before the planner starts a new one. */
export const ExistingPlanNotice = (): ReactElement | null => {
  const { workspace } = useWorkspace();
  if (!workspace) return null;
  return (
    <Alert tone="info" title="You have a plan in progress" live={false}>
      <p>
        <Link href="/plan" className={TEXT_LINK}>
          Continue planning {workspace.intake.eventName}
        </Link>
        , or fill in the form below to start a new plan.
      </p>
    </Alert>
  );
};
