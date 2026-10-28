"use client";

import { useRef, useState, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import type { PendingRequest } from "@/components/usePendingRequest";
import type { Intake } from "@/lib/schema";

import { ErrorSummary } from "./intake/ErrorSummary";
import {
  EMPTY,
  toCandidate,
  toFormValues,
  type CommonKey,
  type ControlEvent,
  type FormValues,
} from "./intake/formValues";
import { IntakeFields } from "./intake/IntakeFields";
import { createPlanFlow, type IntakeFlow } from "./intake/intakeFlows";
import { SubmitArea } from "./intake/SubmitArea";
import { useDetailsState } from "./intake/useDetailsState";
import { useIntakeSubmission } from "./intake/useIntakeSubmission";

const NEW_PLAN_FLOW = createPlanFlow();

type IntakeFormProps = {
  /** Defaults to generating a new plan; the edit page adapts the saved plan instead. */
  flow?: IntakeFlow;
  /** Saved event details to pre-fill, when editing. */
  initial?: Intake;
};

// The status sits outside the aria-busy form so its announcements are never suppressed.
const RequestStatus = ({
  request,
  onCancel,
}: {
  request: Pick<PendingRequest, "busy" | "statusText">;
  onCancel: () => void;
}): ReactElement => (
  <div className="flex flex-wrap items-center gap-3">
    <p role="status" className="text-sm text-ink-muted">
      {request.statusText}
    </p>
    {request.busy ? (
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    ) : null}
  </div>
);

export const IntakeForm = ({ flow = NEW_PLAN_FLOW, initial }: IntakeFormProps): ReactElement => {
  const [values, setValues] = useState<FormValues>(() => (initial ? toFormValues(initial) : EMPTY));
  const [details, updateDetails] = useDetailsState(initial);
  const { issues, message, alertRef, request, replacing, submit, keepCurrent } =
    useIntakeSubmission(flow);
  const submitRef = useRef<HTMLButtonElement>(null);

  const onChange = (key: CommonKey) => (event: ControlEvent) => {
    const next = event.target.value;
    setValues((current) => ({ ...current, [key]: next }));
  };
  const focusSubmit = (): void => {
    submitRef.current?.focus();
  };
  const confirm =
    replacing === null
      ? null
      : {
          name: replacing,
          onReplace: () => {
            focusSubmit();
            submit(toCandidate(values, details), true);
          },
          onKeep: () => {
            keepCurrent();
            focusSubmit();
          },
        };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(toCandidate(values, details));
        }}
        noValidate
        aria-busy={request.busy || undefined}
        className="flex flex-col gap-6"
      >
        <ErrorSummary message={message} issues={issues} summaryRef={alertRef} />
        <p className="text-sm text-ink-muted">All fields are required unless marked optional.</p>
        <IntakeFields {...{ values, issues, onChange, details }} onDetail={updateDetails} />
        <SubmitArea copy={flow.copy} busy={request.busy} submitRef={submitRef} confirm={confirm} />
      </form>
      <RequestStatus
        request={request}
        onCancel={() => {
          request.cancel();
          focusSubmit();
        }}
      />
    </div>
  );
};
