import { describe, expect, it } from "vitest";

import { LIMITS } from "@/lib/constants";
import { buildAdaptRequest } from "@/lib/intakeEdit";
import { buildRefinePrompt } from "@/lib/prompts";
import { RefineRequestSchema } from "@/lib/schema";

import { makeIntake, makePlan } from "./fixtures";

describe("buildAdaptRequest", () => {
  it("pairs the edited intake with the current plan in a valid refine request", () => {
    const intake = makeIntake({ guestCount: 60, totalBudget: 120_000 });
    const plan = makePlan();
    const request = buildAdaptRequest(intake, plan);
    expect(request.intake).toBe(intake);
    expect(request.plan).toBe(plan);
    expect(RefineRequestSchema.safeParse(request).success).toBe(true);
  });

  it("asks for budget, timeline and vendors to follow the new details", () => {
    const { instruction } = buildAdaptRequest(makeIntake(), makePlan());
    expect(instruction.length).toBeLessThanOrEqual(LIMITS.longText);
    expect(instruction).toMatch(/total budget/);
    expect(instruction).toMatch(/event date/);
    expect(instruction).toMatch(/guest count/);
  });

  it("contains no markup that the prompt would have to escape", () => {
    const request = buildAdaptRequest(makeIntake(), makePlan());
    expect(request.instruction).not.toMatch(/[<>]/);
    expect(buildRefinePrompt(request, "2029-06-01").user).toContain(request.instruction);
  });
});
