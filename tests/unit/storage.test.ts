import { describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/lib/constants";
import { browserStorage, clearWorkspace, loadWorkspace, saveWorkspace } from "@/lib/storage";

import { makeMemoryStorage, makeWorkspace } from "./fixtures";

describe("browserStorage", () => {
  it("returns null when window is unavailable (server)", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(browserStorage()).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("returns null when localStorage access throws (site data blocked)", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    try {
      expect(browserStorage()).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("returns window.localStorage in jsdom", () => {
    expect(browserStorage()).toBe(window.localStorage);
  });
});

describe("loadWorkspace", () => {
  it("returns null when storage is null", () => {
    expect(loadWorkspace(null)).toBeNull();
  });

  it("returns null when the key is missing", () => {
    expect(loadWorkspace(makeMemoryStorage())).toBeNull();
  });

  it("returns null and removes corrupt JSON", () => {
    const storage = makeMemoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(loadWorkspace(storage)).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null and removes schema mismatches", () => {
    const storage = makeMemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 9 }));
    expect(loadWorkspace(storage)).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("returns null when getItem throws", () => {
    const storage = makeMemoryStorage();
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(loadWorkspace(storage)).toBeNull();
  });

  it("returns null when removing a corrupt entry throws", () => {
    const storage = makeMemoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    vi.spyOn(storage, "removeItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(loadWorkspace(storage)).toBeNull();
  });

  it("round-trips a valid workspace", () => {
    const storage = makeMemoryStorage();
    const workspace = makeWorkspace();
    expect(saveWorkspace(workspace, storage)).toBe(true);
    expect(loadWorkspace(storage)).toEqual(workspace);
  });

  it("uses window.localStorage by default", () => {
    const workspace = makeWorkspace();
    expect(saveWorkspace(workspace)).toBe(true);
    expect(loadWorkspace()).toEqual(workspace);
    clearWorkspace();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("saveWorkspace", () => {
  it("returns false when storage is null", () => {
    expect(saveWorkspace(makeWorkspace(), null)).toBe(false);
  });

  it("returns false when setItem throws (quota exceeded)", () => {
    const storage = makeMemoryStorage();
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(saveWorkspace(makeWorkspace(), storage)).toBe(false);
  });
});

describe("clearWorkspace", () => {
  it("removes the stored item", () => {
    const storage = makeMemoryStorage();
    saveWorkspace(makeWorkspace(), storage);
    clearWorkspace(storage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("swallows removeItem failures", () => {
    const storage = makeMemoryStorage();
    vi.spyOn(storage, "removeItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(() => {
      clearWorkspace(storage);
    }).not.toThrow();
  });

  it("is a no-op for null storage", () => {
    expect(() => {
      clearWorkspace(null);
    }).not.toThrow();
  });
});
