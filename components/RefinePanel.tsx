"use client";

import type { ReactElement } from "react";

import {
  useRefinement,
  type RefinePanelProps,
  type Refinement,
  type StatusMessage,
} from "@/components/refine/useRefinement";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { SparklesIcon } from "@/components/ui/Icons";
import { CARD_PADDED, SECTION_HEADING } from "@/components/ui/styles";
import { useLongWait } from "@/components/useLongWait";
import { LIMITS } from "@/lib/constants";

const PENDING_TEXT = "Asking Gemini to apply your change.";
const LONG_WAIT_TEXT = "Still refining your plan. This usually takes about half a minute.";
const UNDO_REASON_ID = "refine-undo-reason";

const StatusContent = ({
  status,
  pending,
}: {
  status: StatusMessage | null;
  pending: string | null;
}): ReactElement | null => {
  if (status) {
    return (
      <Alert tone={status.tone} live={false}>
        {status.text}
      </Alert>
    );
  }
  return pending === null ? null : <p className="text-sm text-ink-muted">{pending}</p>;
};

const pendingText = (busy: boolean, longWait: boolean): string | null => {
  if (!busy) return null;
  return longWait ? LONG_WAIT_TEXT : PENDING_TEXT;
};

const RefineActions = ({
  refinement,
  canUndo,
}: {
  refinement: Omit<Refinement, "statusRef">;
  canUndo: boolean;
}): ReactElement => (
  <div className="flex flex-wrap items-center gap-3">
    <Button type="submit" busy={refinement.busy} busyLabel="Refining…">
      <SparklesIcon />
      Apply refinement
    </Button>
    <Button
      variant="secondary"
      onClick={refinement.undo}
      disabled={!canUndo}
      aria-disabled={refinement.busy || undefined}
      aria-describedby={canUndo ? undefined : UNDO_REASON_ID}
    >
      Undo last refinement
    </Button>
    {canUndo ? null : (
      <p id={UNDO_REASON_ID} className="text-sm text-ink-muted">
        Nothing to undo yet.
      </p>
    )}
  </div>
);

export const RefinePanel = (props: RefinePanelProps): ReactElement => {
  const { statusRef, ...refinement } = useRefinement(props);
  const longWait = useLongWait(refinement.busy);
  return (
    <section aria-labelledby="refine-heading" className={`${CARD_PADDED} flex flex-col gap-4`}>
      <h2 id="refine-heading" className={`${SECTION_HEADING} flex items-center gap-2`}>
        <IconBadge className="size-8">
          <SparklesIcon />
        </IconBadge>
        Refine with AI
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void refinement.submit();
        }}
        noValidate
        aria-busy={refinement.busy || undefined}
        className="flex flex-col gap-3"
      >
        <TextAreaField
          id="refine-instruction"
          label="What should change?"
          hint="For example: cut the budget by 20%, make it eco-friendly, add a kids' corner."
          value={refinement.instruction}
          onChange={(event) => {
            refinement.setInstruction(event.target.value);
          }}
          maxLength={LIMITS.longText}
          {...(refinement.fieldError ? { error: refinement.fieldError } : {})}
        />
        <RefineActions refinement={refinement} canUndo={props.workspace.previousPlan !== null} />
      </form>
      <div ref={statusRef} role="status" aria-live="polite" tabIndex={-1}>
        <StatusContent
          status={refinement.status}
          pending={pendingText(refinement.busy, longWait)}
        />
      </div>
    </section>
  );
};
