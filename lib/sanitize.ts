// Bidi embeddings, overrides and isolates, zero-width space, word joiner and byte order mark:
// invisible characters that can reorder or hide text in the UI, prompts and exported files.
// ZWNJ and ZWJ (U+200C, U+200D) are kept because Indic and Persian scripts and emoji sequences
// need them.
const INVISIBLE_FORMATTING = /[​⁠﻿‪-‮⁦-⁩]/gu;
const LINE_BREAK = /\r\n?/gu;
const LINE_CONTROL = /[\t\n]/gu;
const CONTROL_EXCEPT_TAB_AND_NEWLINE = /(?![\t\n])\p{Cc}/gu;

export type SanitizeOptions = { multiline: boolean };

/**
 * Removes C0/C1 control characters and invisible formatting from user text. Multi-line text keeps
 * tabs and newlines (CR LF and CR become LF); single-line text turns them into spaces.
 */
export const sanitizeText = (value: string, { multiline }: SanitizeOptions): string => {
  const lines = value.replace(LINE_BREAK, "\n");
  const flattened = multiline ? lines : lines.replace(LINE_CONTROL, " ");
  return flattened.replace(CONTROL_EXCEPT_TAB_AND_NEWLINE, "").replace(INVISIBLE_FORMATTING, "");
};
