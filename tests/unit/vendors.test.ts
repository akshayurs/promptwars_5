import { describe, expect, it } from "vitest";

import { toggleVendor, vendorProgress } from "@/lib/vendors";

import { makePlan } from "./fixtures";

describe("toggleVendor", () => {
  it("flips booked for the matching vendor only, without mutation", () => {
    const { vendors } = makePlan();
    const target = vendors[0]!;
    const next = toggleVendor(vendors, target.id);
    expect(next[0]?.booked).toBe(true);
    expect(next[1]).toBe(vendors[1]);
    expect(target.booked).toBe(false);
    expect(toggleVendor(next, target.id)[0]?.booked).toBe(false);
  });
});

describe("vendorProgress", () => {
  it("returns zeros for an empty list", () => {
    expect(vendorProgress([])).toEqual({ booked: 0, total: 0, ratio: 0 });
  });

  it("counts booked vendors", () => {
    const { vendors } = makePlan();
    const progress = vendorProgress([{ ...vendors[0]!, booked: true }, ...vendors.slice(1)]);
    expect(progress.booked).toBe(1);
    expect(progress.total).toBe(3);
    expect(progress.ratio).toBeCloseTo(1 / 3);
  });
});
