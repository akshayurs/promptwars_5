import { parseIsoDay } from "@/lib/dates";
import type { Currency } from "@/lib/types";

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

const moneyFormatters = new Map<Currency, Intl.NumberFormat>();
const percentFormatter = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 0,
});
const countFormatter = new Intl.NumberFormat("en");
const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" });

const moneyFormatter = (currency: Currency): Intl.NumberFormat => {
  const cached = moneyFormatters.get(currency);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  moneyFormatters.set(currency, formatter);
  return formatter;
};

/** Whole-unit amount with the currency symbol and that currency's digit grouping. */
export const formatMoney = (amount: number, currency: Currency): string =>
  moneyFormatter(currency).format(amount);

/** A ratio (0.25) as a whole percentage ("25%"). */
export const formatPercent = (ratio: number): string => percentFormatter.format(ratio);

/** A count with thousands separators ("100,000"). */
export const formatCount = (value: number): string => countFormatter.format(value);

/** A YYYY-MM-DD day as a long date ("15 January 2030"), independent of the local time zone. */
export const formatDate = (isoDay: string): string => dateFormatter.format(parseIsoDay(isoDay));
