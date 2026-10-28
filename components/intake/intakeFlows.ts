import type { PendingTexts } from "@/components/usePendingRequest";
import { requestPlan, requestRefinement, type ApiResult } from "@/lib/client";
import { buildAdaptRequest } from "@/lib/intakeEdit";
import type { Intake, Plan } from "@/lib/schema";
import { createWorkspace } from "@/lib/workspace";
import { workspaceStore, type WorkspaceStore } from "@/lib/workspaceStore";

/** What submitting the intake form does: the request it sends and how the result is saved. */
export type IntakeFlow = {
  copy: PendingTexts & { submit: string; busy: string };
  send: (intake: Intake, signal: AbortSignal) => Promise<ApiResult<Plan>>;
  save: (intake: Intake, plan: Plan) => void;
  /** Name of the saved plan a submission would replace, or null when nothing is replaced. */
  replaces: () => string | null;
};

type FlowDeps = {
  store: Pick<WorkspaceStore, "dispatch" | "getSnapshot">;
  requestPlan: typeof requestPlan;
  requestRefinement: typeof requestRefinement;
};

const DEFAULT_DEPS: FlowDeps = { store: workspaceStore, requestPlan, requestRefinement };

const CREATE_COPY: IntakeFlow["copy"] = {
  submit: "Generate plan",
  busy: "Generating your plan…",
  pending: "Asking Gemini to draft budget, timeline, vendors and ideas.",
  longWait:
    "Still drafting your plan. Generation usually takes about half a minute; please keep this page open.",
  cancelled: "Plan generation cancelled. Your answers are still filled in.",
};

const EDIT_COPY: IntakeFlow["copy"] = {
  submit: "Update plan",
  busy: "Updating your plan…",
  pending: "Asking Gemini to adapt your plan to the new details.",
  longWait:
    "Still updating your plan. This usually takes about half a minute; please keep this page open.",
  cancelled: "Update cancelled. Your saved plan has not changed.",
};

/** Generates a fresh plan and replaces whatever workspace is saved. */
export const createPlanFlow = (overrides: Partial<FlowDeps> = {}): IntakeFlow => {
  const { store, requestPlan: send } = { ...DEFAULT_DEPS, ...overrides };
  return {
    copy: CREATE_COPY,
    send,
    save: (intake, plan) => {
      store.dispatch({ type: "replace", workspace: createWorkspace(intake, plan) });
    },
    replaces: () => store.getSnapshot().workspace?.intake.eventName ?? null,
  };
};

/** Adapts the current plan to edited event details through the refine endpoint. */
export const editPlanFlow = (plan: Plan, overrides: Partial<FlowDeps> = {}): IntakeFlow => {
  const { store, requestRefinement: refine } = { ...DEFAULT_DEPS, ...overrides };
  return {
    copy: EDIT_COPY,
    send: (intake, signal) => refine(buildAdaptRequest(intake, plan), signal),
    save: (intake, next) => {
      store.dispatch({ type: "updateIntake", intake, plan: next });
    },
    replaces: () => null,
  };
};
