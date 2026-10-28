import { LIMITS } from "@/lib/constants";

const ELLIPSIS = "…";
const TRAILING_PUNCTUATION: ReadonlySet<string> = new Set([",", ";", ":", ".", "-", "–", "—"]);

const trimTrailingPunctuation = (text: string): string => {
  let end = text.trimEnd().length;
  while (end > 0 && TRAILING_PUNCTUATION.has(text.charAt(end - 1))) end -= 1;
  return text.slice(0, end).trimEnd();
};

/** Shortens text to at most `max` characters, ending on a whole word followed by an ellipsis. */
export const truncateAtWord = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const head = text.slice(0, max - ELLIPSIS.length);
  const endsOnWord = /\s/u.test(text.charAt(head.length));
  const lastBreak = head.search(/\s\S*$/u);
  const cutsTooMuch = lastBreak < max * LIMITS.truncationMinKeepRatio;
  const keep = endsOnWord || cutsTooMuch ? head : head.slice(0, lastBreak);
  return `${trimTrailingPunctuation(keep)}${ELLIPSIS}`;
};
