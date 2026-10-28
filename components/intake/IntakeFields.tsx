"use client";

import type { ReactElement } from "react";

import { TextField } from "@/components/ui/Field";
import { LIMITS } from "@/lib/constants";

import { LogisticsFields, StoryFields } from "./CommonFields";
import { EventDetailsFields } from "./EventDetailsFields";
import { EventTypeChoice } from "./EventTypeChoice";
import { FIELD_LABELS } from "./fieldLabels";
import { errorFor } from "./fieldIssues";
import {
  toEventType,
  type DetailsUpdate,
  type DetailsValues,
  type FieldsProps,
} from "./formValues";

type IntakeFieldsProps = FieldsProps & { details: DetailsValues; onDetail: DetailsUpdate };

/** Every intake control, in visual order; the type-specific fieldset follows the event type. */
export const IntakeFields = ({ details, onDetail, ...fields }: IntakeFieldsProps): ReactElement => (
  <>
    <EventTypeChoice {...fields} />
    <TextField
      id="eventName"
      label={FIELD_LABELS.eventName}
      value={fields.values.eventName}
      onChange={fields.onChange("eventName")}
      maxLength={LIMITS.shortText}
      required
      {...errorFor(fields.issues, "eventName")}
    />
    <EventDetailsFields
      type={toEventType(fields.values.eventType)}
      details={details}
      issues={fields.issues}
      onDetail={onDetail}
    />
    <LogisticsFields {...fields} />
    <StoryFields {...fields} />
  </>
);
