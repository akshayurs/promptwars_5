import { describe, expect, it } from "vitest";

import { daysBetween, toIsoDay } from "@/lib/dates";

describe("toIsoDay", () => {
  it("returns the UTC calendar day", () => {
    expect(toIsoDay(new Date("2030-01-01T23:59:59-05:00"))).toBe("2030-01-02");
    expect(toIsoDay(new Date("2030-01-01T00:00:00Z"))).toBe("2030-01-01");
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
