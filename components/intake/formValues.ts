import type { ChangeEvent } from "react";

import { ADMISSION_TYPES, EVENT_TYPES } from "@/lib/constants";
import {
  EVENT_TYPE_REGISTRY,
  fromDetailsForm,
  toDetailsForm,
  type DetailsFormValues,
} from "@/lib/eventTypes";
import type { Intake } from "@/lib/schema";
import type { Admission, EventType, FieldIssues } from "@/lib/types";

export type CommonKey = Exclude<keyof Intake, "details">;
export type FormValues = Record<CommonKey, string>;
export type ControlEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

/** Details typed so far per event type; a type with nothing typed yet uses its empty form. */
export type DetailsValues = Partial<DetailsFormValues>;
export type DetailsUpdate = <T extends EventType>(
  type: T,
  patch: Partial<DetailsFormValues[T]>,
) => void;

export type FieldsProps = {
  values: FormValues;
  issues: FieldIssues;
  onChange: (key: CommonKey) => (event: ControlEvent) => void;
};

export const EMPTY: FormValues = {
  eventType: "wedding",
  eventName: "",
  eventDate: "",
  guestCount: "",
  totalBudget: "",
  currency: "INR",
  location: "",
  vibe: "",
  mustHaves: "",
};

export const toEventType = (value: string): EventType =>
  EVENT_TYPES.find((type) => type === value) ?? "wedding";

export const toAdmission = (value: string): Admission =>
  ADMISSION_TYPES.find((type) => type === value) ?? "free";

/** One type's form values: what was typed, or the type's empty form. */
export const detailsFor = <T extends EventType>(
  details: DetailsValues,
  type: T,
): DetailsFormValues[T] => details[type] ?? EVENT_TYPE_REGISTRY[type].emptyForm;

/** The untrusted form state shaped like an intake, ready for schema validation. */
export const toCandidate = (values: FormValues, details: DetailsValues): unknown => {
  const type = toEventType(values.eventType);
  return {
    ...values,
    guestCount: Number(values.guestCount),
    totalBudget: Number(values.totalBudget),
    details: fromDetailsForm(type, detailsFor(details, type)),
  };
};

/** Form values pre-filled from a saved intake, for editing the event details. */
export const toFormValues = (intake: Intake): FormValues => ({
  eventType: intake.eventType,
  eventName: intake.eventName,
  eventDate: intake.eventDate,
  guestCount: String(intake.guestCount),
  totalBudget: String(intake.totalBudget),
  currency: intake.currency,
  location: intake.location,
  vibe: intake.vibe,
  mustHaves: intake.mustHaves,
});

/** Type-specific form values pre-filled from a saved intake. */
export const toDetailsValues = (intake: Intake): DetailsValues => ({
  [intake.eventType]: toDetailsForm(intake.eventType, intake.details),
});
