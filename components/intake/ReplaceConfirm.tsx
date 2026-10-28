"use client";

import { useEffect, useId, useRef, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";

type ReplaceConfirmProps = { name: string; onReplace: () => void; onKeep: () => void };

/** Inline confirmation shown before a new plan overwrites the one saved in this browser. */
export const ReplaceConfirm = ({ name, onReplace, onKeep }: ReplaceConfirmProps): ReactElement => {
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
      className="flex flex-col gap-3 rounded-xl border border-warning/35 bg-warning-soft p-4 text-sm text-ink"
    >
      <p id={titleId} className="font-semibold">
        Replace your current plan?
      </p>
      <p>
        Generating a new plan replaces “{name}”, the plan saved in this browser, including its
        budget edits, checked milestones and booked vendors.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onReplace}>Replace and generate</Button>
        <Button variant="secondary" onClick={onKeep}>
          Keep current plan
        </Button>
      </div>
    </div>
  );
};
