"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { requestPlan, type FieldIssues } from "@/lib/client";
import { ADMISSION_TYPES, CURRENCIES, EVENT_TYPES, LIMITS } from "@/lib/constants";
import { todayIso } from "@/lib/format";
import { IntakeSchema, type EventType, type Intake } from "@/lib/schema";
import { createWorkspace } from "@/lib/workspace";
import { workspaceStore } from "@/lib/workspaceStore";

type CommonKey = Exclude<keyof Intake, "details">;
type FormValues = Record<CommonKey, string>;
type ControlEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
type Admission = (typeof ADMISSION_TYPES)[number];

type DetailsValues = {
  wedding: { coupleNames: string; ceremonyStyle: string };
  birthday: { honoreeName: string; honoreeAge: string };
  community: { admission: Admission; needsPermit: boolean };
};
type DetailsUpdate = <T extends EventType>(type: T, patch: Partial<DetailsValues[T]>) => void;

const EMPTY: FormValues = {
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

const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

const ADMISSION_LABELS: Record<Admission, string> = { free: "Free", ticketed: "Ticketed" };

const toEventType = (value: string): EventType =>
  EVENT_TYPES.find((type) => type === value) ?? "wedding";

const toAdmission = (value: string): Admission =>
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

const toCandidate = (values: FormValues, details: DetailsValues): unknown => ({
  ...values,
  guestCount: Number(values.guestCount),
  totalBudget: Number(values.totalBudget),
  details: detailsCandidate(toEventType(values.eventType), details),
});

// Details issues keep their nested key ("details.honoreeAge") so they land on the inner field.
const issueKey = (path: readonly PropertyKey[]): string =>
  path[0] === "details" ? path.slice(0, 2).map(String).join(".") : String(path[0]);

const firstPathIssues = (
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): FieldIssues => Object.fromEntries(issues.map((issue) => [issueKey(issue.path), issue.message]));

type FieldsProps = {
  values: FormValues;
  issues: FieldIssues;
  onChange: (key: CommonKey) => (event: ControlEvent) => void;
};

const errorFor = (issues: FieldIssues, key: string): { error: string } | Record<string, never> =>
  issues[key] ? { error: issues[key] } : {};

const EventTypeChoice = ({ values, onChange }: FieldsProps): ReactElement => (
  <fieldset className="flex flex-col gap-2">
    <legend className="text-sm font-medium">Event type</legend>
    <div className="flex flex-wrap gap-3">
      {EVENT_TYPES.map((type) => (
        <label
          key={type}
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-control px-3 py-2 has-checked:border-brand has-checked:bg-brand-soft"
        >
          <input
            type="radio"
            name="eventType"
            value={type}
            checked={values.eventType === type}
            onChange={onChange("eventType")}
          />
          {EVENT_LABELS[type]}
        </label>
      ))}
    </div>
  </fieldset>
);

type DetailsProps<T extends EventType> = {
  values: DetailsValues[T];
  issues: FieldIssues;
  onChange: (patch: Partial<DetailsValues[T]>) => void;
};

const DetailsFieldset = ({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}): ReactElement => (
  <fieldset className="flex flex-col gap-4 rounded-md border border-line p-4">
    <legend className="px-1 text-sm font-medium">{legend}</legend>
    {children}
  </fieldset>
);

const WeddingFields = ({ values, issues, onChange }: DetailsProps<"wedding">): ReactElement => (
  <DetailsFieldset legend="Wedding details">
    <TextField
      id="coupleNames"
      label="Couple's names"
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
      label="Ceremony style"
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

const BirthdayFields = ({ values, issues, onChange }: DetailsProps<"birthday">): ReactElement => (
  <DetailsFieldset legend="Birthday details">
    <TextField
      id="honoreeName"
      label="Guest of honour's name"
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
      label="Age they are turning"
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

const CommunityFields = ({ values, issues, onChange }: DetailsProps<"community">): ReactElement => (
  <DetailsFieldset legend="Community event details">
    <SelectField
      id="admission"
      label="Admission"
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
        className="size-6 shrink-0 rounded border border-control accent-brand"
        checked={values.needsPermit}
        onChange={(event) => {
          onChange({ needsPermit: event.target.checked });
        }}
      />
      This event needs a public permit
    </label>
  </DetailsFieldset>
);

type EventDetailsProps = {
  type: EventType;
  details: DetailsValues;
  issues: FieldIssues;
  onDetail: DetailsUpdate;
};

const EventDetailsFields = ({
  type,
  details,
  issues,
  onDetail,
}: EventDetailsProps): ReactElement => {
  switch (type) {
    case "wedding":
      return (
        <WeddingFields
          values={details.wedding}
          issues={issues}
          onChange={(patch) => {
            onDetail("wedding", patch);
          }}
        />
      );
    case "birthday":
      return (
        <BirthdayFields
          values={details.birthday}
          issues={issues}
          onChange={(patch) => {
            onDetail("birthday", patch);
          }}
        />
      );
    case "community":
      return (
        <CommunityFields
          values={details.community}
          issues={issues}
          onChange={(patch) => {
            onDetail("community", patch);
          }}
        />
      );
  }
};

const useDetailsState = (): [DetailsValues, DetailsUpdate] => {
  const [details, setDetails] = useState<DetailsValues>(EMPTY_DETAILS);
  const update: DetailsUpdate = (type, patch) => {
    setDetails((current) => ({ ...current, [type]: { ...current[type], ...patch } }));
  };
  return [details, update];
};

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
      label="Event date"
      type="date"
      {...(today ? { min: today } : {})}
      value={value}
      onChange={onChange("eventDate")}
      required
      {...errorFor(issues, "eventDate")}
    />
  );
};

const LogisticsFields = ({ values, issues, onChange }: FieldsProps): ReactElement => (
  <div className="grid gap-5 sm:grid-cols-2">
    <DateField value={values.eventDate} issues={issues} onChange={onChange} />
    <TextField
      id="guestCount"
      label="Guest count"
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
      label="Total budget"
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
      label="Currency"
      value={values.currency}
      onChange={onChange("currency")}
      options={CURRENCIES.map((code) => ({ value: code, label: code }))}
    />
  </div>
);

const StoryFields = ({ values, issues, onChange }: FieldsProps): ReactElement => (
  <>
    <TextField
      id="location"
      label="City or venue area"
      autoComplete="address-level2"
      value={values.location}
      onChange={onChange("location")}
      maxLength={LIMITS.mediumText}
      required
      {...errorFor(issues, "location")}
    />
    <TextAreaField
      id="vibe"
      label="Vibe and preferences"
      hint="Theme, mood, cultural touches, dietary needs, anything that makes it yours."
      value={values.vibe}
      onChange={onChange("vibe")}
      maxLength={LIMITS.longText}
      required
      {...errorFor(issues, "vibe")}
    />
    <TextAreaField
      id="mustHaves"
      label="Must-haves (optional)"
      value={values.mustHaves}
      onChange={onChange("mustHaves")}
      maxLength={LIMITS.longText}
      {...errorFor(issues, "mustHaves")}
    />
  </>
);

type Submission = {
  issues: FieldIssues;
  message: string | null;
  busy: boolean;
  alertRef: RefObject<HTMLDivElement | null>;
  submit: (candidate: unknown) => Promise<void>;
};

const useFocusOnFailure = (failures: number): RefObject<HTMLDivElement | null> => {
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (failures > 0) alertRef.current?.focus();
  }, [failures]);
  return alertRef;
};

