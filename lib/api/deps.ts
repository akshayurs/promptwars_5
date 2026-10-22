import "server-only";

import { API } from "@/lib/constants";
import { readEnv } from "@/lib/env";
import { createGeminiClient, createPlanGenerator, type PlanGenerator } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rateLimit";

import type { RouteDependencies } from "./planRoute";

let generator: PlanGenerator | undefined;

const getGenerator = (): PlanGenerator => {
  generator ??= createPlanGenerator(createGeminiClient(readEnv().GEMINI_API_KEY));
  return generator;
};

export const routeDependencies: RouteDependencies = {
  generator: getGenerator,
  limiter: createRateLimiter(API.rateLimit),
  logger,
};
