import type { ADMISSION_TYPES, CURRENCIES, EVENT_TYPES, MILESTONE_PHASES } from "@/lib/constants";

export type EventType = (typeof EVENT_TYPES)[number];
export type Currency = (typeof CURRENCIES)[number];
export type Admission = (typeof ADMISSION_TYPES)[number];
export type Phase = (typeof MILESTONE_PHASES)[number];

/** Validation messages keyed by field path, such as "guestCount" or "details.honoreeAge". */
export type FieldIssues = Record<string, string>;
