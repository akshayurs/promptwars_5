"use client";

import { useState, type ReactElement } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { SparklesIcon } from "@/components/ui/Icons";
import { LIMITS } from "@/lib/constants";

import { LogisticsFields, StoryFields } from "./intake/CommonFields";
import { EventDetailsFields } from "./intake/EventDetailsFields";
import { EventTypeChoice } from "./intake/EventTypeChoice";
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

export const IntakeForm = (): ReactElement => {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [details, updateDetails] = useDetailsState();
  const { issues, message, busy, alertRef, submit } = useIntakeSubmission();

  const onChange = (key: CommonKey) => (event: ControlEvent) => {
    const next = event.target.value;
    setValues((current) => ({ ...current, [key]: next }));
  };

  const fields = { values, issues, onChange };
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(toCandidate(values, details));
      }}
      noValidate
      className="flex flex-col gap-6"
    >
      {message ? (
        <div ref={alertRef} tabIndex={-1}>
          <Alert tone="error" title="There is a problem" live={false}>
            {message}
          </Alert>
        </div>
      ) : null}
      <EventTypeChoice {...fields} />
      <TextField
        id="eventName"
        label="Event name"
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
      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:gap-4">
        <Button type="submit" busy={busy} busyLabel="Generating your plan…" className="sm:px-6">
          <SparklesIcon />
          Generate plan
        </Button>
        <p role="status" className="text-sm text-ink-muted">
          {busy ? "Asking Gemini to draft budget, timeline, vendors and ideas." : ""}
        </p>
      </div>
    </form>
  );
};
