/** Intake field labels keyed by issue path, in visual order; also used for error summary links. */
export const FIELD_LABELS = {
  eventName: "Event name",
  "details.coupleNames": "Couple's names",
  "details.ceremonyStyle": "Ceremony style",
  "details.honoreeName": "Guest of honour's name",
  "details.honoreeAge": "Age they are turning",
  "details.admission": "Admission",
  eventDate: "Event date",
  guestCount: "Guest count",
  totalBudget: "Total budget",
  currency: "Currency",
  location: "City or venue area",
  vibe: "Vibe and preferences",
  mustHaves: "Must-haves (optional)",
} as const;

/** Issue keys map to element ids: "details.honoreeAge" lives on the input with id "honoreeAge". */
export const fieldId = (key: string): string => key.replace(/^details\./, "");
