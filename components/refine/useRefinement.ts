import { useRef, useState, type RefObject } from "react";

import { describeDiff } from "@/components/refine/describeDiff";
import { requestRefinement } from "@/lib/client";
import { diffPlans } from "@/lib/plan";
import type { Plan, StoredWorkspace } from "@/lib/schema";
import { workspaceStore } from "@/lib/workspaceStore";

export type RefinePanelProps = {
  workspace: StoredWorkspace;
  onApply: (plan: Plan) => void;
  onUndo: () => void;
};

export type StatusMessage = { tone: "success" | "error"; text: string };

const MIN_INSTRUCTION = 3;
const STALE_MESSAGE = "The plan changed while refining. Try again.";

const currentSavedAt = (): string | undefined => workspaceStore.getSnapshot().workspace?.savedAt;

export type Refinement = {
  instruction: string;
  setInstruction: (value: string) => void;
  busy: boolean;
  fieldError: string | null;
  status: StatusMessage | null;
  statusRef: RefObject<HTMLDivElement | null>;
  submit: () => Promise<void>;
  undo: () => void;
};

export const useRefinement = ({ workspace, onApply, onUndo }: RefinePanelProps): Refinement => {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const submit = async (): Promise<void> => {
    if (busy) return;
    const trimmed = instruction.trim();
    if (trimmed.length < MIN_INSTRUCTION) {
      setFieldError("Describe the change you want in a few words.");
      return;
    }
    const startedAt = workspace.savedAt;
    setBusy(true);
    setFieldError(null);
    setStatus(null);
    const result = await requestRefinement({
      intake: workspace.intake,
      plan: workspace.plan,
      instruction: trimmed,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus({ tone: "error", text: result.message });
      return;
    }
    if (currentSavedAt() !== startedAt) {
      setStatus({ tone: "error", text: STALE_MESSAGE });
      return;
    }
    setStatus({ tone: "success", text: describeDiff(diffPlans(workspace.plan, result.value)) });
    setInstruction("");
    onApply(result.value);
  };

  const undo = (): void => {
    if (busy) return;
    onUndo();
    setStatus({ tone: "success", text: "Refinement undone." });
    statusRef.current?.focus();
  };

  return { instruction, setInstruction, busy, fieldError, status, statusRef, submit, undo };
};
