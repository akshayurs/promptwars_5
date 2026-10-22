import { describe, expect, it } from "vitest";

import {
  daysUntil,
  formatDate,
  formatMoney,
  formatPercent,
  shiftDate,
  todayIso,
} from "@/lib/format";

describe("formatMoney", () => {
  it.each([
    ["INR", /₹|INR/],
    ["USD", /\$|USD/],
    ["EUR", /€|EUR/],
    ["GBP", /£|GBP/],
  ] as const)("formats %s with its symbol and digits", (currency, symbol) => {
    const out = formatMoney(1234, currency);
    expect(out).toMatch(symbol);
    expect(out).toMatch(/1.?234/);
  });

  it("drops fractional digits", () => {
    expect(formatMoney(10.9, "USD")).not.toContain(".");
  });
});

describe("formatPercent", () => {
  it("formats ratios as whole percents", () => {
    expect(formatPercent(0.256)).toBe("26%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1.5)).toBe("150%");
  });
});

describe("formatDate", () => {
  it("formats in UTC regardless of local timezone", () => {
    expect(formatDate("2030-01-01")).toBe("1 January 2030");
    expect(formatDate("2030-12-31")).toBe("31 December 2030");
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

describe("clock helpers", () => {
  const at =
    (hour: number, minute = 0) =>
    () =>
      new Date(2030, 0, 10, hour, minute);

  it("todayIso uses the local calendar day of the injected clock", () => {
    expect(todayIso(at(15))).toBe("2030-01-10");
    expect(todayIso(at(0, 1))).toBe("2030-01-10");
    expect(todayIso(at(23, 59))).toBe("2030-01-10");
    expect(todayIso(() => new Date(2030, 8, 5, 12))).toBe("2030-09-05");
  });

  it("todayIso defaults to the real clock", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("daysUntil counts whole local calendar days regardless of time of day", () => {
    for (const clock of [at(0, 1), at(12), at(23, 59)]) {
      expect(daysUntil("2030-01-10", clock)).toBe(0);
      expect(daysUntil("2030-01-11", clock)).toBe(1);
      expect(daysUntil("2030-01-20", clock)).toBe(10);
    }
  });

  it("daysUntil is negative for past dates", () => {
    expect(daysUntil("2030-01-05", at(9))).toBe(-5);
  });

  it("daysUntil handles month and leap-year boundaries", () => {
    expect(daysUntil("2028-03-01", () => new Date(2028, 1, 28, 18))).toBe(2);
  });

  it("daysUntil defaults to the real clock", () => {
    expect(daysUntil("2999-01-01")).toBeGreaterThan(0);
    expect(daysUntil(todayIso())).toBe(0);
  });
});
