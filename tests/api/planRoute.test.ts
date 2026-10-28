import { beforeEach, describe, expect, it, vi } from "vitest";

import { createPlanRoute, type RouteDependencies } from "@/lib/api/planRoute";
import { LIMITS } from "@/lib/constants";
import { PlanGenerationError, type PlanGenerator } from "@/lib/gemini";
import { createLogger } from "@/lib/logger";
import { toPlan } from "@/lib/plan";
import { createRateLimiter } from "@/lib/rateLimit";
import { IntakeSchema, PlanSchema } from "@/lib/schema";

import { makeGeneratedPlan, makeIntake, makePlan } from "../unit/fixtures";

const generate = vi.fn<PlanGenerator["generate"]>();
const refine = vi.fn<PlanGenerator["refine"]>();
const lines: string[] = [];

const build = (capacity = 100, timeoutMs?: number) => {
  const deps: RouteDependencies = {
    generator: () => ({ generate, refine }),
    limiter: createRateLimiter({ capacity, refillPerSecond: 0.001, now: () => 0 }),
    logger: createLogger(
      (line) => lines.push(line),
      () => new Date(0),
    ),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  };
  return createPlanRoute(
    {
      schema: IntakeSchema,
      execute: async (intake, generator, signal) =>
        toPlan(await generator.generate(intake, signal)),
    },
    deps,
  );
};

const call = (
  route: ReturnType<typeof build>,
  body: string,
  headers: Record<string, string> = {},
): Promise<Response> =>
  route(
    new Request("http://localhost/api/plan", {
      method: "POST",
      body,
      headers: { "content-type": "application/json", ...headers },
    }),
  );

const valid = () =>
  JSON.stringify(
    makeIntake({ eventDate: new Date(Date.now() + 864e5 * 30).toISOString().slice(0, 10) }),
  );

beforeEach(() => {
  generate.mockReset();
  refine.mockReset();
  lines.length = 0;
});

