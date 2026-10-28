import { DAY_MS, ISO_DATE_LENGTH } from "@/lib/constants";

/** Source of the current instant; injected so date logic stays deterministic in tests. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

/** UTC midnight, in epoch milliseconds, of a YYYY-MM-DD calendar day (NaN when malformed). */
export const parseIsoDay = (isoDay: string): number => Date.parse(`${isoDay}T00:00:00Z`);

/** UTC calendar day (YYYY-MM-DD) of an instant given as a Date or epoch milliseconds. */
export const toIsoDay = (instant: Date | number): string =>
  new Date(instant).toISOString().slice(0, ISO_DATE_LENGTH);

/**
 * "Today" is the UTC calendar day of the injected clock, on the server and in the browser alike,
 * so client countdowns and server-side date checks always agree.
 */
export const todayIso = (now: Clock = systemClock): string => toIsoDay(now());

/** Whole days from one YYYY-MM-DD day to another; negative when `toIso` is earlier. */
export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((parseIsoDay(toIso) - parseIsoDay(fromIso)) / DAY_MS);

/** Whole days from today (see `todayIso`) until the given day; negative once it has passed. */
export const daysUntil = (isoDay: string, now: Clock = systemClock): number =>
  daysBetween(todayIso(now), isoDay);

/** The calendar day `deltaDays` after (or, when negative, before) the given day. */
export const shiftDate = (isoDay: string, deltaDays: number): string =>
  toIsoDay(parseIsoDay(isoDay) + deltaDays * DAY_MS);
