import { describe, expect, it } from "vitest";

import { STORAGE_KEY, WORKSPACE_VERSION } from "@/lib/constants";
import {
  createRefineRequestSchema,
  RefineRequestSchema,
  StoredWorkspaceSchema,
} from "@/lib/schema";

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

  it("explains instruction length problems in plain language", () => {
    const message = (instruction: string) =>
      RefineRequestSchema.safeParse({ ...valid, instruction }).error?.issues[0]?.message;
    expect(message("  ab  ")).toBe("Enter a change of at least 3 characters");
    expect(message(rep(501))).toBe("Enter a change of at most 500 characters");
  });

  it("keeps line breaks in the instruction", () => {
    const instruction = "Cut the decor budget\nAdd a live band";
    expect(RefineRequestSchema.parse({ ...valid, instruction }).instruction).toBe(instruction);
    const windows = { ...valid, instruction: "Cut decor\r\nAdd a band" };
    expect(RefineRequestSchema.parse(windows).instruction).toBe("Cut decor\nAdd a band");
  });

  it("rejects unknown keys and missing plan", () => {
    expect(RefineRequestSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
    expect(
      RefineRequestSchema.safeParse({ intake: valid.intake, instruction: valid.instruction })
        .success,
    ).toBe(false);
  });

  it("rejects an edited event date outside today to five years ahead", () => {
    const at = (eventDate: string) =>
      RefineRequestSchema.safeParse({ ...valid, intake: makeIntake({ eventDate }) });
    expect(at("2001-01-01").error?.issues[0]).toMatchObject({
      path: ["intake", "eventDate"],
      message: "Choose an event date between today and 5 years from now",
    });
    expect(at("2099-01-01").success).toBe(false);
  });

  it("applies the window from the injected clock, keeping the one-day grace", () => {
    const schema = createRefineRequestSchema(() => new Date("2030-03-10T12:00:00Z"));
    const at = (eventDate: string) =>
      schema.safeParse({ ...valid, intake: makeIntake({ eventDate }) }).success;
    expect(at("2030-03-09")).toBe(true);
    expect(at("2030-03-08")).toBe(false);
    expect(at("2035-03-09")).toBe(true);
    expect(at("2035-03-10")).toBe(false);
  });
});

describe("StoredWorkspaceSchema", () => {
  it("accepts a valid workspace", () => {
    expect(StoredWorkspaceSchema.safeParse(makeWorkspace()).success).toBe(true);
  });

  it("loads plans saved before vendor budget links and planner-added flags existed", () => {
    const plan = makePlan();
    const vendors = plan.vendors.map((vendor) => ({ ...vendor, budgetCategory: undefined }));
    const legacy: unknown = JSON.parse(
      JSON.stringify({ ...makeWorkspace(), plan: { ...plan, vendors } }),
    );
    const parsed = StoredWorkspaceSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.plan.vendors[0]).not.toHaveProperty("budgetCategory");
    expect(parsed.data?.plan.budget[0]).not.toHaveProperty("addedByUser");
  });

  it("keeps the planner-added flag and rejects a non-boolean one", () => {
    const plan = makePlan();
    const flagged = (addedByUser: unknown) =>
      StoredWorkspaceSchema.safeParse({
        ...makeWorkspace(),
        plan: { ...plan, budget: plan.budget.map((line) => ({ ...line, addedByUser })) },
      });
    expect(flagged(true).data?.plan.budget[0]?.addedByUser).toBe(true);
    expect(flagged("yes").success).toBe(false);
  });

  it("accepts a stored previousPlan", () => {
    expect(
      StoredWorkspaceSchema.safeParse(makeWorkspace({ previousPlan: makePlan() })).success,
    ).toBe(true);
  });

  it("accepts only the current version", () => {
    const at = (version: number) =>
      StoredWorkspaceSchema.safeParse({ ...makeWorkspace(), version }).success;
    expect(at(WORKSPACE_VERSION)).toBe(true);
    expect(at(WORKSPACE_VERSION - 1)).toBe(false);
    expect(at(WORKSPACE_VERSION + 1)).toBe(false);
  });

  it("keys storage by the same version", () => {
    expect(STORAGE_KEY).toBe(`eventcraft.plan.v${String(WORKSPACE_VERSION)}`);
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
