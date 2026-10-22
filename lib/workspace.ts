import {
  addBudgetLine,
  removeBudgetLine,
  toggleMilestone,
  toggleVendor,
  updateLineAmount,
} from "@/lib/budget";
import { LIMITS } from "@/lib/constants";
import type { BudgetLine, Intake, Plan, StoredWorkspace } from "@/lib/schema";

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
  | { type: "undo" };

type Clock = () => string;

const isoNow: Clock = () => new Date().toISOString();

export const createWorkspace = (
  intake: Intake,
  plan: Plan,
  now: Clock = isoNow,
): StoredWorkspace => ({
  version: 2,
  intake,
  plan,
  previousPlan: null,
  savedAt: now(),
});

type Patch = Partial<Pick<StoredWorkspace, "plan" | "previousPlan" | "intake">>;

const touch = (workspace: StoredWorkspace, patch: Patch, now: Clock): StoredWorkspace => ({
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
    case "setAmount":
      return { ...plan, budget: updateLineAmount(plan.budget, action.id, action.amount) };
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

const isValidTotal = (amount: number): boolean =>
  Number.isFinite(amount) && amount > 0 && amount <= LIMITS.maxBudget;

export const createWorkspaceReducer =
  (now: Clock = isoNow) =>
  (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
    if (action.type === "replace") return action.workspace;
    if (state === null) return state;
    if (action.type === "applyPlan") {
      return touch(state, { plan: action.plan, previousPlan: state.plan }, now);
    }
    if (action.type === "undo") {
      return state.previousPlan
        ? touch(state, { plan: state.previousPlan, previousPlan: null }, now)
        : state;
    }
    if (action.type === "setTotalBudget") {
      return isValidTotal(action.amount)
        ? touch(state, { intake: { ...state.intake, totalBudget: action.amount } }, now)
        : state;
    }
    return touch(state, { plan: editPlan(state.plan, action) }, now);
  };

export const workspaceReducer = createWorkspaceReducer();
