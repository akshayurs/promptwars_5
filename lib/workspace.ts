import { addBudgetLine, isValidTotal, removeBudgetLine, updateLineAmount } from "@/lib/budget";
import { WORKSPACE_VERSION } from "@/lib/constants";
import { toggleMilestone } from "@/lib/milestones";
import type { BudgetLine, Intake, Plan, StoredWorkspace } from "@/lib/schema";
import { toggleVendor } from "@/lib/vendors";

export type WorkspaceState = StoredWorkspace | null;

export type WorkspaceAction =
  | { type: "replace"; workspace: WorkspaceState }
  | { type: "setAmount"; id: string; amount: number }
  | { type: "addLine"; line: BudgetLine }
  | { type: "removeLine"; id: string }
  | { type: "setTotalBudget"; amount: number }
  | { type: "toggleVendor"; id: string }
  | { type: "toggleMilestone"; id: string }
  | { type: "applyPlan"; plan: Plan }
  | { type: "updateIntake"; intake: Intake; plan: Plan }
  | { type: "undo" };

/** Source of the current time as an ISO 8601 timestamp, used to stamp `savedAt`. */
type IsoClock = () => string;

const isoNow: IsoClock = () => new Date().toISOString();

/** A freshly generated workspace with nothing to undo. */
export const createWorkspace = (
  intake: Intake,
  plan: Plan,
  now: IsoClock = isoNow,
): StoredWorkspace => ({
  version: WORKSPACE_VERSION,
  intake,
  plan,
  previousPlan: null,
  savedAt: now(),
});

type Patch = Partial<Pick<StoredWorkspace, "plan" | "previousPlan" | "intake">>;

const touch = (workspace: StoredWorkspace, patch: Patch, now: IsoClock): StoredWorkspace => ({
  ...workspace,
  ...patch,
  savedAt: now(),
});

type PlanEdit = Extract<
  WorkspaceAction,
  { type: "setAmount" | "addLine" | "removeLine" | "toggleVendor" | "toggleMilestone" }
>;

const editPlan = (plan: Plan, action: PlanEdit): Plan => {
  switch (action.type) {
    case "setAmount": {
      const budget = updateLineAmount(plan.budget, action.id, action.amount);
      return budget === plan.budget ? plan : { ...plan, budget };
    }
    case "addLine":
      return { ...plan, budget: addBudgetLine(plan.budget, action.line) };
    case "removeLine":
      return { ...plan, budget: removeBudgetLine(plan.budget, action.id) };
    case "toggleVendor":
      return { ...plan, vendors: toggleVendor(plan.vendors, action.id) };
    case "toggleMilestone":
      return { ...plan, timeline: toggleMilestone(plan.timeline, action.id) };
  }
};

const setTotalBudget = (state: StoredWorkspace, amount: number, now: IsoClock): StoredWorkspace =>
  isValidTotal(amount) && amount !== state.intake.totalBudget
    ? touch(state, { intake: { ...state.intake, totalBudget: amount } }, now)
    : state;

const undo = (state: StoredWorkspace, now: IsoClock): StoredWorkspace =>
  state.previousPlan ? touch(state, { plan: state.previousPlan, previousPlan: null }, now) : state;

const edit = (state: StoredWorkspace, action: PlanEdit, now: IsoClock): StoredWorkspace => {
  const plan = editPlan(state.plan, action);
  return plan === state.plan ? state : touch(state, { plan }, now);
};

/**
 * Pure workspace reducer. Actions that change nothing (an invalid or unchanged total, an
 * unchanged amount, undo with no history) return the same state object, so callers can skip work.
 */
export const createWorkspaceReducer =
  (now: IsoClock = isoNow) =>
  (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
    if (action.type === "replace") return action.workspace;
    if (state === null) return state;
    switch (action.type) {
      case "applyPlan":
        return touch(state, { plan: action.plan, previousPlan: state.plan }, now);
      case "updateIntake":
        // The old plan was fitted to the old details, so it is not offered for undo.
        return touch(state, { intake: action.intake, plan: action.plan, previousPlan: null }, now);
      case "undo":
        return undo(state, now);
      case "setTotalBudget":
        return setTotalBudget(state, action.amount, now);
      case "setAmount":
      case "addLine":
      case "removeLine":
      case "toggleVendor":
      case "toggleMilestone":
        return edit(state, action, now);
    }
  };

export const workspaceReducer = createWorkspaceReducer();
