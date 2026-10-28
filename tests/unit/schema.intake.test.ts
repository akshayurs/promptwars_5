import { describe, expect, it } from "vitest";

import { DAY_MS, DAYS_PER_YEAR, LIMITS } from "@/lib/constants";
import { toIsoDay } from "@/lib/dates";
import { createIntakeSchema, IntakeSchema } from "@/lib/schema";

import { makeIntake, makeIntakeFor } from "./fixtures";

const NOW = Date.UTC(2026, 5, 15, 13, 30);
const isoDay = (ms: number): string => toIsoDay(ms);
const TODAY = isoDay(NOW);
const rep = (n: number): string => "a".repeat(n);

describe("IntakeSchema", () => {
  const futureIntake = (o: Parameters<typeof makeIntake>[0]) => makeIntake(o);

  it("accepts a valid intake", () => {
    expect(IntakeSchema.safeParse(futureIntake({})).success).toBe(true);
  });

  it.each(["wedding", "birthday", "community"] as const)("accepts event type %s", (eventType) => {
    expect(IntakeSchema.safeParse(makeIntakeFor(eventType, futureIntake({}))).success).toBe(true);
  });

  it("rejects details that belong to another event type", () => {
    const mismatched = { ...futureIntake({}), details: { honoreeName: "Aarav", honoreeAge: 7 } };
    expect(IntakeSchema.safeParse(mismatched).success).toBe(false);
  });

  it("rejects unknown event type", () => {
    expect(IntakeSchema.safeParse({ ...futureIntake({}), eventType: "party" }).success).toBe(false);
  });

  it("enforces eventName length boundaries and trims", () => {
    expect(IntakeSchema.safeParse(futureIntake({ eventName: "a" })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ eventName: " a " })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ eventName: "ab" })).success).toBe(true);
    expect(IntakeSchema.safeParse(futureIntake({ eventName: rep(80) })).success).toBe(true);
    expect(IntakeSchema.safeParse(futureIntake({ eventName: rep(81) })).success).toBe(false);
  });

  it("enforces guestCount integer and range", () => {
    expect(IntakeSchema.safeParse(futureIntake({ guestCount: 0 })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ guestCount: 1 })).success).toBe(true);
    expect(IntakeSchema.safeParse(futureIntake({ guestCount: 100_000 })).success).toBe(true);
    expect(IntakeSchema.safeParse(futureIntake({ guestCount: 100_001 })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ guestCount: 10.5 })).success).toBe(false);
  });

  it("enforces totalBudget positive and capped", () => {
    expect(IntakeSchema.safeParse(futureIntake({ totalBudget: 0 })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ totalBudget: -1 })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ totalBudget: 0.01 })).success).toBe(true);
    expect(IntakeSchema.safeParse(futureIntake({ totalBudget: LIMITS.maxBudget })).success).toBe(
      true,
    );
    expect(
      IntakeSchema.safeParse(futureIntake({ totalBudget: LIMITS.maxBudget + 1 })).success,
    ).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ totalBudget: Number.NaN })).success).toBe(false);
  });

  it("rejects unsupported currency", () => {
    expect(IntakeSchema.safeParse({ ...futureIntake({}), currency: "JPY" }).success).toBe(false);
  });

  it("enforces location, vibe and mustHaves bounds", () => {
    expect(IntakeSchema.safeParse(futureIntake({ location: "a" })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ location: rep(200) })).success).toBe(true);
    expect(IntakeSchema.safeParse(futureIntake({ location: rep(201) })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ vibe: "ab" })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ vibe: rep(500) })).success).toBe(true);
    expect(IntakeSchema.safeParse(futureIntake({ vibe: rep(501) })).success).toBe(false);
    expect(IntakeSchema.safeParse(futureIntake({ mustHaves: "" })).success).toBe(true);
    expect(IntakeSchema.safeParse(futureIntake({ mustHaves: rep(501) })).success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(IntakeSchema.safeParse({ ...futureIntake({}), extra: 1 }).success).toBe(false);
  });

  it("rejects missing fields", () => {
    const rest: Record<string, unknown> = { ...futureIntake({}) };
    delete rest.vibe;
    expect(IntakeSchema.safeParse(rest).success).toBe(false);
  });
});

