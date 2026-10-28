import { clearWorkspace, saveWorkspace } from "@/lib/storage";
import type { WorkspaceState } from "@/lib/workspace";

type Persistence = {
  /** Writes now; false when storage is unavailable or full. */
  write: (workspace: WorkspaceState) => boolean;
  schedule: (workspace: WorkspaceState) => void;
  flush: () => void;
  cancel: () => void;
};

type PersistenceOptions = {
  storage: () => Storage | null;
  delayMs: number;
  /** Reports the outcome of a write made after a quiet period or on page hide. */
  onDeferredWrite: (saved: boolean) => void;
};

// A pending write is flushed when the page is hidden or unloaded, so no edit is lost.
export const createPersistence = ({
  storage,
  delayMs,
  onDeferredWrite,
}: PersistenceOptions): Persistence => {
  let pending: { workspace: WorkspaceState } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = (): void => {
    if (pending) {
      onDeferredWrite(write(pending.workspace));
    }
  };
  const onVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  };
  const cancel = (): void => {
    clearTimeout(timer);
    pending = null;
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
  const write = (workspace: WorkspaceState): boolean => {
    cancel();
    if (workspace) {
      return saveWorkspace(workspace, storage());
    }
    clearWorkspace(storage());
    return true;
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
