import { STORAGE_KEY } from "@/lib/constants";
import { browserStorage, clearWorkspace, loadWorkspace, saveWorkspace } from "@/lib/storage";
import { workspaceReducer, type WorkspaceAction, type WorkspaceState } from "@/lib/workspace";

export type WorkspaceSnapshot =
  { status: "loading"; workspace: null } | { status: "ready"; workspace: WorkspaceState };

export type WorkspaceStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => WorkspaceSnapshot;
  getServerSnapshot: () => WorkspaceSnapshot;
  dispatch: (action: WorkspaceAction) => void;
};

const LOADING: WorkspaceSnapshot = { status: "loading", workspace: null };

/**
 * External store for `useSyncExternalStore`: loads the saved workspace lazily, persists every
 * change and follows edits made in other tabs. Dispatches that leave the state object unchanged
 * neither persist nor notify.
 */
export const createWorkspaceStore = (
  storage: () => Storage | null,
  reducer = workspaceReducer,
): WorkspaceStore => {
  let snapshot: WorkspaceSnapshot | null = null;
  const listeners = new Set<() => void>();

  const current = (): WorkspaceSnapshot => {
    snapshot ??= { status: "ready", workspace: loadWorkspace(storage()) };
    return snapshot;
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      // Another tab wrote or cleared the plan: drop the cache so the next read reloads it.
      const onStorage = (event: StorageEvent): void => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        snapshot = null;
        listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot: current,
    getServerSnapshot: () => LOADING,
    dispatch: (action) => {
      const before = current();
      const workspace = reducer(before.workspace, action);
      if (workspace === before.workspace) return;
      snapshot = { status: "ready", workspace };
      if (workspace) saveWorkspace(workspace, storage());
      else clearWorkspace(storage());
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
};

/** The browser's workspace store, backed by localStorage. */
export const workspaceStore: WorkspaceStore = createWorkspaceStore(browserStorage);
