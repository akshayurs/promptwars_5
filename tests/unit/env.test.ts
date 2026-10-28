import { describe, expect, it, vi } from "vitest";

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

  it("throws a fixed message that never echoes the rejected value", () => {
    const rejected = { GEMINI_API_KEY: 987654321 } as unknown as Record<string, string>;
    expect(() => readEnv(rejected)).toThrow(
      "Missing configuration: set the GEMINI_API_KEY environment variable.",
    );
    expect(() => readEnv(rejected)).not.toThrow(/987654321/);
  });

  it("reads process.env by default", () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-from-process");
    expect(readEnv().GEMINI_API_KEY).toBe("fake-from-process");
  });
});
