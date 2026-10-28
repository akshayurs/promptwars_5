import type { Intake } from "@/lib/intakeSchema";
import type { Admission, EventType } from "@/lib/types";

/** The validated type-specific details of one event type. */
export type DetailsOf<T extends EventType> = Extract<Intake, { eventType: T }>["details"];

/** Type-specific intake form values, as the form controls hold them. */
export type DetailsFormValues = {
  wedding: DetailsOf<"wedding">;
  birthday: { honoreeName: string; honoreeAge: string };
  community: DetailsOf<"community">;
};

/** Icon shown beside an event type; components map each key to an icon component. */
export type EventIcon = "heart" | "cake" | "users";

/**
 * Client-safe behaviour of one event type. Its intake schema, form fields and prompt guidance
 * live beside their peers (lib/intakeSchema.ts, components/intake, lib/eventTypePrompts.ts).
 */
type EventTypeDefinition<T extends EventType> = {
  label: string;
  icon: EventIcon;
  /** One-line echo of the type-specific details in the planner's brief. */
  summary: (details: DetailsOf<T>) => string;
  emptyForm: DetailsFormValues[T];
  toForm: (details: DetailsOf<T>) => DetailsFormValues[T];
  /** Form values shaped for schema validation: numbers parsed, nothing else trusted. */
  fromForm: (form: DetailsFormValues[T]) => unknown;
};

/** Display names for community event admission types. */
export const ADMISSION_LABELS: Readonly<Record<Admission, string>> = {
  free: "Free",
  ticketed: "Ticketed",
};

const ceremonyLabel = (style: string): string =>
  /ceremony/i.test(style) ? style : `${style} ceremony`;

/** Everything shared code needs to know per event type; adding a type means adding an entry. */
export const EVENT_TYPE_REGISTRY: { readonly [T in EventType]: EventTypeDefinition<T> } = {
  wedding: {
    label: "Wedding",
    icon: "heart",
    summary: ({ coupleNames, ceremonyStyle }) => `${coupleNames} · ${ceremonyLabel(ceremonyStyle)}`,
    emptyForm: { coupleNames: "", ceremonyStyle: "" },
    toForm: (details) => details,
    fromForm: (form) => form,
  },
  birthday: {
    label: "Birthday",
    icon: "cake",
    summary: ({ honoreeName, honoreeAge }) => `${honoreeName} turns ${honoreeAge}`,
    emptyForm: { honoreeName: "", honoreeAge: "" },
    toForm: ({ honoreeName, honoreeAge }) => ({ honoreeName, honoreeAge: String(honoreeAge) }),
    fromForm: (form) => ({ ...form, honoreeAge: Number(form.honoreeAge) }),
  },
  community: {
    label: "Community event",
    icon: "users",
    summary: ({ admission, needsPermit }) =>
      `${ADMISSION_LABELS[admission]} admission · ${needsPermit ? "permit required" : "no permit needed"}`,
    emptyForm: { admission: "free", needsPermit: false },
    toForm: (details) => details,
    fromForm: (form) => form,
  },
};

const summaryFor = <T extends EventType>(type: T, details: DetailsOf<T>): string =>
  EVENT_TYPE_REGISTRY[type].summary(details);

/** The planner's type-specific details in one line, such as "Aarav turns 7". */
export const detailsSummary = (intake: Intake): string =>
  summaryFor(intake.eventType, intake.details);

/** Form values for one type from a saved intake's details. */
export const toDetailsForm = <T extends EventType>(
  type: T,
  details: DetailsOf<T>,
): DetailsFormValues[T] => EVENT_TYPE_REGISTRY[type].toForm(details);

/** One type's form values, shaped for schema validation. */
export const fromDetailsForm = <T extends EventType>(
  type: T,
  form: DetailsFormValues[T],
): unknown => EVENT_TYPE_REGISTRY[type].fromForm(form);
