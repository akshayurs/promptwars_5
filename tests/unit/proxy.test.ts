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

  it("reports violations to the CSP report endpoint", () => {
    expect(production.get("report-uri")).toBe("/api/csp-report");
    expect(production.get("report-to")).toBe("csp");
  });

  it("does not enforce Trusted Types, which the Next.js chunk loader would violate", () => {
    expect(production.has("require-trusted-types-for")).toBe(false);
  });
});

describe("proxy", () => {
  it("sets a per-request nonce on the request and response CSP", () => {
    const first = proxy(new NextRequest("http://localhost/"));
    const second = proxy(new NextRequest("http://localhost/"));
    const policy = first.headers.get("Content-Security-Policy") ?? "";
    const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(policy)?.[1];
    expect(policy).not.toContain("'unsafe-eval'");
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(policy);
    expect(second.headers.get("Content-Security-Policy")).not.toBe(policy);
  });

  it("uses a 128-bit random nonce", () => {
    const nonce = proxy(new NextRequest("http://localhost/")).headers.get(
      "x-middleware-request-x-nonce",
    );
    expect(Buffer.from(nonce ?? "", "base64")).toHaveLength(16);
  });

  it("names the reporting endpoint used by report-to", () => {
    const response = proxy(new NextRequest("http://localhost/"));
    expect(response.headers.get("Reporting-Endpoints")).toBe('csp="/api/csp-report"');
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

  it.each([
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/.well-known/security.txt",
    "/_next/image",
  ])("skips the static metadata file %s", (path) => {
    expect(pattern.test(path)).toBe(false);
  });

  it("skips prefetch requests", () => {
    expect(matcher?.missing).toEqual([
      { type: "header", key: "next-router-prefetch" },
      { type: "header", key: "purpose", value: "prefetch" },
    ]);
  });

  it("still covers pages whose names merely start with api", () => {
    expect(pattern.test("/apiary")).toBe(true);
    expect(pattern.test("/plan")).toBe(true);
  });
});
