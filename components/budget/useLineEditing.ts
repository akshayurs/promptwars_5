"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";

import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

import type { AddLine, RegisterAmount, RemoveControl, RemoveLine } from "./types";

type Removal = { line: BudgetLine; index: number };

type LineEditing = {
  remove: RemoveControl | null;
  addButtonRef: RefObject<HTMLButtonElement | null>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  handleAdd: AddLine;
  registerAmount: RegisterAmount;
  /** Status text confirming the last removal or restore. */
  announcement: string;
  /** Restores the last removed line at its position; null when there is nothing to undo. */
  undo: { category: string; run: () => void } | null;
};

// Focuses a row's amount input once the row with that id has rendered.
const useAmountFocus = (
  lines: readonly BudgetLine[],
): { registerAmount: RegisterAmount; focusWhenShown: (id: string) => void } => {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const pendingId = useRef<string | null>(null);
  useEffect(() => {
    const input = inputs.current.get(pendingId.current ?? "");
    if (input) {
      pendingId.current = null;
      input.focus();
    }
  }, [lines]);
  const registerAmount = useCallback<RegisterAmount>(
    (lineId) => (input) => {
      inputs.current.set(lineId, input);
      return () => {
        inputs.current.delete(lineId);
      };
    },
    [],
  );
  const focusWhenShown = useCallback((id: string) => {
    pendingId.current = id;
  }, []);
  return { registerAmount, focusWhenShown };
};

// Keeps keyboard focus on a stable control after rows are added, removed or restored.
export const useLineEditing = (
  lines: readonly BudgetLine[],
  onAddLine: AddLine | undefined,
  onRemoveLine: RemoveLine | undefined,
): LineEditing => {
  const reasonId = useId();
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const { registerAmount, focusWhenShown } = useAmountFocus(lines);

  const handleRemove = useCallback(
    (line: BudgetLine, index: number): void => {
      (addButtonRef.current ?? headingRef.current)?.focus();
      onRemoveLine?.(line.id);
      setRemoval({ line, index });
      setAnnouncement(`Removed ${line.category}.`);
    },
    [onRemoveLine],
  );
  const handleAdd: AddLine = (line, index) => {
    focusWhenShown(line.id);
    onAddLine?.(line, index);
  };
  const disabled = lines.length <= LIMITS.budgetLines.min;
  const remove = useMemo(
    () => (onRemoveLine ? { onRemove: handleRemove, disabled, reasonId } : null),
    [onRemoveLine, handleRemove, disabled, reasonId],
  );
  const undo =
    removal && onAddLine
      ? {
          category: removal.line.category,
          run: () => {
            handleAdd(removal.line, removal.index);
            setRemoval(null);
            setAnnouncement(`Restored ${removal.line.category}.`);
          },
        }
      : null;
  return { remove, addButtonRef, headingRef, handleAdd, registerAmount, announcement, undo };
};
