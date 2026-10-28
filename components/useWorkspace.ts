"use client";

import { useSyncExternalStore } from "react";

import type { WorkspaceAction } from "@/lib/workspace";
import { workspaceStore, type WorkspaceSnapshot, type WorkspaceStore } from "@/lib/workspaceStore";

export type WorkspaceHandle = WorkspaceSnapshot & { dispatch: (action: WorkspaceAction) => void };

/** Subscribes to the workspace store; the browser's store unless another one is injected. */
export const useWorkspace = (store: WorkspaceStore = workspaceStore): WorkspaceHandle => {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  return { ...snapshot, dispatch: store.dispatch };
};
