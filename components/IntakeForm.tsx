"use client";

import { useState, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { SparklesIcon } from "@/components/ui/Icons";
import { useLongWait } from "@/components/useLongWait";
import { LIMITS } from "@/lib/constants";

import { LogisticsFields, StoryFields } from "./intake/CommonFields";
import { ErrorSummary } from "./intake/ErrorSummary";
import { EventDetailsFields } from "./intake/EventDetailsFields";
import { EventTypeChoice } from "./intake/EventTypeChoice";
import { FIELD_LABELS } from "./intake/fieldLabels";
import {
  EMPTY,
  errorFor,
  toCandidate,
  toEventType,
  useDetailsState,
  type CommonKey,
  type ControlEvent,
  type FormValues,
} from "./intake/formState";
import { useIntakeSubmission } from "./intake/useIntakeSubmission";

const PENDING_TEXT = "Asking Gemini to draft budget, timeline, vendors and ideas.";
const LONG_WAIT_TEXT =
  "Still drafting your plan. Generation usually takes about half a minute; please keep this page open.";

const progressText = (busy: boolean, longWait: boolean): string => {
  if (!busy) return "";
  return longWait ? LONG_WAIT_TEXT : PENDING_TEXT;
};

export const IntakeForm = (): ReactElement => {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [details, updateDetails] = useDetailsState();
  const { issues, message, busy, alertRef, submit } = useIntakeSubmission();
  const longWait = useLongWait(busy);

  const onChange = (key: CommonKey) => (event: ControlEvent) => {
    const next = event.target.value;
    setValues((current) => ({ ...current, [key]: next }));
  };

  const fields = { values, issues, onChange };
  // The status sits outside the aria-busy form so its announcements are never suppressed.
  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(toCandidate(values, details));
        }}
        noValidate
        aria-busy={busy || undefined}
        className="flex flex-col gap-6"
      >
        <ErrorSummary message={message} issues={issues} summaryRef={alertRef} />
        <p className="text-sm text-ink-muted">All fields are required unless marked optional.</p>
        <EventTypeChoice {...fields} />
        <TextField
          id="eventName"
          label={FIELD_LABELS.eventName}
          value={values.eventName}
          onChange={onChange("eventName")}
          maxLength={LIMITS.shortText}
          required
          {...errorFor(issues, "eventName")}
        />
        <EventDetailsFields
          type={toEventType(values.eventType)}
          details={details}
          issues={issues}
          onDetail={updateDetails}
        />
        <LogisticsFields {...fields} />
        <StoryFields {...fields} />
        <div className="border-t border-line pt-6">
          <Button type="submit" busy={busy} busyLabel="Generating your plan…" className="sm:px-6">
            <SparklesIcon />
            Generate plan
          </Button>
        </div>
      </form>
      <p role="status" className="text-sm text-ink-muted">
        {progressText(busy, longWait)}
      </p>
    </div>
  );
};
