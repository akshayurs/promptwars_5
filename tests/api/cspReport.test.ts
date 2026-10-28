import { beforeEach, describe, expect, it } from "vitest";

import { createCspReportRoute } from "@/lib/api/cspReport";
import { LIMITS } from "@/lib/constants";
import { createLogger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rateLimit";

const lines: string[] = [];
const logs = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);

const build = (capacity = 100) =>
  createCspReportRoute({
    limiter: createRateLimiter({ capacity, refillPerSecond: 0.001, now: () => 0 }),
    logger: createLogger((line) => lines.push(line)),
  });

const send = (
  route: ReturnType<typeof build>,
  body: unknown,
  contentType = "application/reports+json",
): Promise<Response> =>
  route(
    new Request("http://localhost/api/csp-report", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": contentType },
    }),
  );

const violation = (effectiveDirective: unknown, blockedURL: unknown) => ({
  type: "csp-violation",
  age: 1,
  url: "https://app.test/plan?secret=1",
  body: {
    documentURL: "https://app.test/plan?secret=1",
    effectiveDirective,
    blockedURL,
    sample: "alert('private')",
  },
});

beforeEach(() => {
  lines.length = 0;
});

describe("createCspReportRoute", () => {
  it("accepts Reporting API batches and logs directive and blocked-source counts only", async () => {
    const res = await send(build(), [
      violation("script-src-elem", "https://evil.example/x.js?token=abc"),
      violation("script-src-elem", "https://evil.example/y.js"),
      violation("style-src-attr", "inline"),
      violation("img-src", "data:image/png;base64,AAAA"),
      { type: "deprecation", body: { id: "x" } },
    ]);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(logs()).toEqual([
      expect.objectContaining({
        level: "warn",
        message: "csp violation",
        correlationId: res.headers.get("X-Request-Id"),
        reports: 4,
        directives: "script-src-elem=2,style-src-attr=1,img-src=1",
        blocked: "evil.example=2,inline=1,data:=1",
      }),
    ]);
    expect(lines[0]).not.toMatch(/secret|token|private|x\.js/);
  });

  it("accepts the legacy report-uri format, preferring the effective directive", async () => {
    const report = {
      "csp-report": {
        "effective-directive": "connect-src",
        "violated-directive": "default-src 'self'",
        "blocked-uri": "https://tracker.example:8443/beacon",
      },
    };
    expect((await send(build(), report, "application/csp-report")).status).toBe(204);
    expect(logs()[0]).toMatchObject({
      directives: "connect-src=1",
      blocked: "tracker.example:8443=1",
    });
  });

  it("falls back to the first token of the violated directive", async () => {
    const report = {
      "csp-report": { "violated-directive": "Script-Src 'self'", "blocked-uri": 7 },
    };
    await send(build(), report, "application/csp-report");
    expect(logs()[0]).toMatchObject({ directives: "script-src=1", blocked: "other=1" });
  });

  it("collapses values that are not short keywords to other", async () => {
    await send(build(), [violation("<script>alert(1)</script>", "not a url"), violation(5, null)]);
    expect(logs()[0]).toMatchObject({ directives: "other=2", blocked: "other=2" });
  });

  it.each([
    ["a batch without csp violations", [{ type: "deprecation", body: {} }]],
    ["an unrelated object", { hello: "world" }],
    ["a scalar", 42],
  ])("rejects %s with 400", async (_label, body) => {
    const res = await send(build(), body);
    expect(res.status).toBe(400);
    expect(logs()[0]).toMatchObject({ level: "warn", status: 400, reason: "validation_failed" });
  });

  it("rejects other content types with 415", async () => {
    const res = await send(build(), [], "text/plain");
    expect(res.status).toBe(415);
    expect(logs()[0]).toMatchObject({ reason: "unsupported_media_type" });
  });

  it("rejects bodies over the report cap with 413", async () => {
    const res = await send(build(), [violation("img-src", "x".repeat(LIMITS.cspReportBodyBytes))]);
    expect(res.status).toBe(413);
    expect(logs()[0]).toMatchObject({ reason: "body_too_large" });
  });

  it("rate limits reports per client with 429 and Retry-After", async () => {
    const route = build(1);
    const body = [violation("img-src", "inline")];
    expect((await send(route, body)).status).toBe(204);
    const res = await send(route, body);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(res.headers.get("RateLimit")).toBe('"default";r=0;t=1000');
    expect(logs().at(-1)).toMatchObject({ status: 429, reason: "rate_limited" });
  });
});
