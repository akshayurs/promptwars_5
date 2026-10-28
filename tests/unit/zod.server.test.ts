import { describe, expect, it } from "vitest";
import { config } from "zod";

import "@/lib/zod";

describe("zod config on the server", () => {
  it("keeps Zod's compiled parsers because no CSP applies", () => {
    expect(typeof window).toBe("undefined");
    expect(config().jitless).toBeUndefined();
  });
});
