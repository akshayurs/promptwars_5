"use client";

import type { ReactElement, ReactNode } from "react";

import { SelectField, TextField } from "@/components/ui/Field";
import { ADMISSION_TYPES, LIMITS } from "@/lib/constants";
import { ADMISSION_LABELS, type DetailsFormValues } from "@/lib/eventTypes";
import type { EventType, FieldIssues } from "@/lib/types";

import { FIELD_LABELS } from "./fieldLabels";
import { errorFor } from "./fieldIssues";
import { toAdmission } from "./formValues";

export type DetailsProps<T extends EventType> = {
  values: DetailsFormValues[T];
  issues: FieldIssues;
  onChange: (patch: Partial<DetailsFormValues[T]>) => void;
};

const DetailsFieldset = ({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}): ReactElement => (
  <fieldset className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 sm:p-5">
    <legend className="px-1.5 text-sm font-semibold">{legend}</legend>
    {children}
  </fieldset>
);

export const WeddingFields = ({
  values,
  issues,
  onChange,
}: DetailsProps<"wedding">): ReactElement => (
  <DetailsFieldset legend="Wedding details">
    <TextField
      id="coupleNames"
      label={FIELD_LABELS["details.coupleNames"]}
      value={values.coupleNames}
      onChange={(event) => {
        onChange({ coupleNames: event.target.value });
      }}
      maxLength={LIMITS.shortText}
      required
      {...errorFor(issues, "details.coupleNames")}
    />
    <TextField
      id="ceremonyStyle"
      label={FIELD_LABELS["details.ceremonyStyle"]}
      hint="For example traditional Hindu, church, civil or a blend of cultures."
      value={values.ceremonyStyle}
      onChange={(event) => {
        onChange({ ceremonyStyle: event.target.value });
      }}
      maxLength={LIMITS.shortText}
      required
      {...errorFor(issues, "details.ceremonyStyle")}
    />
  </DetailsFieldset>
);

export const BirthdayFields = ({
  values,
  issues,
  onChange,
}: DetailsProps<"birthday">): ReactElement => (
  <DetailsFieldset legend="Birthday details">
    <TextField
      id="honoreeName"
      label={FIELD_LABELS["details.honoreeName"]}
      value={values.honoreeName}
      onChange={(event) => {
        onChange({ honoreeName: event.target.value });
      }}
      maxLength={LIMITS.shortText}
      required
      {...errorFor(issues, "details.honoreeName")}
    />
    <TextField
      id="honoreeAge"
      label={FIELD_LABELS["details.honoreeAge"]}
      type="number"
      inputMode="numeric"
      min={LIMITS.minAge}
      max={LIMITS.maxAge}
      value={values.honoreeAge}
      onChange={(event) => {
        onChange({ honoreeAge: event.target.value });
      }}
      required
      {...errorFor(issues, "details.honoreeAge")}
    />
  </DetailsFieldset>
);

export const CommunityFields = ({
  values,
  issues,
  onChange,
}: DetailsProps<"community">): ReactElement => (
  <DetailsFieldset legend="Community event details">
    <SelectField
      id="admission"
      label={FIELD_LABELS["details.admission"]}
      value={values.admission}
      onChange={(event) => {
        onChange({ admission: toAdmission(event.target.value) });
      }}
      options={ADMISSION_TYPES.map((type) => ({ value: type, label: ADMISSION_LABELS[type] }))}
      {...errorFor(issues, "details.admission")}
    />
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
      <input
        id="needsPermit"
        type="checkbox"
        className="size-6 shrink-0 cursor-pointer rounded accent-brand"
        checked={values.needsPermit}
        onChange={(event) => {
          onChange({ needsPermit: event.target.checked });
        }}
      />
      This event needs a public permit
    </label>
  </DetailsFieldset>
);
