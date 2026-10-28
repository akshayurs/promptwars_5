"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";

import { usePendingRequest, type PendingRequest } from "@/components/usePendingRequest";
import { INVALID_FIELDS_MESSAGE } from "@/lib/messages";
import { IntakeSchema, type Intake } from "@/lib/schema";
import type { FieldIssues } from "@/lib/types";

import { firstPathIssues } from "./fieldIssues";
import { STALE_EDIT_MESSAGE, type IntakeFlow } from "./intakeFlows";

type Submission = {
  issues: FieldIssues;
  message: string | null;
  alertRef: RefObject<HTMLDivElement | null>;
  request: Omit<PendingRequest, "begin" | "settle">;
  /** Name of the saved plan awaiting confirmation before it is replaced. */
  replacing: string | null;
  submit: (candidate: unknown, confirmed?: boolean) => void;
  keepCurrent: () => void;
};

const useFocusOnFailure = (failures: number): RefObject<HTMLDivElement | null> => {
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (failures > 0) {
      alertRef.current?.focus();
    }
  }, [failures]);
  return alertRef;
};

/** Validates the intake, confirms before replacing a saved plan, then sends and saves it. */
export const useIntakeSubmission = (flow: IntakeFlow): Submission => {
  const router = useRouter();
  const [issues, setIssues] = useState<FieldIssues>({});
  const [message, setMessage] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [replacing, setReplacing] = useState<string | null>(null);
  const alertRef = useFocusOnFailure(failures);
  const { begin, settle, ...request } = usePendingRequest(flow.copy);

  const fail = (text: string, fieldIssues: FieldIssues): void => {
    setIssues(fieldIssues);
    setMessage(text);
    setFailures((count) => count + 1);
  };

  const send = async (intake: Intake): Promise<void> => {
    const signal = begin();
    const result = await flow.send(intake, signal);
    if (!settle(signal)) {
      return;
    }
    if (!result.ok) {
      fail(result.message, result.issues);
      return;
    }
    if (!flow.save(intake, result.value)) {
      fail(STALE_EDIT_MESSAGE, {});
      return;
    }
    router.push("/plan");
  };

  const submit = (candidate: unknown, confirmed = false): void => {
    if (request.busy) {
      return;
    }
    const parsed = IntakeSchema.safeParse(candidate);
    setReplacing(null);
    if (!parsed.success) {
      fail(INVALID_FIELDS_MESSAGE, firstPathIssues(parsed.error.issues));
      return;
    }
    setIssues({});
    setMessage(null);
    const replaced = confirmed ? null : flow.replaces();
    if (replaced === null) {
      void send(parsed.data);
    } else {
      setReplacing(replaced);
    }
  };

  const keepCurrent = (): void => {
    setReplacing(null);
  };

  return { issues, message, alertRef, request, replacing, submit, keepCurrent };
};
