"use client";

import { useEffect, useId, useRef, useState, type ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/Icons";

export const ResetControl = ({ onReset }: { onReset: () => void }): ReactElement => {
  const [confirming, setConfirming] = useState(false);
  const questionId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  const startOverRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) {
      keepRef.current?.focus();
    } else if (wasConfirming.current) {
      startOverRef.current?.focus();
    }
    wasConfirming.current = confirming;
  }, [confirming]);

  if (!confirming) {
    return (
      <Button
        ref={startOverRef}
        variant="danger"
        onClick={() => {
          setConfirming(true);
        }}
      >
        <TrashIcon />
        Start over
      </Button>
    );
  }
  return (
    <span
      role="group"
      aria-labelledby={questionId}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/35 bg-danger-soft py-1.5 pr-1.5 pl-3 text-sm font-medium text-danger"
    >
      <span id={questionId}>Delete this plan from the browser?</span>
      <Button variant="danger" onClick={onReset}>
        Yes, delete
      </Button>
      <Button
        ref={keepRef}
        variant="secondary"
        onClick={() => {
          setConfirming(false);
        }}
      >
        Keep it
      </Button>
    </span>
  );
};
