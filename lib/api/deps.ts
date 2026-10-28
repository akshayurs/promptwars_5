import "server-only";

import { API } from "@/lib/constants";
import { readEnv } from "@/lib/env";
import { createGeminiClient, createPlanGenerator, type PlanGenerator } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rateLimit";

import type { CspReportDependencies } from "./cspReport";
import type { RouteDependencies } from "./planRoute";

/** Wraps a factory so it runs on first use and every later call returns the same value. */
const memoise = <T>(factory: () => T): (() => T) => {
  const cache: { value?: T } = {};
  return () => {
    if (!("value" in cache)) {
      cache.value = factory();
    }
    return cache.value;
  };
};

// Built lazily so a missing key fails the first request, not the module import during build.
const planGenerator = memoise((): PlanGenerator =>
  createPlanGenerator(createGeminiClient(readEnv().GEMINI_API_KEY), { logger }),
);

export const routeDependencies: RouteDependencies = {
  generator: planGenerator,
  limiter: createRateLimiter(API.rateLimit),
  logger,
};

export const cspReportDependencies: CspReportDependencies = {
  limiter: createRateLimiter(API.cspReportRateLimit),
  logger,
};
