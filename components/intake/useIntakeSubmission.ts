import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";

import { requestPlan } from "@/lib/client";
import { IntakeSchema } from "@/lib/schema";
import { createWorkspace } from "@/lib/workspace";
import type { FieldIssues } from "@/lib/types";
import { workspaceStore } from "@/lib/workspaceStore";

import { firstPathIssues } from "./formState";

type Submission = {
  issues: FieldIssues;
  message: string | null;
  busy: boolean;
  alertRef: RefObject<HTMLDivElement | null>;
  submit: (candidate: unknown) => Promise<void>;
};

const useFocusOnFailure = (failures: number): RefObject<HTMLDivElement | null> => {
  const alertRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (failures > 0) alertRef.current?.focus();
  }, [failures]);
  return alertRef;
};

const useAbortOnUnmount = (): RefObject<AbortController | null> => {
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );
  return controllerRef;
};

export const useIntakeSubmission = (): Submission => {
  const router = useRouter();
  const [issues, setIssues] = useState<FieldIssues>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState(0);
  const alertRef = useFocusOnFailure(failures);
  const controllerRef = useAbortOnUnmount();

  const fail = (text: string, fieldIssues: FieldIssues): void => {
    setIssues(fieldIssues);
    setMessage(text);
    setFailures((count) => count + 1);
  };

  const submit = async (candidate: unknown): Promise<void> => {
    if (busy) return;
    const parsed = IntakeSchema.safeParse(candidate);
    if (!parsed.success) {
      fail("Please correct the highlighted fields.", firstPathIssues(parsed.error.issues));
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setMessage(null);
    const result = await requestPlan(parsed.data, controller.signal);
    if (controller.signal.aborted) return;
    setBusy(false);
    if (!result.ok) {
      fail(result.message, result.issues);
      return;
    }
    workspaceStore.dispatch({
      type: "replace",
      workspace: createWorkspace(parsed.data, result.value),
    });
    router.push("/plan");
  };

  return { issues, message, busy, alertRef, submit };
};