describe("IntakeSchema details", () => {
  const withDetails = (eventType: "wedding" | "birthday" | "community", details: unknown) =>
    IntakeSchema.safeParse({ ...makeIntakeFor(eventType), details });

  it.each(["wedding", "birthday", "community"] as const)("requires details for %s", (eventType) => {
    const rest: Record<string, unknown> = { ...makeIntakeFor(eventType) };
    delete rest.details;
    const result = IntakeSchema.safeParse(rest);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["details"]);
  });

  it("reports nested paths for invalid details", () => {
    const result = withDetails("birthday", { honoreeName: "Aarav", honoreeAge: 0 });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([["details", "honoreeAge"]]);
  });

  it("enforces wedding text bounds and trims", () => {
    const ok = { coupleNames: "Asha and Ravi", ceremonyStyle: "Civil" };
    expect(withDetails("wedding", ok).success).toBe(true);
    expect(withDetails("wedding", { ...ok, coupleNames: " a " }).success).toBe(false);
    expect(withDetails("wedding", { ...ok, ceremonyStyle: rep(80) }).success).toBe(true);
    expect(withDetails("wedding", { ...ok, ceremonyStyle: rep(81) }).success).toBe(false);
    const parsed = withDetails("wedding", { ...ok, coupleNames: "  Asha and Ravi  " });
    expect(parsed.data?.details).toEqual(ok);
  });

  it("enforces honoree age bounds and integers", () => {
    const age = (honoreeAge: unknown) =>
      withDetails("birthday", { honoreeName: "Aarav", honoreeAge }).success;
    expect(age(LIMITS.minAge)).toBe(true);
    expect(age(LIMITS.maxAge)).toBe(true);
    expect(age(LIMITS.minAge - 1)).toBe(false);
    expect(age(LIMITS.maxAge + 1)).toBe(false);
    expect(age(7.5)).toBe(false);
    expect(age("7")).toBe(false);
    expect(age(Number.NaN)).toBe(false);
  });

  it("validates community admission and permit types", () => {
    expect(withDetails("community", { admission: "ticketed", needsPermit: false }).success).toBe(
      true,
    );
    expect(withDetails("community", { admission: "paid", needsPermit: false }).success).toBe(false);
    expect(withDetails("community", { admission: "free", needsPermit: "yes" }).success).toBe(false);
    expect(withDetails("community", { admission: "free" }).success).toBe(false);
  });

  it.each([
    ["wedding", { coupleNames: "Asha and Ravi", ceremonyStyle: "Civil", theme: "x" }],
    ["birthday", { honoreeName: "Aarav", honoreeAge: 7, cake: true }],
    ["community", { admission: "free", needsPermit: true, sponsor: "x" }],
  ] as const)("rejects unknown %s detail keys (strict)", (eventType, details) => {
    expect(withDetails(eventType, details).success).toBe(false);
  });

  it.each([null, "Asha and Ravi", [], 7])("rejects non-object details %s", (details) => {
    expect(withDetails("wedding", details).success).toBe(false);
  });
});

describe("createIntakeSchema date window", () => {
  const schema = createIntakeSchema(() => new Date(NOW));
  const withDate = (eventDate: string) => schema.safeParse(makeIntake({ eventDate }));

  it("accepts today", () => {
    expect(withDate(TODAY).success).toBe(true);
  });

  it("accepts yesterday as a grace day for time zones west of UTC", () => {
    expect(withDate(isoDay(NOW - DAY_MS)).success).toBe(true);
  });

  it("rejects two days ago", () => {
    expect(withDate(isoDay(NOW - 2 * DAY_MS)).success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(withDate("2026-02-31").success).toBe(false);
    expect(withDate("2026-13-01").success).toBe(false);
    expect(withDate("2028-02-29").success).toBe(true);
  });

  it("accepts the last day of the horizon and rejects the next day", () => {
    const horizon =
      Math.floor(NOW / DAY_MS) * DAY_MS + LIMITS.maxYearsAhead * DAYS_PER_YEAR * DAY_MS;
    expect(withDate(isoDay(horizon)).success).toBe(true);
    expect(withDate(isoDay(horizon + DAY_MS)).success).toBe(false);
  });

  it("rejects badly formatted dates", () => {
    expect(withDate("15-06-2026").success).toBe(false);
    expect(withDate("2026/06/16").success).toBe(false);
    expect(withDate("").success).toBe(false);
  });

  it("still rejects unknown keys", () => {
    expect(schema.safeParse({ ...makeIntake({ eventDate: TODAY }), extra: 1 }).success).toBe(false);
  });
});
