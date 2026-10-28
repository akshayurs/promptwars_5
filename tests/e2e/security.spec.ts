import { expect, test } from "./fixtures";

test.describe("security headers and API guards", () => {
  test("page responses carry hardened headers and a nonce CSP", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("POST /api/plan rejects a non-JSON content type with 415", async ({ request }) => {
    const response = await request.post("/api/plan", {
      headers: { "Content-Type": "text/plain" },
      data: "hello",
    });
    expect(response.status()).toBe(415);
  });

  test("POST /api/plan rejects invalid JSON with 400", async ({ request }) => {
    const response = await request.post("/api/plan", {
      headers: { "Content-Type": "application/json" },
      data: "{not json",
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/plan rejects an oversized body with 413", async ({ request }) => {
    const response = await request.post("/api/plan", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ padding: "x".repeat(40_000) }),
    });
    expect(response.status()).toBe(413);
  });

  test("POST /api/plan and /api/refine reject cross-site requests with 403", async ({
    request,
  }) => {
    for (const path of ["/api/plan", "/api/refine"]) {
      const response = await request.post(path, {
        headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
        data: "{}",
      });
      expect(response.status()).toBe(403);
    }
  });
});
