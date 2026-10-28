"use client";

import { useId, type ReactElement, type RefObject } from "react";

import { Button } from "@/components/ui/Button";
import { SparklesIcon } from "@/components/ui/Icons";

import type { IntakeFlow } from "./intakeFlows";
import { ReplaceConfirm } from "./ReplaceConfirm";

const PRIVACY_NOTICE =
  "Your event details are sent to Google Gemini to draft the plan. The plan is saved only in " +
  "this browser.";

type SubmitAreaProps = {
  copy: IntakeFlow["copy"];
  busy: boolean;
  submitRef: RefObject<HTMLButtonElement | null>;
  confirm: { name: string; onReplace: () => void; onKeep: () => void } | null;
};

export const SubmitArea = ({ copy, busy, submitRef, confirm }: SubmitAreaProps): ReactElement => {
  const privacyId = useId();
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-6">
      <p id={privacyId} className="text-sm text-ink-muted">
        {PRIVACY_NOTICE}
      </p>
      {confirm ? <ReplaceConfirm {...confirm} /> : null}
      <div>
        <Button
          ref={submitRef}
          type="submit"
          busy={busy}
          busyLabel={copy.busy}
          aria-describedby={privacyId}
          className="sm:px-6"
        >
          <SparklesIcon />
          {copy.submit}
        </Button>
      </div>
    </div>
  );
};
