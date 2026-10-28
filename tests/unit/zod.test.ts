import { describe, expect, it } from "vitest";

import { config } from "zod";

import "@/lib/zod";

describe("zod config in the browser", () => {
  it("runs jitless so validation never probes eval under the nonce CSP", () => {
    expect(typeof window).toBe("object");
    expect(config().jitless).toBe(true);
  });
});
