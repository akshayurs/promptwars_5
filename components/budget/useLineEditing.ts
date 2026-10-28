"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { LIMITS } from "@/lib/constants";
import type { BudgetLine } from "@/lib/schema";

import { amountInputId, type AddLine, type RemoveControl, type RemoveLine } from "./types";

type LineEditing = {
  remove: RemoveControl | null;
  addButtonRef: RefObject<HTMLButtonElement | null>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  handleAdd: AddLine;
  /** Polite status text confirming the last removal. */
  announcement: string;
};

// Keeps keyboard focus on a stable control after rows are added or removed, and confirms removals.
export const useLineEditing = (
  lines: readonly BudgetLine[],
  onAddLine: AddLine | undefined,
  onRemoveLine: RemoveLine | undefined,
): LineEditing => {
  const reasonId = useId();
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const pendingFocusId = useRef<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const id = pendingFocusId.current;
    if (id === null || !lines.some((line) => line.id === id)) return;
    pendingFocusId.current = null;
    document.getElementById(amountInputId(id))?.focus();
  }, [lines]);

  const handleRemove = (line: BudgetLine): void => {
    (addButtonRef.current ?? headingRef.current)?.focus();
    onRemoveLine?.(line.id);
    setAnnouncement(`Removed ${line.category}.`);
  };
  const handleAdd = (line: BudgetLine): void => {
    pendingFocusId.current = line.id;
    onAddLine?.(line);
  };
  const remove = onRemoveLine
    ? { onRemove: handleRemove, disabled: lines.length <= LIMITS.budgetLines.min, reasonId }
    : null;
  return { remove, addButtonRef, headingRef, handleAdd, announcement };
};
