import { describe, expect, it } from "vitest";

import { DAY_MS } from "@/lib/constants";
import {
  daysBetween,
  daysUntil,
  parseIsoDay,
  shiftDate,
  systemClock,
  todayIso,
  toIsoDay,
} from "@/lib/dates";

const at = (iso: string) => () => new Date(iso);

describe("parseIsoDay", () => {
  it("returns UTC midnight of the day in epoch milliseconds", () => {
    expect(parseIsoDay("2030-01-01")).toBe(Date.UTC(2030, 0, 1));
    expect(parseIsoDay("2028-02-29")).toBe(Date.UTC(2028, 1, 29));
  });

  it("returns NaN for malformed input", () => {
    expect(parseIsoDay("not a date")).toBeNaN();
    expect(parseIsoDay("")).toBeNaN();
  });
});

describe("toIsoDay", () => {
  it("returns the UTC calendar day of a Date", () => {
    expect(toIsoDay(new Date("2030-01-01T23:59:59-05:00"))).toBe("2030-01-02");
    expect(toIsoDay(new Date("2030-01-01T00:00:00Z"))).toBe("2030-01-01");
  });

  it("accepts epoch milliseconds", () => {
    expect(toIsoDay(Date.UTC(2030, 11, 31, 23, 59))).toBe("2030-12-31");
  });
});

describe("todayIso", () => {
  it("is the UTC calendar day of the injected clock at any time of day", () => {
    expect(todayIso(at("2030-01-10T00:00:00Z"))).toBe("2030-01-10");
    expect(todayIso(at("2030-01-10T23:59:59Z"))).toBe("2030-01-10");
    expect(todayIso(at("2030-01-10T20:00:00-05:00"))).toBe("2030-01-11");
    expect(todayIso(at("2030-01-11T02:00:00+05:30"))).toBe("2030-01-10");
  });

  it("defaults to the system clock", () => {
    expect(todayIso()).toBe(toIsoDay(new Date()));
    expect(systemClock().getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe("daysBetween", () => {
  it("counts whole days between ISO dates", () => {
    expect(daysBetween("2030-01-01", "2030-01-15")).toBe(14);
    expect(daysBetween("2030-01-01", "2030-01-01")).toBe(0);
    expect(daysBetween("2030-01-15", "2030-01-01")).toBe(-14);
  });

  it("handles leap days and year boundaries", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2029-12-31", "2030-01-01")).toBe(1);
  });
});

describe("daysUntil", () => {
  it("counts whole days from today regardless of the time of day", () => {
    for (const clock of [at("2030-01-10T00:01:00Z"), at("2030-01-10T23:59:00Z")]) {
      expect(daysUntil("2030-01-10", clock)).toBe(0);
      expect(daysUntil("2030-01-11", clock)).toBe(1);
      expect(daysUntil("2030-01-20", clock)).toBe(10);
    }
  });

  it("is negative for past days and crosses leap days", () => {
    expect(daysUntil("2030-01-05", at("2030-01-10T09:00:00Z"))).toBe(-5);
    expect(daysUntil("2028-03-01", at("2028-02-28T18:00:00Z"))).toBe(2);
  });

  it("defaults to the system clock", () => {
    expect(daysUntil(todayIso())).toBe(0);
    expect(daysUntil(toIsoDay(Date.now() + 3 * DAY_MS))).toBe(3);
  });
});

describe("shiftDate", () => {
  it("shifts across month and year boundaries", () => {
    expect(shiftDate("2030-01-31", 1)).toBe("2030-02-01");
    expect(shiftDate("2030-12-31", 1)).toBe("2031-01-01");
  });

  it("supports negative deltas and leap days", () => {
    expect(shiftDate("2030-01-01", -1)).toBe("2029-12-31");
    expect(shiftDate("2028-03-01", -1)).toBe("2028-02-29");
    expect(shiftDate("2030-05-05", 0)).toBe("2030-05-05");
  });
});
