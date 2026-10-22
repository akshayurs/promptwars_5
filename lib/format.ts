import { DAY_MS } from "@/lib/constants";
import type { Intake } from "@/lib/schema";

type Currency = Intake["currency"];

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

export const formatMoney = (amount: number, currency: Currency): string =>
  new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

export const formatPercent = (ratio: number): string =>
  new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 }).format(ratio);

const toUtcDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);

export const formatDate = (isoDate: string): string =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(
    toUtcDate(isoDate),
  );

export const shiftDate = (isoDate: string, deltaDays: number): string =>
  new Date(toUtcDate(isoDate).getTime() + deltaDays * DAY_MS).toISOString().slice(0, 10);

type Clock = () => Date;

const systemClock: Clock = () => new Date();

const pad = (value: number): string => String(value).padStart(2, "0");

export const todayIso = (now: Clock = systemClock): string => {
  const date = now();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const daysUntil = (isoDate: string, now: Clock = systemClock): number => {
  const date = now();
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((toUtcDate(isoDate).getTime() - today) / DAY_MS);
};
