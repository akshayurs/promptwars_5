import { describe, expect, it } from "vitest";

import { ICS_MAX_LINE_OCTETS } from "@/lib/constants";
import {
  budgetCsvFile,
  buildBudgetCsv,
  buildCalendar,
  calendarFile,
  csvField,
  escapeIcsText,
  exportFileName,
  foldIcsLine,
  planJsonFile,
} from "@/lib/export";
import type { Milestone, StoredWorkspace } from "@/lib/schema";

import { makeIntake, makePlan, makeWorkspace } from "./fixtures";

const NOW = (): Date => new Date("2031-02-03T04:05:06.789Z");
const octets = (text: string): number => new TextEncoder().encode(text).length;

const milestone = (overrides: Partial<Milestone>): Milestone => ({
  id: "m-1",
  title: "Book venue",
  phase: "booking",
  daysBeforeEvent: 30,
  done: false,
  details: "Visit two halls",
  ...overrides,
});

const workspaceWith = (timeline: Milestone[]): StoredWorkspace =>
  makeWorkspace({
    intake: makeIntake({ eventName: "Asha & Ravi Wedding", eventDate: "2030-06-15" }),
    plan: makePlan({ timeline, summary: "A warm, floral day; with music." }),
  });

/** Unfolds and splits an iCalendar body into its logical content lines. */
const contentLines = (ics: string): string[] =>
  ics.replace(/\r\n /g, "").split("\r\n").filter(Boolean);

const events = (ics: string): string[][] => {
  const result: string[][] = [];
  let current: string[] | null = null;
  for (const line of contentLines(ics)) {
    if (line === "BEGIN:VEVENT") current = [];
    else if (line === "END:VEVENT" && current) {
      result.push(current);
      current = null;
    } else current?.push(line);
  }
  return result;
};

describe("exportFileName", () => {
  it.each([
    ["Asha & Ravi Wedding", "plan.json", "asha-ravi-wedding-plan.json"],
    ["  --Spring Fair 2030!!  ", "budget.csv", "spring-fair-2030-budget.csv"],
    ["Décor Café Ünïcode", "calendar.ics", "decor-cafe-unicode-calendar.ics"],
    ["!!", "plan.json", "event-plan.json"],
    ["आरव का जन्मदिन", "plan.json", "event-plan.json"],
    ["../../etc/passwd", "plan.json", "etc-passwd-plan.json"],
  ])("%j -> %s", (name, suffix, expected) => {
    expect(exportFileName(name, suffix)).toBe(expected);
  });
});

describe("escapeIcsText", () => {
  it("escapes backslashes, semicolons, commas and every newline form", () => {
    expect(escapeIcsText("a\\b;c,d\ne\r\nf\rg")).toBe("a\\\\b\\;c\\,d\\ne\\nf\\ng");
  });

  it("leaves colons, quotes and unicode untouched", () => {
    expect(escapeIcsText('Time: 5 "sharp" — मेहंदी 🎉')).toBe('Time: 5 "sharp" — मेहंदी 🎉');
  });
});

describe("foldIcsLine", () => {
  it("keeps lines within the limit unchanged", () => {
    const line = "x".repeat(ICS_MAX_LINE_OCTETS);
    expect(foldIcsLine(line)).toBe(line);
  });

  it("folds long ASCII lines at the octet limit with CRLF and a space", () => {
    const line = "y".repeat(ICS_MAX_LINE_OCTETS * 2);
    const parts = foldIcsLine(line).split("\r\n");
    expect(parts[0]).toHaveLength(ICS_MAX_LINE_OCTETS);
    expect(parts.slice(1).every((part) => part.startsWith(" "))).toBe(true);
    expect(parts.every((part) => octets(part) <= ICS_MAX_LINE_OCTETS)).toBe(true);
    expect(parts.map((part, index) => (index === 0 ? part : part.slice(1))).join("")).toBe(line);
  });

  it("never splits a multi-byte character across folded lines", () => {
    const line = `SUMMARY:${"मेहंदी 🎉 ".repeat(20)}`;
    const parts = foldIcsLine(line).split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => octets(part) <= ICS_MAX_LINE_OCTETS)).toBe(true);
    expect(parts.join("\r\n").includes("�")).toBe(false);
    expect(parts.map((part, index) => (index === 0 ? part : part.slice(1))).join("")).toBe(line);
  });
});

