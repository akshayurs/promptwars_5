import { describe, expect, it } from "vitest";

import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";
import { createWorkspace, createWorkspaceReducer, workspaceReducer } from "@/lib/workspace";

import { makeIntake, makePlan, makeWorkspace } from "./fixtures";

const STAMP = "2031-02-03T04:05:06.000Z";
const reducer = createWorkspaceReducer(() => STAMP);

describe("createWorkspace", () => {
  it("builds a version 2 workspace with no previous plan", () => {
    const intake = makeIntake();
    const plan = makePlan();
    expect(createWorkspace(intake, plan, () => STAMP)).toEqual({
      version: 2,
      intake,
      plan,
      previousPlan: null,
      savedAt: STAMP,
    });
  });

  it("defaults the clock to the current time", () => {
    const ws = createWorkspace(makeIntake(), makePlan());
    expect(Number.isNaN(Date.parse(ws.savedAt))).toBe(false);
  });
});

describe("workspace reducer", () => {
  it("returns null for every non-replace action on null state", () => {
    const plan = makePlan();
    expect(reducer(null, { type: "setAmount", id: "x", amount: 1 })).toBeNull();
    expect(reducer(null, { type: "toggleVendor", id: "x" })).toBeNull();
    expect(reducer(null, { type: "applyPlan", plan })).toBeNull();
    expect(reducer(null, { type: "undo" })).toBeNull();
  });

  it("replace swaps the state, including to null", () => {
    const ws = makeWorkspace();
    expect(reducer(null, { type: "replace", workspace: ws })).toBe(ws);
    expect(reducer(ws, { type: "replace", workspace: null })).toBeNull();
  });

  it("setAmount updates the line, stamps savedAt and keeps previousPlan", () => {
    const ws = makeWorkspace({ previousPlan: makePlan() });
    const snapshot = structuredClone(ws);
    const id = ws.plan.budget[0]!.id;
    const next = reducer(ws, { type: "setAmount", id, amount: 7 });
    expect(next?.plan.budget[0]?.amount).toBe(7);
    expect(next?.savedAt).toBe(STAMP);
    expect(next?.previousPlan).toBe(ws.previousPlan);
    expect(ws).toEqual(snapshot);
  });

  it("toggleVendor flips booked", () => {
    const ws = makeWorkspace();
    const next = reducer(ws, { type: "toggleVendor", id: ws.plan.vendors[0]!.id });
    expect(next?.plan.vendors[0]?.booked).toBe(true);
    expect(ws.plan.vendors[0]?.booked).toBe(false);
  });

  it("applyPlan stores the old plan as previousPlan", () => {
    const ws = makeWorkspace();
    const plan = makePlan();
    const next = reducer(ws, { type: "applyPlan", plan });
    expect(next?.plan).toBe(plan);
    expect(next?.previousPlan).toBe(ws.plan);
  });

  it("undo restores previousPlan and clears it", () => {
    const previous = makePlan();
    const ws = makeWorkspace({ previousPlan: previous });
    const next = reducer(ws, { type: "undo" });
    expect(next?.plan).toBe(previous);
    expect(next?.previousPlan).toBeNull();
    expect(next?.savedAt).toBe(STAMP);
  });

  it("undo without a previousPlan returns the same state reference", () => {
    const ws = makeWorkspace();
    expect(reducer(ws, { type: "undo" })).toBe(ws);
  });

  it("the default reducer stamps a real ISO time", () => {
    const ws = makeWorkspace();
    const next = workspaceReducer(ws, { type: "toggleVendor", id: ws.plan.vendors[0]!.id });
    expect(next?.savedAt).not.toBe(ws.savedAt);
    expect(next?.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

const newLine = (index = 0): BudgetLine => ({
  id: crypto.randomUUID(),
  category: `Extra ${index}`,
  amount: 1_000,
  rationale: "Added by you",
});

const linesOf = (count: number): BudgetLine[] =>
  Array.from({ length: count }, (_, index) => newLine(index));

describe("workspace reducer: budget lines", () => {
  it("addLine appends the line and stamps savedAt", () => {
    const ws = makeWorkspace();
    const line = newLine();
    const next = reducer(ws, { type: "addLine", line });
    expect(next?.plan.budget).toHaveLength(ws.plan.budget.length + 1);
    expect(next?.plan.budget.at(-1)).toBe(line);
    expect(next?.savedAt).toBe(STAMP);
    expect(ws.plan.budget).toHaveLength(3);
  });

  it("addLine at the maximum returns a new plan with the same lines", () => {
    const budget = linesOf(LIMITS.budgetLines.max);
    const ws = makeWorkspace({ plan: makePlan({ budget }) });
    const next = reducer(ws, { type: "addLine", line: newLine(99) });
    expect(next).not.toBe(ws);
    expect(next?.plan.budget).toEqual(budget);
    expect(next?.plan.budget).not.toBe(budget);
  });

  it("removeLine removes the matching line", () => {
    const budget = linesOf(LIMITS.budgetLines.min + 1);
    const ws = makeWorkspace({ plan: makePlan({ budget }) });
    const next = reducer(ws, { type: "removeLine", id: budget[0]!.id });
    expect(next?.plan.budget).toEqual(budget.slice(1));
    expect(next?.savedAt).toBe(STAMP);
    expect(ws.plan.budget).toHaveLength(LIMITS.budgetLines.min + 1);
  });

  it("removeLine at the minimum keeps every line", () => {
    const ws = makeWorkspace();
    expect(ws.plan.budget).toHaveLength(LIMITS.budgetLines.min);
    const next = reducer(ws, { type: "removeLine", id: ws.plan.budget[0]!.id });
    expect(next?.plan.budget).toEqual(ws.plan.budget);
  });

  it("removeLine with an unknown id keeps every line", () => {
    const budget = linesOf(LIMITS.budgetLines.min + 1);
    const ws = makeWorkspace({ plan: makePlan({ budget }) });
    expect(reducer(ws, { type: "removeLine", id: "missing" })?.plan.budget).toEqual(budget);
  });

  it("budget line actions on null state return null", () => {
    expect(reducer(null, { type: "addLine", line: newLine() })).toBeNull();
    expect(reducer(null, { type: "removeLine", id: "x" })).toBeNull();
    expect(reducer(null, { type: "setTotalBudget", amount: 10 })).toBeNull();
  });
});

describe("workspace reducer: setTotalBudget", () => {
  it("updates intake.totalBudget and stamps savedAt without touching the plan", () => {
    const ws = makeWorkspace();
    const next = reducer(ws, { type: "setTotalBudget", amount: 750_000 });
    expect(next?.intake.totalBudget).toBe(750_000);
    expect(next?.intake.eventName).toBe(ws.intake.eventName);
    expect(next?.plan).toBe(ws.plan);
    expect(next?.savedAt).toBe(STAMP);
    expect(ws.intake.totalBudget).toBe(500_000);
  });

  it("accepts the maximum budget exactly", () => {
    const next = reducer(makeWorkspace(), { type: "setTotalBudget", amount: LIMITS.maxBudget });
    expect(next?.intake.totalBudget).toBe(LIMITS.maxBudget);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, LIMITS.maxBudget + 1])(
    "rejects %s with the same state reference",
    (amount) => {
      const ws = makeWorkspace();
      expect(reducer(ws, { type: "setTotalBudget", amount })).toBe(ws);
    },
  );
});
