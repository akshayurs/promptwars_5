"use client";

import { useId, useRef, useState, type RefObject } from "react";

import { describeDiff } from "@/components/refine/describeDiff";
import { usePendingRequest, type PendingRequest } from "@/components/usePendingRequest";
import { requestRefinement, type ApiResult } from "@/lib/client";
import { LIMITS } from "@/lib/constants";
import { diffPlans } from "@/lib/plan";
import type { Plan, StoredWorkspace } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

export type RefinementOptions = {
  workspace: StoredWorkspace;
  onApply: (plan: Plan) => void;
  onUndo: () => void;
};

type RefinementDeps = {
  requestRefinement: typeof requestRefinement;
  /** `savedAt` of the workspace as stored now, to detect edits made while refining. */
  savedAt: () => string | undefined;
};

const DEFAULT_DEPS: RefinementDeps = {
  requestRefinement,
  savedAt: () => workspaceStore.getSnapshot().workspace?.savedAt,
};

export type StatusMessage = { tone: "success" | "error"; text: string };

const TEXTS = {
  pending: "Asking Gemini to apply your change.",
  longWait: "Still refining your plan. This usually takes about half a minute.",
  cancelled: "Refinement cancelled.",
};
const TOO_SHORT = "Describe the change you want in a few words.";
const STALE_MESSAGE = "The plan changed while refining. Try again.";

const outcome = (result: ApiResult<Plan>, before: Plan, stale: boolean): StatusMessage => {
  if (!result.ok) return { tone: "error", text: result.message };
  if (stale) return { tone: "error", text: STALE_MESSAGE };
  return { tone: "success", text: describeDiff(diffPlans(before, result.value)) };
};

export type Refinement = {
  instruction: string;
  setInstruction: (value: string) => void;
  instructionId: string;
  fieldError: string | null;
  status: StatusMessage | null;
  statusRef: RefObject<HTMLDivElement | null>;
  request: Omit<PendingRequest, "begin" | "settle">;
  submit: () => Promise<void>;
  undo: () => void;
};

export const useRefinement = (
  { workspace, onApply, onUndo }: RefinementOptions,
  deps: RefinementDeps = DEFAULT_DEPS,
): Refinement => {
  const [instruction, setInstruction] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const instructionId = useId();
  const { begin, settle, ...request } = usePendingRequest(TEXTS);

  const submit = async (): Promise<void> => {
    if (request.busy) return;
    const trimmed = instruction.trim();
    if (trimmed.length < LIMITS.minInstructionChars) {
      setFieldError(TOO_SHORT);
      document.getElementById(instructionId)?.focus();
      return;
    }
    const { intake, plan, savedAt } = workspace;
    const signal = begin();
    setFieldError(null);
    setStatus(null);
    const result = await deps.requestRefinement({ intake, plan, instruction: trimmed }, signal);
    if (!settle(signal)) return;
    const stale = deps.savedAt() !== savedAt;
    setStatus(outcome(result, plan, stale));
    if (!result.ok || stale) return;
    setInstruction("");
    onApply(result.value);
  };

  const undo = (): void => {
    if (request.busy) return;
    onUndo();
    setStatus({ tone: "success", text: "Refinement undone." });
    statusRef.current?.focus();
  };

  const cancel = (): void => {
    request.cancel();
    statusRef.current?.focus();
  };

  const fields = { instruction, setInstruction, instructionId, fieldError, status, statusRef };
  return { ...fields, request: { ...request, cancel }, submit, undo };
};