describe("buildCalendar", () => {
  it("wraps events in a VCALENDAR with CRLF line endings throughout", () => {
    const ics = buildCalendar(workspaceWith([milestone({})]), NOW);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(contentLines(ics)).toContain("CALSCALE:GREGORIAN");
    expect(contentLines(ics)).toContain("METHOD:PUBLISH");
  });

  it("adds an all-day event for the event day with its location", () => {
    const [eventDay] = events(buildCalendar(workspaceWith([]), NOW));
    expect(eventDay).toEqual([
      "UID:asha-ravi-wedding-2030-06-15-event-day@eventcraft",
      "DTSTAMP:20310203T040506Z",
      "DTSTART;VALUE=DATE:20300615",
      "DTEND;VALUE=DATE:20300616",
      "SUMMARY:Asha & Ravi Wedding",
      "DESCRIPTION:A warm\\, floral day\\; with music.",
      "LOCATION:Bengaluru",
    ]);
  });

  it("adds one all-day event per milestone, dated before the event", () => {
    const timeline = [
      milestone({ id: "a", daysBeforeEvent: 30 }),
      milestone({ id: "b", title: "Final fitting", daysBeforeEvent: 1, details: "Line 1\nLine 2" }),
      milestone({ id: "c", title: "Celebrate", daysBeforeEvent: 0, done: true }),
    ];
    const [, ...rest] = events(buildCalendar(workspaceWith(timeline), NOW));
    expect(rest).toHaveLength(3);
    expect(rest[0]).toContain("UID:a@eventcraft");
    expect(rest[0]).toContain("DTSTART;VALUE=DATE:20300516");
    expect(rest[0]).toContain("DTEND;VALUE=DATE:20300517");
    expect(rest[1]).toContain("SUMMARY:Final fitting");
    expect(rest[1]).toContain("DESCRIPTION:Line 1\\nLine 2");
    expect(rest[1]).toContain("DTSTART;VALUE=DATE:20300614");
    expect(rest[2]).toContain("DTSTART;VALUE=DATE:20300615");
    expect(rest.every((event) => !event.some((line) => line.startsWith("LOCATION:")))).toBe(true);
  });

  it("stamps every event with the injected clock and gives each a unique UID", () => {
    const timeline = [milestone({ id: "a" }), milestone({ id: "b" })];
    const parsed = events(buildCalendar(workspaceWith(timeline), NOW));
    const uids = parsed.map((event) => event.find((line) => line.startsWith("UID:")));
    expect(new Set(uids).size).toBe(parsed.length);
    expect(parsed.every((event) => event.includes("DTSTAMP:20310203T040506Z"))).toBe(true);
  });

  it("folds long unicode text so every physical line fits the octet limit", () => {
    const long = milestone({ title: `मेहंदी ${"🎉".repeat(40)}`, details: "d".repeat(300) });
    const ics = buildCalendar(workspaceWith([long]), NOW);
    expect(ics.split("\r\n").every((line) => octets(line) <= ICS_MAX_LINE_OCTETS)).toBe(true);
    expect(contentLines(ics)).toContain(`SUMMARY:${long.title}`);
  });
});

describe("csvField", () => {
  it.each([
    ["plain", "plain"],
    ["a,b", '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ["line1\nline2", '"line1\nline2"'],
    ["cr\rlf", '"cr\rlf"'],
    ["Décor ₹ 🎉", "Décor ₹ 🎉"],
    ["", ""],
  ])("%j -> %j", (value, expected) => {
    expect(csvField(value)).toBe(expected);
  });

  it.each(["=SUM(A1)", "+1", "-1", "@cmd", "\tTab"])(
    "neutralises the formula-like value %j",
    (value) => {
      expect(csvField(value).startsWith("'")).toBe(true);
    },
  );

  it("quotes a neutralised formula that also contains a comma", () => {
    expect(csvField('=HYPERLINK("x",1)')).toBe('"\'=HYPERLINK(""x"",1)"');
  });
});

describe("buildBudgetCsv", () => {
  const workspace = makeWorkspace({
    intake: makeIntake({ currency: "USD" }),
    plan: makePlan({
      budget: [
        { id: "1", category: "Venue, hall", amount: 1200.5, rationale: 'The "big" one' },
        { id: "2", category: "Décor", amount: 300, rationale: "Flowers\nand lights" },
      ],
    }),
  });

  it("writes a header, one row per line and a total row, CRLF-terminated", () => {
    expect(buildBudgetCsv(workspace)).toBe(
      [
        "Category,Amount,Currency,Why it matters",
        '"Venue, hall",1200.5,USD,"The ""big"" one"',
        'Décor,300,USD,"Flowers\nand lights"',
        "Total allocated,1500.5,USD,",
        "",
      ].join("\r\n"),
    );
  });
});

describe("export files", () => {
  const workspace = workspaceWith([milestone({})]);

  it("plan JSON round-trips the workspace", () => {
    const file = planJsonFile(workspace);
    expect(file.fileName).toBe("asha-ravi-wedding-plan.json");
    expect(file.type).toBe("application/json");
    expect(JSON.parse(file.content)).toEqual(workspace);
  });

  it("calendar file uses the calendar media type and the injected clock", () => {
    const file = calendarFile(workspace, NOW);
    expect(file.fileName).toBe("asha-ravi-wedding-calendar.ics");
    expect(file.type).toBe("text/calendar;charset=utf-8");
    expect(file.content).toBe(buildCalendar(workspace, NOW));
  });

  it("calendar file defaults to the system clock", () => {
    expect(calendarFile(workspace).content).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it("budget CSV starts with a UTF-8 byte order mark for spreadsheet apps", () => {
    const file = budgetCsvFile(workspace);
    expect(file.fileName).toBe("asha-ravi-wedding-budget.csv");
    expect(file.type).toBe("text/csv;charset=utf-8");
    expect(file.content).toBe(`﻿${buildBudgetCsv(workspace)}`);
  });
});
