import { PERSIST_DEBOUNCE_MS, STORAGE_KEY } from "@/lib/constants";
import { browserStorage, loadWorkspace } from "@/lib/storage";
import { workspaceReducer, type WorkspaceAction, type WorkspaceState } from "@/lib/workspace";
import { createPersistence } from "@/lib/workspacePersistence";

export type WorkspaceSnapshot =
  | { status: "loading"; workspace: null; saveFailed: false }
  | {
      status: "ready";
      workspace: WorkspaceState;
      /** The latest change could not be written to storage (quota exceeded or blocked). */
      saveFailed: boolean;
    };

export type WorkspaceStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => WorkspaceSnapshot;
  getServerSnapshot: () => WorkspaceSnapshot;
  dispatch: (action: WorkspaceAction) => void;
  /** Writes any pending debounced change to storage now. */
  flush: () => void;
};

type ReadySnapshot = Extract<WorkspaceSnapshot, { status: "ready" }>;

const LOADING: WorkspaceSnapshot = { status: "loading", workspace: null, saveFailed: false };

/** Actions fired per keystroke; their writes are coalesced instead of serialised every time. */
const DEBOUNCED_ACTIONS: ReadonlySet<WorkspaceAction["type"]> = new Set([
  "setAmount",
  "setTotalBudget",
]);

type SubscriptionContext = {
  listeners: Set<() => void>;
  /** Drops pending writes and the cached snapshot when another tab changed the stored plan. */
  onExternalChange: () => void;
};

// Another tab wrote or cleared the plan: its copy wins, so the cache is dropped and reloaded.
const subscribeWithStorageSync = (
  listener: () => void,
  { listeners, onExternalChange }: SubscriptionContext,
): (() => void) => {
  listeners.add(listener);
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY && event.key !== null) {
      return;
    }
    onExternalChange();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/**
 * External store for `useSyncExternalStore`: loads the saved workspace lazily, persists changes
 * (keystroke-rate edits after a quiet period, everything else at once), reports writes the
 * browser refused and follows edits made in other tabs. In-memory updates and subscribers are
 * always immediate; dispatches that leave the state object unchanged neither persist nor notify.
 */
export const createWorkspaceStore = (
  storage: () => Storage | null,
  reducer = workspaceReducer,
  writeDelayMs = PERSIST_DEBOUNCE_MS,
): WorkspaceStore => {
  let snapshot: ReadySnapshot | null = null;
  const listeners = new Set<() => void>();

  const current = (): ReadySnapshot => {
    snapshot ??= { status: "ready", workspace: loadWorkspace(storage()), saveFailed: false };
    return snapshot;
  };
  const publish = (next: ReadySnapshot): void => {
    snapshot = next;
    listeners.forEach((listener) => {
      listener();
    });
  };
  const persistence = createPersistence({
    storage,
    delayMs: writeDelayMs,
    onDeferredWrite: (saved) => {
      const latest = current();
      if (latest.saveFailed === saved) {
        publish({ ...latest, saveFailed: !saved });
      }
    },
  });

  return {
    subscribe: (listener) =>
      subscribeWithStorageSync(listener, {
        listeners,
        onExternalChange: () => {
          persistence.cancel();
          snapshot = null;
        },
      }),
    getSnapshot: current,
    getServerSnapshot: () => LOADING,
    dispatch: (action) => {
      const before = current();
      const workspace = reducer(before.workspace, action);
      if (workspace === before.workspace) {
        return;
      }
      let { saveFailed } = before;
      if (DEBOUNCED_ACTIONS.has(action.type)) {
        persistence.schedule(workspace);
      } else {
        saveFailed = !persistence.write(workspace);
      }
      publish({ status: "ready", workspace, saveFailed });
    },
    flush: persistence.flush,
  };
};

/** The browser's workspace store, backed by localStorage. */
export const workspaceStore: WorkspaceStore = createWorkspaceStore(browserStorage);
