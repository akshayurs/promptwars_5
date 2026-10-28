import "server-only";

import type { DetailsOf } from "@/lib/eventTypes";
import type { Intake } from "@/lib/schema";
import type { Admission, EventType } from "@/lib/types";

/** Intake values under the plain-language labels a planner would use. */
export type Labeled = Record<string, string | number>;

/** How one event type is described to the model; kept server-side with the other prompt text. */
type EventTypePrompt<T extends EventType> = {
  /** Planning guidance; free-text details are referred to by label, never interpolated. */
  guidance: (details: DetailsOf<T>) => string;
  /** The type-specific details for the intake data block. */
  details: (details: DetailsOf<T>) => Labeled;
};

const ADMISSION_GUIDANCE: Record<Admission, string> = {
  free: "Admission is free: plan for unpredictable turnout, crowd flow, and sponsor or donation income rather than ticket revenue.",
  ticketed:
    "Admission is ticketed: include a ticketing platform, pricing tiers, sales deadlines and entry check-in in the plan.",
};

const ADMISSION_ENTRY: Record<Admission, string> = {
  free: "Free entry",
  ticketed: "Ticketed entry",
};

const permitGuidance = (needsPermit: boolean): string =>
  needsPermit
    ? "The organiser needs a public permit: the timeline must include a booking-phase milestone to apply for the permit early enough for approval, and the vendor list should cover any permit-related services."
    : "The organiser reports that no public permit is needed; do not add a permit application milestone.";

const EVENT_TYPE_PROMPTS: { readonly [T in EventType]: EventTypePrompt<T> } = {
  wedding: {
    guidance: () =>
      "Weddings span ceremony and reception, involve families and traditions, and usually need the longest lead times for venue, catering, attire and photography. Personalise the plan for the couple named in the intake and shape the ceremony, rituals, attire, music and vendors around their ceremony style.",
    details: ({ coupleNames, ceremonyStyle }) => ({
      Couple: coupleNames,
      "Ceremony style": ceremonyStyle,
    }),
  },
  birthday: {
    guidance: ({ honoreeAge }) =>
      `Birthdays centre on the guest of honour named in the intake, who is turning ${honoreeAge}; keep logistics light, weight the budget toward food, entertainment and decor, and choose activities, food and safety measures that suit that age.`,
    details: ({ honoreeName, honoreeAge }) => ({
      "Guest of honour": honoreeName,
      "Age they are turning": honoreeAge,
    }),
  },
  community: {
    guidance: ({ admission, needsPermit }) =>
      [
        "Community events serve a broad public: prioritise permits, safety, accessibility, volunteers, sponsors, signage and inclusive programming.",
        ADMISSION_GUIDANCE[admission],
        permitGuidance(needsPermit),
      ].join(" "),
    details: ({ admission, needsPermit }) => ({
      Admission: ADMISSION_ENTRY[admission],
      "Public permit needed": needsPermit ? "Yes" : "No",
    }),
  },
};

const promptFor = <T extends EventType>(type: T): EventTypePrompt<T> => EVENT_TYPE_PROMPTS[type];

/** Planning guidance for the intake's event type. */
export const eventGuidance = (intake: Intake): string =>
  promptFor(intake.eventType).guidance(intake.details);

/** The intake's type-specific details under planner-facing labels. */
export const eventDetailLines = (intake: Intake): Labeled =>
  promptFor(intake.eventType).details(intake.details);
