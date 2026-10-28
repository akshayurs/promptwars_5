import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots", () => {
  it("allows the intake page and keeps the browser-local plan pages out of indexes", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/plan", "/plan/summary"] },
    });
  });
});
