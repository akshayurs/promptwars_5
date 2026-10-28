import { PERSIST_DEBOUNCE_MS, STORAGE_KEY } from "@/lib/constants";
import { browserStorage, clearWorkspace, loadWorkspace, saveWorkspace } from "@/lib/storage";
import { workspaceReducer, type WorkspaceAction, type WorkspaceState } from "@/lib/workspace";

export type WorkspaceSnapshot =
  { status: "loading"; workspace: null } | { status: "ready"; workspace: WorkspaceState };

export type WorkspaceStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => WorkspaceSnapshot;
  getServerSnapshot: () => WorkspaceSnapshot;
  dispatch: (action: WorkspaceAction) => void;
  /** Writes any pending debounced change to storage now. */
  flush: () => void;
};

const LOADING: WorkspaceSnapshot = { status: "loading", workspace: null };

/** Actions fired per keystroke; their writes are coalesced instead of serialised every time. */
const DEBOUNCED_ACTIONS: ReadonlySet<WorkspaceAction["type"]> = new Set([
  "setAmount",
  "setTotalBudget",
]);

type Persistence = {
  write: (workspace: WorkspaceState) => void;
  schedule: (workspace: WorkspaceState) => void;
  flush: () => void;
  cancel: () => void;
};

// A pending write is flushed when the page is hidden or unloaded, so no edit is lost.
const createPersistence = (storage: () => Storage | null, delayMs: number): Persistence => {
  let pending: { workspace: WorkspaceState } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = (): void => {
    if (pending) write(pending.workspace);
  };
  const onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") flush();
  };
  const cancel = (): void => {
    clearTimeout(timer);
    pending = null;
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
  const write = (workspace: WorkspaceState): void => {
    cancel();
    if (workspace) saveWorkspace(workspace, storage());
    else clearWorkspace(storage());
  };
  const schedule = (workspace: WorkspaceState): void => {
    if (!pending) {
      window.addEventListener("pagehide", flush);
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    pending = { workspace };
    clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  };
  return { write, schedule, flush, cancel };
};

/**
 * External store for `useSyncExternalStore`: loads the saved workspace lazily, persists changes
 * (keystroke-rate edits after a quiet period, everything else at once) and follows edits made
 * in other tabs. In-memory updates and subscribers are always immediate; dispatches that leave
 * the state object unchanged neither persist nor notify.
 */
export const createWorkspaceStore = (
  storage: () => Storage | null,
  reducer = workspaceReducer,
  writeDelayMs = PERSIST_DEBOUNCE_MS,
): WorkspaceStore => {
  let snapshot: WorkspaceSnapshot | null = null;
  const listeners = new Set<() => void>();
  const persistence = createPersistence(storage, writeDelayMs);

  const current = (): WorkspaceSnapshot => {
    snapshot ??= { status: "ready", workspace: loadWorkspace(storage()) };
    return snapshot;
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      // Another tab wrote or cleared the plan: its copy wins, so drop the cache and reload.
      const onStorage = (event: StorageEvent): void => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        persistence.cancel();
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
      if (DEBOUNCED_ACTIONS.has(action.type)) persistence.schedule(workspace);
      else persistence.write(workspace);
      listeners.forEach((listener) => {
        listener();
      });
    },
    flush: persistence.flush,
  };
};

/** The browser's workspace store, backed by localStorage. */
export const workspaceStore: WorkspaceStore = createWorkspaceStore(browserStorage);
