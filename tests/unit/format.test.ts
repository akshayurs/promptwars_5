import { afterEach, describe, expect, it, vi } from "vitest";

import { formatCount, formatDate, formatMoney, formatPercent } from "@/lib/format";

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

  it("groups digits by the currency's locale", () => {
    expect(formatMoney(100_000, "INR")).toContain("1,00,000");
    expect(formatMoney(100_000, "USD")).toContain("100,000");
  });
});

describe("formatter caching", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("builds one money formatter per currency and reuses it", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/format");
    const construct = vi.spyOn(Intl, "NumberFormat");
    fresh.formatMoney(1, "USD");
    fresh.formatMoney(2, "USD");
    fresh.formatMoney(3, "GBP");
    fresh.formatPercent(0.5);
    fresh.formatCount(5);
    expect(construct).toHaveBeenCalledTimes(2);
  });
});

describe("formatPercent", () => {
  it("formats ratios as whole percents", () => {
    expect(formatPercent(0.256)).toBe("26%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(1.5)).toBe("150%");
  });
});

describe("formatCount", () => {
  it("adds thousands separators", () => {
    expect(formatCount(100_000)).toBe("100,000");
    expect(formatCount(1_000_000_000)).toBe("1,000,000,000");
    expect(formatCount(7)).toBe("7");
  });
});

describe("formatDate", () => {
  it("formats in UTC regardless of local timezone", () => {
    expect(formatDate("2030-01-01")).toBe("1 January 2030");
    expect(formatDate("2030-12-31")).toBe("31 December 2030");
  });
});
