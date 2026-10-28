import { STORAGE_KEY } from "@/lib/constants";
import { StoredWorkspaceSchema, type StoredWorkspace } from "@/lib/schema";

// Storage access throws (e.g. SecurityError) when the browser blocks site data.
const attempt = <T>(action: () => T, fallback: T): T => {
  try {
    return action();
  } catch {
    return fallback;
  }
};

/** localStorage, or null on the server or when the browser blocks site data. */
export const browserStorage = (): Storage | null =>
  typeof window === "undefined" ? null : attempt(() => window.localStorage, null);

/** Removes the saved workspace; storage failures are ignored. */
export const clearWorkspace = (storage: Storage | null = browserStorage()): void => {
  attempt(() => {
    storage?.removeItem(STORAGE_KEY);
  }, undefined);
};

/** The saved workspace if it is present and valid; invalid or outdated data is cleared. */
export const loadWorkspace = (
  storage: Storage | null = browserStorage(),
): StoredWorkspace | null => {
  if (!storage) {
    return null;
  }
  const raw = attempt(() => storage.getItem(STORAGE_KEY), null);
  if (raw === null) {
    return null;
  }
  const parsed = attempt(() => StoredWorkspaceSchema.safeParse(JSON.parse(raw)), null);
  if (parsed?.success) {
    return parsed.data;
  }
  clearWorkspace(storage);
  return null;
};

/** Saves the workspace; returns false when storage is unavailable or full. */
export const saveWorkspace = (
  workspace: StoredWorkspace,
  storage: Storage | null = browserStorage(),
): boolean => {
  if (!storage) {
    return false;
  }
  return attempt(() => {
    storage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return true;
  }, false);
};
