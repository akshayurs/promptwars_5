import { describe, expect, it } from "vitest";

import { readEnv } from "@/lib/env";

describe("readEnv", () => {
  it("throws mentioning GEMINI_API_KEY when missing", () => {
    expect(() => readEnv({})).toThrow(/GEMINI_API_KEY/);
  });

  it("throws when blank", () => {
    expect(() => readEnv({ GEMINI_API_KEY: "   " })).toThrow(/GEMINI_API_KEY/);
  });

  it("returns the trimmed value when present", () => {
    expect(readEnv({ GEMINI_API_KEY: " test-key " })).toEqual({ GEMINI_API_KEY: "test-key" });
  });

  it("does not leak the value in errors", () => {
    expect(() => readEnv({ GEMINI_API_KEY: "" })).not.toThrow(/test-key/);
  });

  it("reads process.env by default", () => {
    const original = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "fake-from-process";
    try {
      expect(readEnv().GEMINI_API_KEY).toBe("fake-from-process");
    } finally {
      if (original === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = original;
    }
  });
});
