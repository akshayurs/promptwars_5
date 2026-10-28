import { useState, type ChangeEvent } from "react";

import type { FieldIssues } from "@/lib/types";
import { ADMISSION_TYPES, EVENT_TYPES } from "@/lib/constants";
import type { EventType, Intake } from "@/lib/schema";

export type CommonKey = Exclude<keyof Intake, "details">;
export type FormValues = Record<CommonKey, string>;
export type ControlEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
export type Admission = (typeof ADMISSION_TYPES)[number];

export type DetailsValues = {
  wedding: { coupleNames: string; ceremonyStyle: string };
  birthday: { honoreeName: string; honoreeAge: string };
  community: { admission: Admission; needsPermit: boolean };
};
export type DetailsUpdate = <T extends EventType>(
  type: T,
  patch: Partial<DetailsValues[T]>,
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

const EMPTY_DETAILS: DetailsValues = {
  wedding: { coupleNames: "", ceremonyStyle: "" },
  birthday: { honoreeName: "", honoreeAge: "" },
  community: { admission: "free", needsPermit: false },
};

export const toEventType = (value: string): EventType =>
  EVENT_TYPES.find((type) => type === value) ?? "wedding";

export const toAdmission = (value: string): Admission =>
  ADMISSION_TYPES.find((type) => type === value) ?? "free";

const detailsCandidate = (type: EventType, details: DetailsValues): unknown => {
  switch (type) {
    case "wedding":
      return details.wedding;
    case "birthday":
      return { ...details.birthday, honoreeAge: Number(details.birthday.honoreeAge) };
    case "community":
      return details.community;
  }
};

export const toCandidate = (values: FormValues, details: DetailsValues): unknown => ({
  ...values,
  guestCount: Number(values.guestCount),
  totalBudget: Number(values.totalBudget),
  details: detailsCandidate(toEventType(values.eventType), details),
});

// Details issues keep their nested key ("details.honoreeAge") so they land on the inner field.
const issueKey = (path: readonly PropertyKey[]): string =>
  path[0] === "details" ? path.slice(0, 2).map(String).join(".") : String(path[0]);

export const firstPathIssues = (
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): FieldIssues => Object.fromEntries(issues.map((issue) => [issueKey(issue.path), issue.message]));

export const errorFor = (
  issues: FieldIssues,
  key: string,
): { error: string } | Record<string, never> => (issues[key] ? { error: issues[key] } : {});

export const useDetailsState = (): [DetailsValues, DetailsUpdate] => {
  const [details, setDetails] = useState<DetailsValues>(EMPTY_DETAILS);
  const update: DetailsUpdate = (type, patch) => {
    setDetails((current) => ({ ...current, [type]: { ...current[type], ...patch } }));
  };
  return [details, update];
};
