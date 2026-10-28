import { LIMITS } from "../../lib/constants";

import { expect, test } from "./fixtures";

const API_PATHS = ["/api/plan", "/api/refine"] as const;

// A distinct forwarded hop per request gives each check its own rate-limit bucket.
let clientCounter = 0;
const uniqueClient = (): Record<string, string> => {
  clientCounter += 1;
  return {
    "X-Forwarded-For": `10.${process.pid % 250}.${Math.floor(clientCounter / 250)}.${clientCounter % 250}`,
  };
};

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

  for (const path of API_PATHS) {
    test(`POST ${path} rejects a non-JSON content type with 415`, async ({ request }) => {
      const response = await request.post(path, {
        headers: { "Content-Type": "text/plain", ...uniqueClient() },
        data: "hello",
      });
      expect(response.status()).toBe(415);
    });

    test(`POST ${path} rejects invalid JSON with 400`, async ({ request }) => {
      const response = await request.post(path, {
        headers: { "Content-Type": "application/json", ...uniqueClient() },
        data: "{not json",
      });
      expect(response.status()).toBe(400);
    });

    test(`POST ${path} rejects a schema-invalid body with 400 and issues`, async ({ request }) => {
      const response = await request.post(path, {
        headers: { "Content-Type": "application/json", ...uniqueClient() },
        data: "{}",
      });
      expect(response.status()).toBe(400);
      const body: unknown = await response.json();
      expect(body).toHaveProperty("issues");
    });

    test(`POST ${path} rejects an oversized body with 413`, async ({ request }) => {
      const response = await request.post(path, {
        headers: { "Content-Type": "application/json", ...uniqueClient() },
        data: JSON.stringify({ padding: "x".repeat(LIMITS.requestBodyBytes + 1) }),
      });
      expect(response.status()).toBe(413);
    });

    test(`GET ${path} is rejected with 405 and an Allow header`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(405);
      expect(response.headers().allow).toBe("POST");
    });
  }

  test("POST /api/plan and /api/refine reject cross-site requests with 403", async ({
    request,
  }) => {
    for (const path of API_PATHS) {
      const response = await request.post(path, {
        headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
        data: "{}",
      });
      expect(response.status()).toBe(403);
    }
  });
});
