import { describe, expect, it } from "vitest";

import { errorDigest } from "@/lib/errors";

describe("errorDigest", () => {
  it("returns the digest of a server-forwarded error", () => {
    expect(errorDigest(Object.assign(new Error("x"), { digest: "abc123" }))).toBe("abc123");
  });

  it.each([
    ["an error without a digest", new Error("x")],
    ["a non-string digest", Object.assign(new Error("x"), { digest: 42 })],
    ["a plain object", { digest: "abc" }],
    ["a thrown string", "boom"],
    ["undefined", undefined],
  ])("returns null for %s", (_label, value) => {
    expect(errorDigest(value)).toBeNull();
  });
});
