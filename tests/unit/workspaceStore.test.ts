import { describe, expect, it, vi, type MockInstance } from "vitest";

import { PERSIST_DEBOUNCE_MS, STORAGE_KEY } from "@/lib/constants";
import { createWorkspaceReducer } from "@/lib/workspace";
import { createWorkspaceStore, workspaceStore, type WorkspaceStore } from "@/lib/workspaceStore";

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

  it("skips persisting and notifying when an edit changes nothing", () => {
    const storage = makeMemoryStorage();
    const ws = makeWorkspace();
    storage.setItem(STORAGE_KEY, JSON.stringify(ws));
    const store = createWorkspaceStore(() => storage, reducer);
    const before = store.getSnapshot();
    const setItem = vi.spyOn(storage, "setItem");
    const listener = vi.fn();
    store.subscribe(listener);
    const line = ws.plan.budget[0]!;
    store.dispatch({ type: "setAmount", id: line.id, amount: line.amount });
    store.dispatch({ type: "setTotalBudget", amount: ws.intake.totalBudget });
    expect(store.getSnapshot()).toBe(before);
    expect(setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
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

describe("createWorkspaceStore debounced persistence", () => {
  const stored = (storage: Storage): unknown => JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");

  const setup = (): {
    storage: ReturnType<typeof makeMemoryStorage>;
    store: WorkspaceStore;
    setItem: MockInstance<Storage["setItem"]>;
    lineId: string;
  } => {
    const storage = makeMemoryStorage();
    const ws = makeWorkspace();
    storage.setItem(STORAGE_KEY, JSON.stringify(ws));
    const store = createWorkspaceStore(() => storage, reducer);
    store.getSnapshot();
    const setItem = vi.spyOn(storage, "setItem");
    return { storage, store, setItem, lineId: ws.plan.budget[0]!.id };
  };

  const setVisibility = (state: DocumentVisibilityState): void => {
    Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibility("visible");
  });

  it("updates memory and subscribers at once but coalesces keystroke writes", () => {
    const { store, setItem, lineId, storage } = setup();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: "setAmount", id: lineId, amount: 1 });
    store.dispatch({ type: "setAmount", id: lineId, amount: 12 });
    store.dispatch({ type: "setTotalBudget", amount: 123 });
    expect(listener).toHaveBeenCalledTimes(3);
    expect(store.getSnapshot().workspace?.plan.budget[0]?.amount).toBe(12);
    expect(setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 1);
    expect(setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(stored(storage)).toEqual(store.getSnapshot().workspace);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("restarts the quiet period on every keystroke", () => {
    const { store, setItem, lineId } = setup();
    store.dispatch({ type: "setAmount", id: lineId, amount: 1 });
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 1);
    store.dispatch({ type: "setAmount", id: lineId, amount: 2 });
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS - 1);
    expect(setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("writes other changes at once, superseding a pending keystroke write", () => {
    const { store, setItem, lineId, storage } = setup();
    store.dispatch({ type: "setAmount", id: lineId, amount: 7 });
    const vendorId = store.getSnapshot().workspace!.plan.vendors[0]!.id;
    store.dispatch({ type: "toggleVendor", id: vendorId });
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(stored(storage)).toEqual(store.getSnapshot().workspace);
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("clears storage at once when the plan is replaced with nothing", () => {
    const { store, lineId, storage } = setup();
    store.dispatch({ type: "setAmount", id: lineId, amount: 7 });
    store.dispatch({ type: "replace", workspace: null });
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("flush writes a pending change immediately and is a no-op otherwise", () => {
    const { store, setItem, lineId } = setup();
    store.flush();
    expect(setItem).not.toHaveBeenCalled();
    store.dispatch({ type: "setAmount", id: lineId, amount: 9 });
    store.flush();
    expect(setItem).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS);
    store.flush();
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("flushes on pagehide and then stops listening", () => {
    const { store, setItem, lineId } = setup();
    store.dispatch({ type: "setAmount", id: lineId, amount: 3 });
    window.dispatchEvent(new Event("pagehide"));
    expect(setItem).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("pagehide"));
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("flushes when the page becomes hidden but not while it stays visible", () => {
    const { store, setItem, lineId } = setup();
    store.dispatch({ type: "setAmount", id: lineId, amount: 4 });
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(setItem).not.toHaveBeenCalled();
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it("drops a pending write when another tab saves a newer plan", () => {
    const { store, setItem, lineId, storage } = setup();
    store.subscribe(vi.fn());
    store.dispatch({ type: "setAmount", id: lineId, amount: 5 });
    const other = makeWorkspace();
    storage.data.set(STORAGE_KEY, JSON.stringify(other));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    vi.advanceTimersByTime(PERSIST_DEBOUNCE_MS);
    expect(setItem).not.toHaveBeenCalled();
    expect(store.getSnapshot().workspace).toEqual(other);
  });
});
