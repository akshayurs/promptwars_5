import { describe, expect, it } from "vitest";

import { DAY_MS, LIMITS } from "@/lib/constants";
import {
  createIntakeSchema,
  GeneratedPlanSchema,
  IntakeSchema,
  LenientGeneratedPlanSchema,
  PlanSchema,
  RefineRequestSchema,
  StoredWorkspaceSchema,
} from "@/lib/schema";

import { makeGeneratedPlan, makeIntake, makePlan, makeWorkspace } from "./fixtures";

const NOW = Date.UTC(2026, 5, 15, 13, 30);
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const TODAY = isoDay(NOW);
const rep = (n: number): string => "a".repeat(n);

describe("IntakeSchema", () => {
  const futureIntake = (o: Parameters<typeof makeIntake>[0]) => makeIntake(o);

  it("accepts a valid intake", () => {
    expect(IntakeSchema.safeParse(futureIntake({})).success).toBe(true);
  });

  it.each(["wedding", "birthday", "community"] as const)("accepts event type %s", (eventType) => {
    expect(IntakeSchema.safeParse(futureIntake({ eventType })).success).toBe(true);
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

describe("createIntakeSchema date window", () => {
  const schema = createIntakeSchema(() => NOW);
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
    const horizon = Math.floor(NOW / DAY_MS) * DAY_MS + LIMITS.maxYearsAhead * 365 * DAY_MS;
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

describe("GeneratedPlanSchema", () => {
  const rows = <T>(item: T, n: number): T[] => Array.from({ length: n }, () => item);
  const base = makeGeneratedPlan();
  const [line] = base.budget;
  const [milestone] = base.timeline;
  const [vendor] = base.vendors;
  const [idea] = base.ideas;
  if (!line || !milestone || !vendor || !idea) throw new Error("fixture");

  it("accepts a valid plan", () => {
    expect(GeneratedPlanSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    { key: "budget", item: line, min: 3, max: 15 },
    { key: "timeline", item: milestone, min: 4, max: 25 },
    { key: "vendors", item: vendor, min: 3, max: 15 },
    { key: "ideas", item: idea, min: 3, max: 10 },
  ])("enforces $key array size bounds", ({ key, item, min, max }) => {
    const attempt = (n: number) =>
      GeneratedPlanSchema.safeParse({ ...base, [key]: rows(item, n) }).success;
    expect(attempt(min - 1)).toBe(false);
    expect(attempt(min)).toBe(true);
    expect(attempt(max)).toBe(true);
    expect(attempt(max + 1)).toBe(false);
  });

  it("enforces text limits", () => {
    expect(GeneratedPlanSchema.safeParse({ ...base, summary: rep(600) }).success).toBe(true);
    expect(GeneratedPlanSchema.safeParse({ ...base, summary: rep(601) }).success).toBe(false);
    expect(GeneratedPlanSchema.safeParse({ ...base, summary: "  " }).success).toBe(false);
  });

  it("rejects negative amounts and out-of-range days", () => {
    const bad = { ...base, budget: [{ ...line, amount: -1 }, ...base.budget.slice(1)] };
    expect(GeneratedPlanSchema.safeParse(bad).success).toBe(false);
    const days = {
      ...base,
      timeline: [{ ...milestone, daysBeforeEvent: 1096 }, ...base.timeline.slice(1)],
    };
    expect(GeneratedPlanSchema.safeParse(days).success).toBe(false);
    const frac = {
      ...base,
      timeline: [{ ...milestone, daysBeforeEvent: 1.5 }, ...base.timeline.slice(1)],
    };
    expect(GeneratedPlanSchema.safeParse(frac).success).toBe(false);
  });

  it("limits questions per vendor to 1..5", () => {
    const withQuestions = (n: number) => ({
      ...base,
      vendors: [{ ...vendor, questionsToAsk: rows("Q?", n) }, ...base.vendors.slice(1)],
    });
    expect(GeneratedPlanSchema.safeParse(withQuestions(0)).success).toBe(false);
    expect(GeneratedPlanSchema.safeParse(withQuestions(5)).success).toBe(true);
    expect(GeneratedPlanSchema.safeParse(withQuestions(6)).success).toBe(false);
  });

  it("rejects an unknown milestone phase", () => {
    const bad = {
      ...base,
      timeline: [{ ...milestone, phase: "later" }, ...base.timeline.slice(1)],
    };
    expect(GeneratedPlanSchema.safeParse(bad).success).toBe(false);
  });
});

describe("LenientGeneratedPlanSchema", () => {
  const base = makeGeneratedPlan();
  const [line] = base.budget;
  const [vendor] = base.vendors;
  const [idea] = base.ideas;
  if (!line || !vendor || !idea) throw new Error("fixture");

  it("accepts a valid plan unchanged", () => {
    expect(LenientGeneratedPlanSchema.parse(base)).toEqual(base);
  });

  it("trims and truncates over-long strings instead of rejecting", () => {
    const parsed = LenientGeneratedPlanSchema.parse({
      ...base,
      summary: `  ${rep(700)}  `,
      ideas: [{ ...idea, description: rep(LIMITS.longText + 5) }, ...base.ideas.slice(1)],
    });
    expect(parsed.summary).toBe(rep(LIMITS.summaryText));
    expect(parsed.ideas[0]?.description).toHaveLength(LIMITS.longText);
    expect(GeneratedPlanSchema.safeParse(parsed).success).toBe(true);
  });

  it("slices arrays to their maximum length", () => {
    const parsed = LenientGeneratedPlanSchema.parse({
      ...base,
      budget: Array.from({ length: LIMITS.budgetLines.max + 3 }, () => line),
      vendors: [
        { ...vendor, questionsToAsk: Array.from({ length: 9 }, () => "Q?") },
        ...base.vendors.slice(1),
      ],
    });
    expect(parsed.budget).toHaveLength(LIMITS.budgetLines.max);
    expect(parsed.vendors[0]?.questionsToAsk).toHaveLength(LIMITS.questionsPerVendor);
  });

  it("still rejects minimum violations", () => {
    expect(LenientGeneratedPlanSchema.safeParse({ ...base, summary: "   " }).success).toBe(false);
    expect(
      LenientGeneratedPlanSchema.safeParse({ ...base, ideas: base.ideas.slice(0, 2) }).success,
    ).toBe(false);
  });
});

describe("PlanSchema", () => {
  it("accepts a plan with uuid ids and vendor.booked", () => {
    expect(PlanSchema.safeParse(makePlan()).success).toBe(true);
  });

  it("rejects non-uuid ids", () => {
    const plan = makePlan();
    const [first, ...rest] = plan.budget;
    if (!first) throw new Error("fixture");
    expect(
      PlanSchema.safeParse({ ...plan, budget: [{ ...first, id: "abc" }, ...rest] }).success,
    ).toBe(false);
  });

  it("requires vendor.booked", () => {
    const plan = makePlan();
    const [first, ...rest] = plan.vendors;
    if (!first) throw new Error("fixture");
    const unbooked: Record<string, unknown> = { ...first };
    delete unbooked.booked;
    expect(PlanSchema.safeParse({ ...plan, vendors: [unbooked, ...rest] }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(PlanSchema.safeParse({ ...makePlan(), extra: true }).success).toBe(false);
  });
});

describe("RefineRequestSchema", () => {
  const valid = { intake: makeIntake(), plan: makePlan(), instruction: "Cut the decor budget" };

  it("accepts a valid request", () => {
    expect(RefineRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("enforces instruction bounds", () => {
    expect(RefineRequestSchema.safeParse({ ...valid, instruction: "ab" }).success).toBe(false);
    expect(RefineRequestSchema.safeParse({ ...valid, instruction: rep(500) }).success).toBe(true);
    expect(RefineRequestSchema.safeParse({ ...valid, instruction: rep(501) }).success).toBe(false);
  });

  it("rejects unknown keys and missing plan", () => {
    expect(RefineRequestSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    expect(
      RefineRequestSchema.safeParse({ intake: valid.intake, instruction: valid.instruction })
        .success,
    ).toBe(false);
  });

  it("accepts an intake whose date has already passed", () => {
    const past = { ...valid, intake: makeIntake({ eventDate: "2001-01-01" }) };
    expect(RefineRequestSchema.safeParse(past).success).toBe(true);
  });
});

describe("StoredWorkspaceSchema", () => {
  it("accepts a valid workspace", () => {
    expect(StoredWorkspaceSchema.safeParse(makeWorkspace()).success).toBe(true);
  });

  it("accepts a stored previousPlan", () => {
    expect(
      StoredWorkspaceSchema.safeParse(makeWorkspace({ previousPlan: makePlan() })).success,
    ).toBe(true);
  });

  it("rejects wrong version", () => {
    expect(StoredWorkspaceSchema.safeParse({ ...makeWorkspace(), version: 2 }).success).toBe(false);
  });

  it("requires an ISO datetime for savedAt", () => {
    expect(StoredWorkspaceSchema.safeParse(makeWorkspace({ savedAt: "yesterday" })).success).toBe(
      false,
    );
    expect(StoredWorkspaceSchema.safeParse(makeWorkspace({ savedAt: "2030-01-01" })).success).toBe(
      false,
    );
  });

  it("survives the event date passing", () => {
    const ws = makeWorkspace({ intake: makeIntake({ eventDate: "2001-01-01" }) });
    expect(StoredWorkspaceSchema.safeParse(ws).success).toBe(true);
  });

  it("rejects unknown keys", () => {
    expect(StoredWorkspaceSchema.safeParse({ ...makeWorkspace(), extra: 1 }).success).toBe(false);
  });
});
