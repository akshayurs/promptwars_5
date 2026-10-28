import { describe, expect, it, vi } from "vitest";

import { createPlanFlow, editPlanFlow } from "@/components/intake/intakeFlows";
import type { requestPlan, requestRefinement } from "@/lib/client";
import { WORKSPACE_VERSION } from "@/lib/constants";
import { buildAdaptRequest } from "@/lib/intakeEdit";
import type { WorkspaceAction } from "@/lib/workspace";
import type { WorkspaceSnapshot } from "@/lib/workspaceStore";

import { makeIntake, makePlan, makeWorkspace } from "./fixtures";

const fakeStore = (snapshot: WorkspaceSnapshot) => ({
  dispatch: vi.fn<(action: WorkspaceAction) => void>(),
  getSnapshot: () => snapshot,
});

describe("createPlanFlow", () => {
  it("requests a plan for the intake with the caller's signal", async () => {
    const plan = makePlan();
    const send = vi.fn<typeof requestPlan>().mockResolvedValue({ ok: true, value: plan });
    const flow = createPlanFlow({ requestPlan: send });
    const intake = makeIntake();
    const { signal } = new AbortController();
    await expect(flow.send(intake, signal)).resolves.toEqual({ ok: true, value: plan });
    expect(send).toHaveBeenCalledExactlyOnceWith(intake, signal);
  });

  it("saves a fresh workspace in place of the stored one", () => {
    const store = fakeStore({ status: "ready", workspace: null });
    const intake = makeIntake();
    const plan = makePlan();
    createPlanFlow({ store }).save(intake, plan);
    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.dispatch.mock.calls[0]?.[0]).toMatchObject({
      type: "replace",
      workspace: { version: WORKSPACE_VERSION, intake, plan, previousPlan: null },
    });
  });

  it("names the saved plan it would replace, and nothing when none is saved", () => {
    const workspace = makeWorkspace();
    const saved = fakeStore({ status: "ready", workspace });
    const empty = fakeStore({ status: "ready", workspace: null });
    expect(createPlanFlow({ store: saved }).replaces()).toBe(workspace.intake.eventName);
    expect(createPlanFlow({ store: empty }).replaces()).toBeNull();
  });
});

describe("editPlanFlow", () => {
  it("sends the edited intake with the current plan as an adapt request", async () => {
    const current = makePlan();
    const adapted = makePlan({ summary: "Adapted." });
    const refine = vi
      .fn<typeof requestRefinement>()
      .mockResolvedValue({ ok: true, value: adapted });
    const flow = editPlanFlow(current, { requestRefinement: refine });
    const intake = makeIntake({ guestCount: 12 });
    const { signal } = new AbortController();
    await expect(flow.send(intake, signal)).resolves.toEqual({ ok: true, value: adapted });
    expect(refine).toHaveBeenCalledExactlyOnceWith(buildAdaptRequest(intake, current), signal);
  });

  it("saves the edited intake with the adapted plan and never asks to replace", () => {
    const store = fakeStore({ status: "ready", workspace: makeWorkspace() });
    const flow = editPlanFlow(makePlan(), { store });
    const intake = makeIntake();
    const plan = makePlan();
    flow.save(intake, plan);
    expect(store.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "updateIntake", intake, plan });
    expect(flow.replaces()).toBeNull();
  });

  it("uses edit wording that differs from new-plan wording", () => {
    const edit = editPlanFlow(makePlan()).copy;
    const create = createPlanFlow().copy;
    expect(edit.submit).toBe("Update plan");
    expect(create.submit).toBe("Generate plan");
    expect(edit.cancelled).not.toBe(create.cancelled);
  });
});
