import { config } from "zod";

import "@/lib/zod";

describe("zod config", () => {
  it("runs jitless so validation never probes eval under the nonce CSP", () => {
    expect(config().jitless).toBe(true);
  });
});
