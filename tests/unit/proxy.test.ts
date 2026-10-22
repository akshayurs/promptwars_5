import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, config, proxy } from "@/proxy";

const directives = (policy: string): Map<string, string> =>
  new Map(
    policy.split("; ").map((directive) => {
      const [name = "", ...values] = directive.split(" ");
      return [name, values.join(" ")];
    }),
  );

describe("buildContentSecurityPolicy", () => {
  const production = directives(buildContentSecurityPolicy("abc123", false));
  const development = directives(buildContentSecurityPolicy("abc123", true));

  it("locks scripts to the nonce without unsafe-eval in production", () => {
    expect(production.get("script-src")).toBe("'self' 'nonce-abc123' 'strict-dynamic'");
  });

  it("allows unsafe-eval for scripts only in development", () => {
    expect(development.get("script-src")).toContain("'unsafe-eval'");
  });

  it("uses the nonce for styles without unsafe-inline in every mode", () => {
    for (const policy of [production, development]) {
      expect(policy.get("style-src")).toBe("'self' 'nonce-abc123'");
    }
  });

  it("forbids framing, plugins and foreign form targets", () => {
    expect(production.get("frame-ancestors")).toBe("'none'");
    expect(production.get("object-src")).toBe("'none'");
    expect(production.get("base-uri")).toBe("'self'");
    expect(production.get("form-action")).toBe("'self'");
    expect(production.get("default-src")).toBe("'self'");
    expect(production.has("upgrade-insecure-requests")).toBe(true);
  });
});

describe("proxy", () => {
  it("sets a per-request nonce on the request and response CSP", () => {
    const first = proxy(new NextRequest("http://localhost/"));
    const second = proxy(new NextRequest("http://localhost/"));
    const policy = first.headers.get("Content-Security-Policy") ?? "";
    expect(policy).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(first.headers.get("x-middleware-request-x-nonce")).toBeTruthy();
    expect(second.headers.get("Content-Security-Policy")).not.toBe(policy);
  });
});

describe("config.matcher", () => {
  const [matcher] = config.matcher;
  const pattern = new RegExp(`^${matcher?.source ?? ""}$`);

  it("skips API routes and static assets", () => {
    expect(pattern.test("/api/plan")).toBe(false);
    expect(pattern.test("/_next/static/chunk.js")).toBe(false);
    expect(pattern.test("/favicon.ico")).toBe(false);
  });

  it("still covers pages whose names merely start with api", () => {
    expect(pattern.test("/apiary")).toBe(true);
    expect(pattern.test("/plan")).toBe(true);
  });
});
