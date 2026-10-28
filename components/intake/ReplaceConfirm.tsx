"use client";

import { useEffect, useId, useRef, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";

type ReplaceConfirmProps = {
  name: string;
  onReplace: () => void;
  onKeep: () => void;
  /** What replaces the saved plan, starting the sentence ("Generating a new plan"). */
  action?: string;
  confirmLabel?: string;
};

/** Inline confirmation shown before a new or imported plan overwrites the saved one. */
export const ReplaceConfirm = ({
  name,
  onReplace,
  onKeep,
  action = "Generating a new plan",
  confirmLabel = "Replace and generate",
}: ReplaceConfirmProps): ReactElement => {
  const titleId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    groupRef.current?.focus();
  }, []);
  return (
    <div
      ref={groupRef}
      tabIndex={-1}
      role="group"
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border border-warning/35 bg-warning-soft p-4 text-sm wrap-anywhere text-ink"
    >
      <p id={titleId} className="font-semibold">
        Replace your current plan?
      </p>
      <p>
        {action} replaces “{name}”, the plan saved in this browser, including its budget edits,
        checked milestones and booked vendors.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onReplace}>{confirmLabel}</Button>
        <Button variant="secondary" onClick={onKeep}>
          Keep current plan
        </Button>
      </div>
    </div>
  );
};
