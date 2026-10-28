import { useEffect, useId, useRef, type RefObject } from "react";

import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

import { amountInputId, type AddLine, type RemoveControl, type RemoveLine } from "./types";

type LineEditing = {
  remove: RemoveControl | null;
  addButtonRef: RefObject<HTMLButtonElement | null>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  handleAdd: AddLine;
};

// Keeps keyboard focus on a stable control after rows are added or removed.
export const useLineEditing = (
  lines: readonly BudgetLine[],
  onAddLine: AddLine | undefined,
  onRemoveLine: RemoveLine | undefined,
): LineEditing => {
  const reasonId = useId();
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const pendingFocusId = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingFocusId.current;
    if (id === null || !lines.some((line) => line.id === id)) return;
    pendingFocusId.current = null;
    document.getElementById(amountInputId(id))?.focus();
  }, [lines]);

  const handleRemove = (id: string): void => {
    (addButtonRef.current ?? headingRef.current)?.focus();
    onRemoveLine?.(id);
  };
  const handleAdd = (line: BudgetLine): void => {
    pendingFocusId.current = line.id;
    onAddLine?.(line);
  };
  const remove = onRemoveLine
    ? { onRemove: handleRemove, disabled: lines.length <= LIMITS.budgetLines.min, reasonId }
    : null;
  return { remove, addButtonRef, headingRef, handleAdd };
};
