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

export const browserStorage = (): Storage | null =>
  typeof window === "undefined" ? null : attempt(() => window.localStorage, null);

export const clearWorkspace = (storage: Storage | null = browserStorage()): void => {
  attempt(() => {
    storage?.removeItem(STORAGE_KEY);
  }, undefined);
};

export const loadWorkspace = (
  storage: Storage | null = browserStorage(),
): StoredWorkspace | null => {
  if (!storage) return null;
  const raw = attempt(() => storage.getItem(STORAGE_KEY), null);
  if (raw === null) return null;
  const parsed = attempt(() => StoredWorkspaceSchema.safeParse(JSON.parse(raw)), null);
  if (parsed?.success) return parsed.data;
  clearWorkspace(storage);
  return null;
};

export const saveWorkspace = (
  workspace: StoredWorkspace,
  storage: Storage | null = browserStorage(),
): boolean => {
  if (!storage) return false;
  return attempt(() => {
    storage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    return true;
  }, false);
};
