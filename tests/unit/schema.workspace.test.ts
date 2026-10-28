import { describe, expect, it } from "vitest";

import { RefineRequestSchema, StoredWorkspaceSchema } from "@/lib/schema";

import { makeIntake, makePlan, makeWorkspace } from "./fixtures";

const rep = (n: number): string => "a".repeat(n);

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
    expect(StoredWorkspaceSchema.safeParse({ ...makeWorkspace(), version: 2 }).success).toBe(true);
    expect(StoredWorkspaceSchema.safeParse({ ...makeWorkspace(), version: 1 }).success).toBe(false);
    expect(StoredWorkspaceSchema.safeParse({ ...makeWorkspace(), version: 3 }).success).toBe(false);
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