const useAbortOnUnmount = (): RefObject<AbortController | null> => {
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );
  return controllerRef;
};

const useIntakeSubmission = (): Submission => {
  const router = useRouter();
  const [issues, setIssues] = useState<FieldIssues>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const alertRef = useFocusOnFailure(failures);
  const controllerRef = useAbortOnUnmount();

  const fail = (text: string, fieldIssues: FieldIssues): void => {
    setIssues(fieldIssues);
    setMessage(text);
    setFailures((count) => count + 1);
  };

  const submit = async (candidate: unknown): Promise<void> => {
    if (busy) return;
    const parsed = IntakeSchema.safeParse(candidate);
    if (!parsed.success) {
      fail("Please correct the highlighted fields.", firstPathIssues(parsed.error.issues));
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setMessage(null);
    const result = await requestPlan(parsed.data, controller.signal);
    if (controller.signal.aborted) return;
    setBusy(false);
    if (!result.ok) {
      fail(result.message, result.issues);
      return;
    }
    workspaceStore.dispatch({
      type: "replace",
      workspace: createWorkspace(parsed.data, result.value),
    });
    router.push("/plan");
  };

  return { issues, message, busy, alertRef, submit };
};

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
      className="flex flex-col gap-5"
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
      <div className="flex items-center gap-4">
        <Button type="submit" busy={busy} busyLabel="Generating your plan…">
          Generate plan
        </Button>
        <p role="status" className="text-sm text-ink-muted">
          {busy ? "Asking Gemini to draft budget, timeline, vendors and ideas." : ""}
        </p>
      </div>
    </form>
  );
};
