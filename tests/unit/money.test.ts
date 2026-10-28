import { describe, expect, it } from "vitest";

import { floorMoney, roundMoney } from "@/lib/money";

describe("roundMoney", () => {
  it.each([
    [0.1 + 0.2, "0.3"],
    [10.456, "10.46"],
    [10.454, "10.45"],
    [-2.5, "-2.5"],
    [0, "0"],
  ])("rounds %s to the nearest minor unit (%s)", (amount, expected) => {
    expect(roundMoney(amount).toString()).toBe(expected);
  });
});

describe("floorMoney", () => {
  it.each([
    [1 / 3, "0.33"],
    [10.459, "10.45"],
    [42, "42"],
  ])("rounds %s down to the minor unit (%s)", (amount, expected) => {
    expect(floorMoney(amount).toString()).toBe(expected);
  });
});
