// @vitest-environment node
import { afterEach } from "vitest";
import { config } from "zod";

import "@/lib/zod";

// The shared setup clears window.localStorage after each test; node has no window.
afterEach(() => {
  vi.stubGlobal("window", { localStorage: { clear: () => undefined } });
});

describe("zod config on the server", () => {
  it("keeps Zod's compiled parsers because no CSP applies", () => {
    expect(typeof window).toBe("undefined");
    expect(config().jitless).toBeUndefined();
  });
});
