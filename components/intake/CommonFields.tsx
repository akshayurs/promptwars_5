import { useSyncExternalStore, type ReactElement } from "react";

import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { CURRENCIES, LIMITS } from "@/lib/constants";
import { todayIso } from "@/lib/format";

import { FIELD_LABELS } from "./fieldLabels";
import { errorFor, type FieldsProps } from "./formState";

const noSubscription = (): (() => void) => () => undefined;
const serverToday = (): undefined => undefined;

// The server cannot know the visitor's local date, so `min` is only set after hydration.
const useLocalToday = (): string | undefined =>
  useSyncExternalStore(noSubscription, todayIso, serverToday);

const DateField = ({
  value,
  issues,
  onChange,
}: Omit<FieldsProps, "values"> & { value: string }): ReactElement => {
  const today = useLocalToday();
  return (
    <TextField
      id="eventDate"
      label={FIELD_LABELS.eventDate}
      type="date"
      {...(today ? { min: today } : {})}
      value={value}
      onChange={onChange("eventDate")}
      required
      {...errorFor(issues, "eventDate")}
    />
  );
};

export const LogisticsFields = ({ values, issues, onChange }: FieldsProps): ReactElement => (
  <div className="grid gap-5 sm:grid-cols-2">
    <DateField value={values.eventDate} issues={issues} onChange={onChange} />
    <TextField
      id="guestCount"
      label={FIELD_LABELS.guestCount}
      type="number"
      inputMode="numeric"
      min={LIMITS.minGuests}
      max={LIMITS.maxGuests}
      value={values.guestCount}
      onChange={onChange("guestCount")}
      required
      {...errorFor(issues, "guestCount")}
    />
    <TextField
      id="totalBudget"
      label={FIELD_LABELS.totalBudget}
      type="number"
      inputMode="decimal"
      min={1}
      max={LIMITS.maxBudget}
      value={values.totalBudget}
      onChange={onChange("totalBudget")}
      required
      {...errorFor(issues, "totalBudget")}
    />
    <SelectField
      id="currency"
      label={FIELD_LABELS.currency}
      value={values.currency}
      onChange={onChange("currency")}
      options={CURRENCIES.map((code) => ({ value: code, label: code }))}
    />
  </div>
);

export const StoryFields = ({ values, issues, onChange }: FieldsProps): ReactElement => (
  <>
    <TextField
      id="location"
      label={FIELD_LABELS.location}
      autoComplete="address-level2"
      value={values.location}
      onChange={onChange("location")}
      maxLength={LIMITS.mediumText}
      required
      {...errorFor(issues, "location")}
    />
    <TextAreaField
      id="vibe"
      label={FIELD_LABELS.vibe}
      hint="Theme, mood, cultural touches, dietary needs, anything that makes it yours."
      value={values.vibe}
      onChange={onChange("vibe")}
      maxLength={LIMITS.longText}
      required
      {...errorFor(issues, "vibe")}
    />
    <TextAreaField
      id="mustHaves"
      label={FIELD_LABELS.mustHaves}
      value={values.mustHaves}
      onChange={onChange("mustHaves")}
      maxLength={LIMITS.longText}
      {...errorFor(issues, "mustHaves")}
    />
  </>
);
