import { describe, expect, it } from "vitest";

import { createWorkspace, createWorkspaceReducer, workspaceReducer } from "@/lib/workspace";

import { makeIntake, makePlan, makeWorkspace } from "./fixtures";

const STAMP = "2031-02-03T04:05:06.000Z";
const reducer = createWorkspaceReducer(() => STAMP);

describe("createWorkspace", () => {
  it("builds a version 1 workspace with no previous plan", () => {
    const intake = makeIntake();
    const plan = makePlan();
    expect(createWorkspace(intake, plan, () => STAMP)).toEqual({
      version: 1,
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
