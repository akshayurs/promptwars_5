import { describe, expect, it, vi } from "vitest";

import { createPlanFlow, editPlanFlow } from "@/components/intake/intakeFlows";
import type { requestPlan, requestRefinement } from "@/lib/client";
import { WORKSPACE_VERSION } from "@/lib/constants";
import { buildAdaptRequest } from "@/lib/intakeEdit";
import type { WorkspaceAction } from "@/lib/workspace";
import type { WorkspaceSnapshot } from "@/lib/workspaceStore";

import { makeIntake, makePlan, makeWorkspace } from "./fixtures";

const fakeStore = (
  snapshot: Omit<Extract<WorkspaceSnapshot, { status: "ready" }>, "saveFailed">,
) => ({
  dispatch: vi.fn<(action: WorkspaceAction) => void>(),
  getSnapshot: (): WorkspaceSnapshot => ({ ...snapshot, saveFailed: false }),
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
    expect(createPlanFlow({ store }).save(intake, plan)).toBe(true);
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
    const flow = editPlanFlow(makeWorkspace({ plan: current }), { requestRefinement: refine });
    const intake = makeIntake({ guestCount: 12 });
    const { signal } = new AbortController();
    await expect(flow.send(intake, signal)).resolves.toEqual({ ok: true, value: adapted });
    expect(refine).toHaveBeenCalledExactlyOnceWith(buildAdaptRequest(intake, current), signal);
  });

  it("saves the edited intake with the adapted plan and never asks to replace", () => {
    const workspace = makeWorkspace();
    const store = fakeStore({ status: "ready", workspace });
    const flow = editPlanFlow(workspace, { store });
    const intake = makeIntake();
    const plan = makePlan();
    expect(flow.save(intake, plan)).toBe(true);
    expect(store.dispatch).toHaveBeenCalledExactlyOnceWith({ type: "updateIntake", intake, plan });
    expect(flow.replaces()).toBeNull();
  });

  it.each([
    ["was edited", makeWorkspace({ savedAt: "2031-01-01T00:00:00.000Z" })],
    ["was deleted", null],
  ])("saves nothing when the stored plan %s while the request ran", (_label, stored) => {
    const store = fakeStore({ status: "ready", workspace: stored });
    const flow = editPlanFlow(makeWorkspace(), { store });
    expect(flow.save(makeIntake(), makePlan())).toBe(false);
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("uses edit wording that differs from new-plan wording", () => {
    const edit = editPlanFlow(makeWorkspace()).copy;
    const create = createPlanFlow().copy;
    expect(edit.submit).toBe("Update plan");
    expect(create.submit).toBe("Generate plan");
    expect(edit.cancelled).not.toBe(create.cancelled);
  });
});