describe("createPlanRoute", () => {
  it("returns 200 with a valid Plan and X-Request-Id", async () => {
    generate.mockResolvedValue(makeGeneratedPlan());
    const res = await call(build(), valid());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(PlanSchema.safeParse(await res.json()).success).toBe(true);
  });

  it("passes a live abort signal to the generator", async () => {
    generate.mockResolvedValue(makeGeneratedPlan());
    await call(build(), valid());
    expect(generate.mock.calls[0]?.[1].aborted).toBe(false);
  });

  it("returns 400 with an issues array for an invalid field", async () => {
    const body = JSON.stringify({ ...makeIntake(), guestCount: 0 });
    const res = await call(build(), body);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { issues: Array<{ path: string; message: string }> };
    expect(json.issues.some((i) => i.path === "guestCount")).toBe(true);
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns 413 for an oversize body", async () => {
    const res = await call(build(), JSON.stringify({ pad: "x".repeat(LIMITS.requestBodyBytes) }));
    expect(res.status).toBe(413);
  });

  it("returns 415 for a wrong content type", async () => {
    const res = await call(build(), valid(), { "content-type": "text/plain" });
    expect(res.status).toBe(415);
  });

  it("returns 400 for bad JSON", async () => {
    const res = await call(build(), "{bad");
    expect(res.status).toBe(400);
  });

  it.each([
    ["Sec-Fetch-Site cross-site", { "sec-fetch-site": "cross-site" }],
    ["Sec-Fetch-Site same-site", { "sec-fetch-site": "same-site" }],
    ["a foreign Origin", { origin: "https://attacker.example" }],
    ["a malformed Origin", { origin: "null" }],
  ])("returns 403 without calling the model for %s", async (_label, headers) => {
    const res = await call(build(), valid(), headers);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe(
      "Cross-site requests are not allowed",
    );
    expect(generate).not.toHaveBeenCalled();
  });

  it.each([
    ["Sec-Fetch-Site same-origin", { "sec-fetch-site": "same-origin" }],
    ["a matching Origin", { origin: "http://localhost" }],
    ["a matching Origin behind a Host header", { origin: "https://app.test", host: "app.test" }],
    ["no browser headers", {}],
  ])("accepts requests with %s", async (_label, headers) => {
    generate.mockResolvedValue(makeGeneratedPlan());
    const res = await call(build(), valid(), headers);
    expect(res.status).toBe(200);
  });

  it("rejects cross-site requests before they consume rate-limit tokens", async () => {
    generate.mockResolvedValue(makeGeneratedPlan());
    const route = build(1);
    const client = { "x-forwarded-for": "client-c" };
    await call(route, valid(), { ...client, "sec-fetch-site": "cross-site" });
    const res = await call(route, valid(), client);
    expect(res.status).toBe(200);
  });

  it("returns 429 with Retry-After once capacity is exhausted", async () => {
    generate.mockResolvedValue(makeGeneratedPlan());
    const route = build(2);
    await call(route, valid(), { "x-forwarded-for": "client-a" });
    await call(route, valid(), { "x-forwarded-for": "client-a" });
    const res = await call(route, valid(), { "x-forwarded-for": "client-a" });
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    const other = await call(route, valid(), { "x-forwarded-for": "client-b" });
    expect(other.status).toBe(200);
  });

  it.each(["upstream", "malformed"] as const)(
    "returns 502 for %s failures and logs",
    async (code) => {
      generate.mockRejectedValue(new PlanGenerationError(code, "service says no"));
      const res = await call(build(), valid());
      expect(res.status).toBe(502);
      const json = (await res.json()) as { correlationId: string; error: string };
      expect(json.error).toBe("service says no");
      const log = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
      expect(log).toMatchObject({ level: "warn", code, correlationId: json.correlationId });
    },
  );

  it("logs the upstream HTTP status as a number when present", async () => {
    generate.mockRejectedValue(new PlanGenerationError("upstream", "busy", 503));
    await call(build(), valid());
    const log = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(log).toMatchObject({ level: "warn", code: "upstream", upstreamStatus: 503 });
  });

  it("omits upstreamStatus from the log when unknown", async () => {
    generate.mockRejectedValue(new PlanGenerationError("upstream", "busy"));
    await call(build(), valid());
    expect(lines[0]).not.toContain("upstreamStatus");
  });

  it("returns 499 without logging when the client disconnects", async () => {
    const controller = new AbortController();
    generate.mockImplementation(() => {
      controller.abort();
      return Promise.reject(new PlanGenerationError("timeout", "Plan generation timed out"));
    });
    const res = await build()(
      new Request("http://localhost/api/plan", {
        method: "POST",
        body: valid(),
        headers: { "content-type": "application/json" },
        signal: controller.signal,
      }),
    );
    expect(res.status).toBe(499);
    expect(await res.text()).toBe("");
    expect(lines).toHaveLength(0);
  });

  it("returns 503 with Retry-After when the model is busy", async () => {
    generate.mockRejectedValue(
      new PlanGenerationError(
        "busy",
        "The planning model is busy. Please try again in a moment.",
        503,
      ),
    );
    const res = await call(build(), valid());
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("5");
    expect(await res.json()).toMatchObject({
      error: "The planning model is busy. Please try again in a moment.",
    });
  });

  it("does not send Retry-After for other upstream failures", async () => {
    generate.mockRejectedValue(new PlanGenerationError("upstream", "nope", 500));
    const res = await call(build(), valid());
    expect(res.headers.get("Retry-After")).toBeNull();
  });

  it("returns 504 on timeout", async () => {
    generate.mockRejectedValue(new PlanGenerationError("timeout", "Plan generation timed out"));
    expect((await call(build(), valid())).status).toBe(504);
  });

  it("returns 500 with a generic message and no leaked details", async () => {
    generate.mockRejectedValue(new Error("secret key leaked at /srv/app.ts:1"));
    const res = await call(build(), valid());
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toMatch(/key|stack|\.ts/i);
    expect(JSON.parse(text)).toMatchObject({ error: "Something went wrong. Please try again." });
    const log = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    expect(log).toMatchObject({ level: "error", reason: "Error" });
    expect(lines[0]).not.toContain("secret");
  });

  it("logs reason unknown for non-Error throws", async () => {
    generate.mockRejectedValue("weird");
    await call(build(), valid());
    expect(lines[0]).toContain('"reason":"unknown"');
  });

  it("never includes the word key or a stack in error bodies", async () => {
    const bodies = [
      await call(build(), "{bad"),
      await call(build(), valid(), { "content-type": "text/plain" }),
      await call(build(), JSON.stringify({})),
    ];
    for (const res of bodies) {
      expect(await res.text()).not.toMatch(/\bkey\b|stack|\sat\s.*:\d+/i);
    }
  });

  it("includes the correlation id in error bodies matching the header", async () => {
    const res = await call(build(), "{bad");
    const json = (await res.json()) as { correlationId: string };
    expect(json.correlationId).toBe(res.headers.get("X-Request-Id"));
  });

  it("aborts the signal when the timeout elapses", async () => {
    const aborted = new Promise<boolean>((resolve) => {
      generate.mockImplementation((_intake, signal) => {
        signal.addEventListener("abort", () => {
          resolve(true);
        });
        return new Promise(() => undefined);
      });
    });
    void call(build(100, 20), valid());
    expect(await aborted).toBe(true);
  });

  it("rejects plan-shaped bodies with unknown keys", async () => {
    const res = await call(build(), JSON.stringify({ ...makeIntake(), plan: makePlan() }));
    expect(res.status).toBe(400);
  });
});
