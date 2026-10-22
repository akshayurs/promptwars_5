import { DAY_MS } from "@/lib/constants";

const ISO_DAY_LENGTH = 10;

/** UTC calendar day (YYYY-MM-DD) of the given instant. */
export const toIsoDay = (date: Date): string => date.toISOString().slice(0, ISO_DAY_LENGTH);

/** Whole days from one YYYY-MM-DD day to another, using UTC-midnight arithmetic. */
export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
