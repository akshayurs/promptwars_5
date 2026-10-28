"use client";

import { useRef, useState, type ReactElement, type RefObject } from "react";

import { describeDiff } from "@/components/refine/describeDiff";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { IconBadge } from "@/components/ui/IconBadge";
import { SparklesIcon } from "@/components/ui/Icons";
import { CARD_PADDED, SECTION_HEADING } from "@/components/ui/styles";
import { requestRefinement } from "@/lib/client";
import { LIMITS } from "@/lib/constants";
import { diffPlans } from "@/lib/plan";
import type { Plan, StoredWorkspace } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

export type RefinePanelProps = {
  workspace: StoredWorkspace;
  onApply: (plan: Plan) => void;
  onUndo: () => void;
};

type StatusMessage = { tone: "success" | "error"; text: string };

const MIN_INSTRUCTION = 3;
const STALE_MESSAGE = "The plan changed while refining. Try again.";

const currentSavedAt = (): string | undefined => workspaceStore.getSnapshot().workspace?.savedAt;

type Refinement = {
  instruction: string;
  setInstruction: (value: string) => void;
  busy: boolean;
  fieldError: string | null;
  status: StatusMessage | null;
  statusRef: RefObject<HTMLDivElement | null>;
  submit: () => Promise<void>;
  undo: () => void;
};

const useRefinement = ({ workspace, onApply, onUndo }: RefinePanelProps): Refinement => {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const submit = async (): Promise<void> => {
    if (busy) return;
    const trimmed = instruction.trim();
    if (trimmed.length < MIN_INSTRUCTION) {
      setFieldError("Describe the change you want in a few words.");
      return;
    }
    const startedAt = workspace.savedAt;
    setBusy(true);
    setFieldError(null);
    setStatus(null);
    const result = await requestRefinement({
      intake: workspace.intake,
      plan: workspace.plan,
      instruction: trimmed,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus({ tone: "error", text: result.message });
      return;
    }
    if (currentSavedAt() !== startedAt) {
      setStatus({ tone: "error", text: STALE_MESSAGE });
      return;
    }
    setStatus({ tone: "success", text: describeDiff(diffPlans(workspace.plan, result.value)) });
    setInstruction("");
    onApply(result.value);
  };

  const undo = (): void => {
    if (busy) return;
    onUndo();
    setStatus({ tone: "success", text: "Refinement undone." });
    statusRef.current?.focus();
  };

  return { instruction, setInstruction, busy, fieldError, status, statusRef, submit, undo };
};

const RefineStatus = ({
  status,
  statusRef,
}: Pick<Refinement, "status" | "statusRef">): ReactElement => (
  <div ref={statusRef} role="status" aria-live="polite" tabIndex={-1}>
    {status ? (
      <Alert tone={status.tone} live={false}>
        {status.text}
      </Alert>
    ) : null}
  </div>
);

export const RefinePanel = (props: RefinePanelProps): ReactElement => {
  const refinement = useRefinement(props);
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
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" busy={refinement.busy} busyLabel="Refining…">
            <SparklesIcon />
            Apply refinement
          </Button>
          <Button
            variant="secondary"
            onClick={refinement.undo}
            disabled={props.workspace.previousPlan === null}
            aria-disabled={refinement.busy || undefined}
          >
            Undo last refinement
          </Button>
        </div>
      </form>
      <RefineStatus status={refinement.status} statusRef={refinement.statusRef} />
    </section>
  );
};
