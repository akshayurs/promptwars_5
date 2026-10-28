import { describe, expect, it } from "vitest";

import {
  emptyResponse,
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  rateLimitHeaders,
  rejectRequest,
} from "@/lib/api/responses";
import { createLogger } from "@/lib/logger";

const API_CSP = "default-src 'none'; frame-ancestors 'none'";

const expectApiHeaders = (res: Response, correlationId: string): void => {
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  expect(res.headers.get("Content-Security-Policy")).toBe(API_CSP);
  expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  expect(res.headers.get("X-Request-Id")).toBe(correlationId);
};

describe("jsonResponse and errorResponse", () => {
  it("jsonResponse sets the API headers, status and extra headers", async () => {
    const res = jsonResponse(
      { a: 1 },
      { status: 201, correlationId: "cid", headers: { "X-A": "b" } },
    );
    expect(res.status).toBe(201);
    expectApiHeaders(res, "cid");
    expect(res.headers.get("X-A")).toBe("b");
    expect(await res.json()).toEqual({ a: 1 });
  });

  it("errorResponse includes the correlationId in the body", async () => {
    const res = errorResponse({ error: "bad" }, { status: 400, correlationId: "cid" });
    expect(await res.json()).toEqual({ error: "bad", correlationId: "cid" });
    expectApiHeaders(res, "cid");
  });
});

describe("emptyResponse", () => {
  it("has no body but the same API headers", async () => {
    const res = emptyResponse({ status: 204, correlationId: "cid", headers: { "X-A": "b" } });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expectApiHeaders(res, "cid");
    expect(res.headers.get("X-A")).toBe("b");
  });
});

describe("rateLimitHeaders", () => {
  it("formats the IETF RateLimit-Policy and RateLimit fields", () => {
    expect(
      rateLimitHeaders({
        allowed: true,
        retryAfterSeconds: 0,
        limit: 10,
        remaining: 7,
        resetSeconds: 15,
        windowSeconds: 50,
      }),
    ).toEqual({
      "RateLimit-Policy": '"default";q=10;w=50',
      RateLimit: '"default";r=7;t=15',
    });
  });
});

describe("rejectRequest", () => {
  const setup = () => {
    const lines: string[] = [];
    return { lines, logger: createLogger((line) => lines.push(line)) };
  };

  it("logs status and reason at warn without the message or body", async () => {
    const { lines, logger } = setup();
    const res = rejectRequest(
      { status: 413, reason: "body_too_large", message: "Request body is too large" },
      "cid",
      logger,
    );
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "Request body is too large", correlationId: "cid" });
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      level: "warn",
      message: "request rejected",
      correlationId: "cid",
      status: 413,
      reason: "body_too_large",
    });
    expect(lines[0]).not.toContain("too large");
  });

  it("passes issues and headers through", async () => {
    const { logger } = setup();
    const issues = [{ path: "guestCount", message: "Too small" }];
    const res = rejectRequest(
      {
        status: 400,
        reason: "validation_failed",
        message: "Fix it",
        issues,
        headers: { "X-A": "b" },
      },
      "cid",
      logger,
    );
    expect(await res.json()).toMatchObject({ issues });
    expect(res.headers.get("X-A")).toBe("b");
  });
});

describe("methodNotAllowed", () => {
  it("returns 405 with Allow: POST and a JSON error", async () => {
    const res = methodNotAllowed();
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
    const body = (await res.json()) as { error: string; correlationId: string };
    expect(body.error).toBe("Method not allowed");
    expectApiHeaders(res, body.correlationId);
  });
});
