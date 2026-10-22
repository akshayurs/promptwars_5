import { describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/lib/constants";
import { createWorkspaceReducer } from "@/lib/workspace";
import { createWorkspaceStore, workspaceStore } from "@/lib/workspaceStore";

import { makeMemoryStorage, makeWorkspace } from "./fixtures";

const reducer = createWorkspaceReducer(() => "2031-01-01T00:00:00.000Z");

describe("createWorkspaceStore", () => {
  it("server snapshot is always loading", () => {
    const store = createWorkspaceStore(() => makeMemoryStorage(), reducer);
    expect(store.getServerSnapshot()).toEqual({ status: "loading", workspace: null });
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
  });

  it("lazily loads from storage once and caches", () => {
    const storage = makeMemoryStorage();
    const ws = makeWorkspace();
    storage.setItem(STORAGE_KEY, JSON.stringify(ws));
    const getItem = vi.spyOn(storage, "getItem");
    const store = createWorkspaceStore(() => storage, reducer);
    expect(getItem).not.toHaveBeenCalled();
    const first = store.getSnapshot();
    expect(first).toEqual({ status: "ready", workspace: ws });
    expect(store.getSnapshot()).toBe(first);
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it("is ready with null workspace when storage is empty or unavailable", () => {
    expect(createWorkspaceStore(() => makeMemoryStorage(), reducer).getSnapshot()).toEqual({
      status: "ready",
      workspace: null,
    });
    expect(createWorkspaceStore(() => null, reducer).getSnapshot().workspace).toBeNull();
  });

  it("dispatch persists, updates the snapshot and notifies subscribers", () => {
    const storage = makeMemoryStorage();
    const store = createWorkspaceStore(() => storage, reducer);
    const listener = vi.fn();
    store.subscribe(listener);
    const ws = makeWorkspace();
    store.dispatch({ type: "replace", workspace: ws });
    expect(store.getSnapshot().workspace).toBe(ws);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toEqual(ws);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the reducer returns the same reference", () => {
    const storage = makeMemoryStorage();
    const store = createWorkspaceStore(() => storage, reducer);
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    store.dispatch({ type: "undo" });
    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(storage.data.size).toBe(0);
  });

  it("stops notifying after unsubscribe", () => {
    const store = createWorkspaceStore(() => makeMemoryStorage(), reducer);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.dispatch({ type: "replace", workspace: makeWorkspace() });
    expect(listener).not.toHaveBeenCalled();
  });

  it("reloads and notifies when another tab changes the stored plan", () => {
    const storage = makeMemoryStorage();
    const store = createWorkspaceStore(() => storage, reducer);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.getSnapshot().workspace).toBeNull();

    const ws = makeWorkspace();
    storage.setItem(STORAGE_KEY, JSON.stringify(ws));
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot().workspace).toBeNull();

    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().workspace).toEqual(ws);

    storage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().workspace).toBeNull();

    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("a null workspace clears storage", () => {
    const storage = makeMemoryStorage();
    const store = createWorkspaceStore(() => storage, reducer);
    store.dispatch({ type: "replace", workspace: makeWorkspace() });
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    store.dispatch({ type: "replace", workspace: null });
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(store.getSnapshot().workspace).toBeNull();
  });

  it("exposes a default browser-backed store", () => {
    expect(workspaceStore.getServerSnapshot().status).toBe("loading");
    expect(workspaceStore.getSnapshot().status).toBe("ready");
  });
});
