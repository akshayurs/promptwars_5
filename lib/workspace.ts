import { toggleVendor, updateLineAmount } from "@/lib/budget";
import type { Intake, Plan, StoredWorkspace } from "@/lib/schema";

export type WorkspaceState = StoredWorkspace | null;

export type WorkspaceAction =
  | { type: "replace"; workspace: WorkspaceState }
  | { type: "setAmount"; id: string; amount: number }
  | { type: "toggleVendor"; id: string }
  | { type: "applyPlan"; plan: Plan }
  | { type: "undo" };

type Clock = () => string;

const isoNow: Clock = () => new Date().toISOString();

export const createWorkspace = (
  intake: Intake,
  plan: Plan,
  now: Clock = isoNow,
): StoredWorkspace => ({
  version: 1,
  intake,
  plan,
  previousPlan: null,
  savedAt: now(),
});

const touch = (
  workspace: StoredWorkspace,
  patch: { plan: Plan; previousPlan?: Plan | null },
  now: Clock,
): StoredWorkspace => ({
  ...workspace,
  plan: patch.plan,
  previousPlan: patch.previousPlan === undefined ? workspace.previousPlan : patch.previousPlan,
  savedAt: now(),
});

export const createWorkspaceReducer =
  (now: Clock = isoNow) =>
  (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
    if (action.type === "replace") return action.workspace;
    if (state === null) return state;
    switch (action.type) {
      case "setAmount":
        return touch(
          state,
          {
            plan: {
              ...state.plan,
              budget: updateLineAmount(state.plan.budget, action.id, action.amount),
            },
          },
          now,
        );
      case "toggleVendor":
        return touch(
          state,
          { plan: { ...state.plan, vendors: toggleVendor(state.plan.vendors, action.id) } },
          now,
        );
      case "applyPlan":
        return touch(state, { plan: action.plan, previousPlan: state.plan }, now);
      case "undo":
        return state.previousPlan
          ? touch(state, { plan: state.previousPlan, previousPlan: null }, now)
          : state;
    }
  };

export const workspaceReducer = createWorkspaceReducer();
