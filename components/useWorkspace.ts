"use client";

import { useSyncExternalStore } from "react";

import type { WorkspaceAction } from "@/lib/workspace";
import { workspaceStore, type WorkspaceSnapshot } from "@/lib/workspaceStore";

export type WorkspaceHandle = WorkspaceSnapshot & { dispatch: (action: WorkspaceAction) => void };

export const useWorkspace = (): WorkspaceHandle => {
  const snapshot = useSyncExternalStore(
    workspaceStore.subscribe,
    workspaceStore.getSnapshot,
    workspaceStore.getServerSnapshot,
  );
  return { ...snapshot, dispatch: workspaceStore.dispatch };
};
