import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanGenerator } from "@/lib/gemini";

const generator: PlanGenerator = { generate: vi.fn(), refine: vi.fn() };
const createGeminiClient = vi.fn(() => ({ models: {} }));
const createPlanGenerator = vi.fn(() => generator);
const readEnv = vi.fn(() => ({ GEMINI_API_KEY: "fake-test-value" }));

vi.mock("@/lib/gemini", () => ({ createGeminiClient, createPlanGenerator }));
vi.mock("@/lib/env", () => ({ readEnv }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("routeDependencies", () => {
  it("builds the generator lazily and memoises it", async () => {
    const { routeDependencies } = await import("@/lib/api/deps");
    expect(createPlanGenerator).not.toHaveBeenCalled();
    expect(routeDependencies.generator()).toBe(generator);
    expect(routeDependencies.generator()).toBe(generator);
    expect(createGeminiClient).toHaveBeenCalledTimes(1);
    expect(createGeminiClient).toHaveBeenCalledWith("fake-test-value");
    expect(createPlanGenerator).toHaveBeenCalledWith(
      { models: {} },
      { logger: routeDependencies.logger },
    );
    expect(readEnv).toHaveBeenCalledTimes(1);
  });

  it("exposes a limiter and logger", async () => {
    const { routeDependencies } = await import("@/lib/api/deps");
    expect(routeDependencies.limiter.consume("k").allowed).toBe(true);
    expect(typeof routeDependencies.logger.info).toBe("function");
  });

  it("caps running generations per client key", async () => {
    const { API } = await import("@/lib/constants");
    const { routeDependencies } = await import("@/lib/api/deps");
    const slots = Array.from({ length: API.maxInFlightPerClient }, () =>
      routeDependencies.inFlight.acquire("k"),
    );
    expect(slots.every((release) => release !== null)).toBe(true);
    expect(routeDependencies.inFlight.acquire("k")).toBeNull();
  });

  it("gives CSP reports their own limiter so they never spend plan quota", async () => {
    const { cspReportDependencies, routeDependencies } = await import("@/lib/api/deps");
    expect(cspReportDependencies.limiter).not.toBe(routeDependencies.limiter);
    expect(cspReportDependencies.logger).toBe(routeDependencies.logger);
    expect(cspReportDependencies.limiter.consume("k").limit).toBe(20);
  });
});
