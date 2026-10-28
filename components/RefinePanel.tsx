"use client";

import Link from "next/link";
import { useId, type ReactElement } from "react";

import {
  useRefinement,
  type Refinement,
  type RefinementOptions,
  type StatusMessage,
} from "@/components/refine/useRefinement";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { SparklesIcon } from "@/components/ui/Icons";
import { CARD_PADDED, SECTION_HEADING, TEXT_LINK } from "@/components/ui/styles";
import { LIMITS } from "@/lib/constants";
import { PAGE_TITLES } from "@/lib/messages";

/** The saved workspace to refine, plus callbacks that apply or undo a refined plan. */
type RefinePanelProps = RefinementOptions;

const StatusContent = ({
  status,
  progress,
}: {
  status: StatusMessage | null;
  progress: string;
}): ReactElement | null => {
  if (status) {
    return (
      <Alert tone={status.tone} live={false}>
        {status.text}
      </Alert>
    );
  }
  return progress === "" ? null : <p className="text-sm text-ink-muted">{progress}</p>;
};

const RefineActions = ({
  refinement,
  canUndo,
}: {
  refinement: Omit<Refinement, "instructionRef">;
  canUndo: boolean;
}): ReactElement => {
  const undoReasonId = useId();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" busy={refinement.request.busy} busyLabel="Refining…">
        <SparklesIcon />
        Apply refinement
      </Button>
      <Button
        variant="secondary"
        onClick={refinement.undo}
        disabled={!canUndo}
        aria-disabled={refinement.request.busy || undefined}
        aria-describedby={canUndo ? undefined : undoReasonId}
      >
        Undo last refinement
      </Button>
      {canUndo ? null : (
        <p id={undoReasonId} className="text-sm text-ink-muted">
          Nothing to undo yet.
        </p>
      )}
    </div>
  );
};

const EditDetailsHint = (): ReactElement => (
  <p className="text-sm text-ink-muted">
    To change the total budget, guest count or date, use{" "}
    <Link href="/plan/edit" className={TEXT_LINK}>
      {PAGE_TITLES.editDetails}
    </Link>
    .
  </p>
);

export const RefinePanel = (props: RefinePanelProps): ReactElement => {
  const { instructionRef, ...refinement } = useRefinement(props);
  const { request } = refinement;
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={`${CARD_PADDED} flex flex-col gap-4`}>
      <h2 id={headingId} className={`${SECTION_HEADING} flex items-center gap-2`}>
        <IconBadge className="size-8">
          <SparklesIcon />
        </IconBadge>
        Refine with AI
      </h2>
      <EditDetailsHint />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void refinement.submit();
        }}
        noValidate
        aria-busy={request.busy || undefined}
        className="flex flex-col gap-3"
      >
        <TextAreaField
          ref={instructionRef}
          id={refinement.instructionId}
          label="What should change?"
          hint="For example: cut the budget by 20%, make it eco-friendly, add a kids' corner."
          value={refinement.instruction}
          onChange={(event) => {
            refinement.setInstruction(event.target.value);
          }}
          maxLength={LIMITS.longText}
          required
          {...(refinement.fieldError ? { error: refinement.fieldError } : {})}
        />
        <RefineActions refinement={refinement} canUndo={props.workspace.previousPlan !== null} />
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <div role="status" className="min-w-0 flex-1 wrap-anywhere">
          <StatusContent status={refinement.status} progress={request.statusText} />
        </div>
        {request.busy ? (
          <Button variant="secondary" onClick={request.cancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </section>
  );
};
