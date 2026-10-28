"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { readWorkspaceImport } from "@/lib/importWorkspace";
import type { StoredWorkspace } from "@/lib/schema";
import type { WorkspaceStore } from "@/lib/workspaceStore";

export type ImportStore = Pick<WorkspaceStore, "dispatch" | "getSnapshot">;

/** A failed attempt; the counter re-mounts the alert so a repeated message is announced again. */
type ImportError = { text: string; attempt: number };

type PendingImport = { workspace: StoredWorkspace; replaces: string };

export type PlanImport = {
  error: ImportError | null;
  /** The saved plan awaiting confirmation before the import replaces it. */
  replacing: { name: string; confirm: () => void } | null;
  choose: (file: File | null) => void;
  submit: () => Promise<void>;
  keep: () => void;
};

const NO_FILE_MESSAGE = "Choose a plan file (JSON) to import.";

/** Validates a chosen plan file on request and confirms before it replaces a saved plan. */
export const useImportPlan = (store: ImportStore): PlanImport => {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);

  const fail = (text: string): void => {
    setError((previous) => ({ text, attempt: (previous?.attempt ?? 0) + 1 }));
  };
  const apply = (workspace: StoredWorkspace): void => {
    store.dispatch({ type: "replace", workspace });
    router.push("/plan");
  };
  const submit = async (): Promise<void> => {
    setPending(null);
    if (!file) {
      fail(NO_FILE_MESSAGE);
      return;
    }
    const result = await readWorkspaceImport(file);
    if (!result.ok) {
      fail(result.message);
      return;
    }
    setError(null);
    const saved = store.getSnapshot().workspace;
    if (saved) {
      setPending({ workspace: result.workspace, replaces: saved.intake.eventName });
    } else {
      apply(result.workspace);
    }
  };
  return {
    error,
    replacing: pending
      ? {
          name: pending.replaces,
          confirm: () => {
            apply(pending.workspace);
          },
        }
      : null,
    choose: (next) => {
      setFile(next);
      setError(null);
      setPending(null);
    },
    submit,
    keep: () => {
      setPending(null);
    },
  };
};
