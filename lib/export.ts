import { sumAllocated } from "@/lib/budget";
import { ICS_MAX_LINE_OCTETS } from "@/lib/constants";
import { shiftDate, systemClock, type Clock } from "@/lib/dates";
import type { StoredWorkspace } from "@/lib/schema";

/** A file ready to hand to the browser as a download. */
export type ExportFile = { content: string; fileName: string; type: string };

const CRLF = "\r\n";
const UID_HOST = "eventcraft";
const PRODID = "-//EventCraft//Event plan//EN";
// Lets spreadsheet apps detect UTF-8 so non-ASCII categories open intact.
const UTF8_BOM = "﻿";
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

/** Lower-case, hyphenated ASCII file name; names without letters or digits become "event". */
export const exportFileName = (eventName: string, suffix: string): string => {
  const slug = eventName
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "event"}-${suffix}`;
};

/** Escapes an iCalendar TEXT value (RFC 5545 §3.3.11). */
export const escapeIcsText = (value: string): string =>
  value.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\r\n|\r|\n/g, "\\n");

const encoder = new TextEncoder();

/** Folds a content line at the octet limit without splitting a character (RFC 5545 §3.1). */
export const foldIcsLine = (line: string): string => {
  const parts: string[] = [];
  let part = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts towards the limit.
    const limit = parts.length === 0 ? ICS_MAX_LINE_OCTETS : ICS_MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(part);
      part = "";
      octets = 0;
    }
    part += char;
    octets += size;
  }
  parts.push(part);
  return parts.join(`${CRLF} `);
};

type CalendarEntry = {
  uid: string;
  day: string;
  summary: string;
  description: string;
  location: string | null;
};

const icsDay = (isoDay: string): string => isoDay.replaceAll("-", "");

const icsTimestamp = (instant: Date): string =>
  instant
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const eventLines = (entry: CalendarEntry, stamp: string): string[] => [
  "BEGIN:VEVENT",
  `UID:${entry.uid}@${UID_HOST}`,
  `DTSTAMP:${stamp}`,
  `DTSTART;VALUE=DATE:${icsDay(entry.day)}`,
  `DTEND;VALUE=DATE:${icsDay(shiftDate(entry.day, 1))}`,
  `SUMMARY:${escapeIcsText(entry.summary)}`,
  `DESCRIPTION:${escapeIcsText(entry.description)}`,
  ...(entry.location === null ? [] : [`LOCATION:${escapeIcsText(entry.location)}`]),
  "END:VEVENT",
];

const calendarEntries = ({ intake, plan }: StoredWorkspace): CalendarEntry[] => [
  {
    uid: exportFileName(intake.eventName, `${intake.eventDate}-event-day`),
    day: intake.eventDate,
    summary: intake.eventName,
    description: plan.summary,
    location: intake.location,
  },
  ...plan.timeline.map((milestone) => ({
    uid: milestone.id,
    day: shiftDate(intake.eventDate, -milestone.daysBeforeEvent),
    summary: milestone.title,
    description: milestone.details,
    location: null,
  })),
];

/** iCalendar (RFC 5545) with an all-day event for the event day and for every milestone. */
export const buildCalendar = (workspace: StoredWorkspace, now: Clock = systemClock): string => {
  const stamp = icsTimestamp(now());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...calendarEntries(workspace).flatMap((entry) => eventLines(entry, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
};

/** Quotes a CSV field (RFC 4180) and defuses text a spreadsheet would run as a formula. */
export const csvField = (value: string): string => {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/** Budget lines as CSV (RFC 4180) with a header row and a closing total row. */
export const buildBudgetCsv = ({ intake, plan }: StoredWorkspace): string => {
  const rows: Array<readonly string[]> = [
    ["Category", "Amount", "Currency", "Why it matters"],
    ...plan.budget.map((line) => [
      line.category,
      String(line.amount),
      intake.currency,
      line.rationale,
    ]),
    ["Total allocated", String(sumAllocated(plan.budget)), intake.currency, ""],
  ];
  return rows.map((row) => row.map(csvField).join(",")).join(CRLF) + CRLF;
};

/** The workspace as pretty-printed JSON. */
export const planJsonFile = (workspace: StoredWorkspace): ExportFile => ({
  content: JSON.stringify(workspace, null, 2),
  fileName: exportFileName(workspace.intake.eventName, "plan.json"),
  type: "application/json",
});

/** The timeline as an .ics calendar file. */
export const calendarFile = (workspace: StoredWorkspace, now: Clock = systemClock): ExportFile => ({
  content: buildCalendar(workspace, now),
  fileName: exportFileName(workspace.intake.eventName, "calendar.ics"),
  type: "text/calendar;charset=utf-8",
});

/** The budget as a UTF-8 CSV file. */
export const budgetCsvFile = (workspace: StoredWorkspace): ExportFile => ({
  content: `${UTF8_BOM}${buildBudgetCsv(workspace)}`,
  fileName: exportFileName(workspace.intake.eventName, "budget.csv"),
  type: "text/csv;charset=utf-8",
});
