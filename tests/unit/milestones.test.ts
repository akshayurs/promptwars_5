import { describe, expect, it } from "vitest";

import {
  compareMilestones,
  groupMilestonesByPhase,
  milestoneProgress,
  nextMilestone,
  toggleMilestone,
} from "@/lib/milestones";
import type { Milestone } from "@/lib/schema";
import { createWorkspaceReducer } from "@/lib/workspace";

import { makePlan, makeWorkspace } from "./fixtures";

const milestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  ...makePlan().timeline[0]!,
  id: crypto.randomUUID(),
  ...overrides,
});

describe("toggleMilestone", () => {
  it("flips done for the matching milestone only, without mutation", () => {
    const timeline = [milestone({ done: false }), milestone({ done: true })];
    const snapshot = structuredClone(timeline);
    const toggled = toggleMilestone(timeline, timeline[0]!.id);
    expect(toggled.map((m) => m.done)).toEqual([true, true]);
    expect(toggleMilestone(toggled, timeline[1]!.id).map((m) => m.done)).toEqual([true, false]);
    expect(timeline).toEqual(snapshot);
    expect(toggled[1]).toBe(timeline[1]);
  });

  it("returns an equal copy for an unknown id", () => {
    const timeline = [milestone()];
    const result = toggleMilestone(timeline, "missing");
    expect(result).toEqual(timeline);
    expect(result).not.toBe(timeline);
  });
});

describe("milestoneProgress", () => {
  it("returns zeros for an empty list", () => {
    expect(milestoneProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it("counts completed milestones", () => {
    const timeline = [milestone({ done: true }), milestone(), milestone(), milestone()];
    expect(milestoneProgress(timeline)).toEqual({ done: 1, total: 4, ratio: 0.25 });
  });

  it("reports a ratio of 1 when all are done", () => {
    expect(milestoneProgress([milestone({ done: true })]).ratio).toBe(1);
  });
});

describe("nextMilestone", () => {
  it("returns the open milestone with the largest daysBeforeEvent", () => {
    const timeline = [
      milestone({ title: "near", daysBeforeEvent: 5 }),
      milestone({ title: "far", daysBeforeEvent: 100 }),
      milestone({ title: "mid", daysBeforeEvent: 30 }),
    ];
    expect(nextMilestone(timeline)?.title).toBe("far");
  });

  it("skips completed milestones", () => {
    const timeline = [
      milestone({ title: "far", daysBeforeEvent: 100, done: true }),
      milestone({ title: "mid", daysBeforeEvent: 30 }),
    ];
    expect(nextMilestone(timeline)?.title).toBe("mid");
  });

  it("finds the earliest open milestone wherever it sits in the list", () => {
    const timeline = [
      milestone({ title: "done-far", daysBeforeEvent: 200, done: true }),
      milestone({ title: "near", daysBeforeEvent: 2 }),
      milestone({ title: "far", daysBeforeEvent: 60 }),
      milestone({ title: "mid", daysBeforeEvent: 20 }),
    ];
    expect(nextMilestone(timeline)?.title).toBe("far");
  });

  it("keeps input order for ties", () => {
    const timeline = [
      milestone({ title: "first", daysBeforeEvent: 10 }),
      milestone({ title: "second", daysBeforeEvent: 10 }),
    ];
    expect(nextMilestone(timeline)?.title).toBe("first");
  });

  it("returns null when everything is done or the list is empty", () => {
    expect(nextMilestone([milestone({ done: true })])).toBeNull();
    expect(nextMilestone([])).toBeNull();
  });

  it("does not mutate the input order", () => {
    const timeline = [milestone({ daysBeforeEvent: 1 }), milestone({ daysBeforeEvent: 9 })];
    const ids = timeline.map((m) => m.id);
    nextMilestone(timeline);
    expect(timeline.map((m) => m.id)).toEqual(ids);
  });
});

describe("groupMilestonesByPhase", () => {
  it("orders phases canonically, sorts by days descending and drops empty phases", () => {
    const groups = groupMilestonesByPhase([
      milestone({ phase: "booking", daysBeforeEvent: 10, title: "b-small" }),
      milestone({ phase: "event-day", daysBeforeEvent: 0, title: "day" }),
      milestone({ phase: "booking", daysBeforeEvent: 100, title: "b-big" }),
    ]);
    expect(groups.map((g) => g.phase)).toEqual(["booking", "event-day"]);
    expect(groups[0]?.milestones.map((m) => m.title)).toEqual(["b-big", "b-small"]);
  });

  it("returns an empty array for an empty timeline", () => {
    expect(groupMilestonesByPhase([])).toEqual([]);
  });
});

describe("compareMilestones", () => {
  it("orders by canonical phase before days", () => {
    const planning = { phase: "planning", daysBeforeEvent: 1 } as const;
    const booking = { phase: "booking", daysBeforeEvent: 300 } as const;
    expect(compareMilestones(planning, booking)).toBeLessThan(0);
    expect(compareMilestones(booking, planning)).toBeGreaterThan(0);
  });

  it("puts the milestone with more days before the event first within a phase", () => {
    const early = { phase: "booking", daysBeforeEvent: 90 } as const;
    const late = { phase: "booking", daysBeforeEvent: 30 } as const;
    expect(compareMilestones(early, late)).toBeLessThan(0);
    expect(compareMilestones(late, early)).toBeGreaterThan(0);
    expect(compareMilestones(early, { ...early })).toBe(0);
  });
});

describe("workspace reducer toggleMilestone", () => {
  const STAMP = "2031-02-03T04:05:06.000Z";
  const reduce = createWorkspaceReducer(() => STAMP);

  it("flips done on the matching milestone and stamps savedAt", () => {
    const state = makeWorkspace();
    const target = state.plan.timeline[1]!;
    const next = reduce(state, { type: "toggleMilestone", id: target.id });
    expect(next?.plan.timeline.map((m) => m.done)).toEqual([false, true, false, false]);
    expect(next?.savedAt).toBe(STAMP);
    expect(next?.previousPlan).toBeNull();
    expect(state.plan.timeline[1]?.done).toBe(false);
  });

  it("toggles back to open", () => {
    const state = makeWorkspace();
    const id = state.plan.timeline[0]!.id;
    const once = reduce(state, { type: "toggleMilestone", id });
    const twice = reduce(once, { type: "toggleMilestone", id });
    expect(twice?.plan.timeline[0]?.done).toBe(false);
  });

  it("leaves other plan sections untouched", () => {
    const state = makeWorkspace();
    const next = reduce(state, { type: "toggleMilestone", id: state.plan.timeline[0]!.id });
    expect(next?.plan.vendors).toBe(state.plan.vendors);
    expect(next?.plan.budget).toBe(state.plan.budget);
  });

  it("returns null for a null state", () => {
    expect(reduce(null, { type: "toggleMilestone", id: "x" })).toBeNull();
  });
});
