import "server-only";

import type { z } from "zod";

import { API, LIMITS } from "@/lib/constants";
import { PlanGenerationError, type PlanGenerator } from "@/lib/gemini";
import {
  clientKey,
  errorResponse,
  isCrossSiteRequest,
  jsonResponse,
  readJsonBody,
} from "@/lib/http";
import type { Logger } from "@/lib/logger";
import type { RateLimiter } from "@/lib/rateLimit";
import type { Plan } from "@/lib/schema";

export type RouteDependencies = {
  generator: () => PlanGenerator;
  limiter: RateLimiter;
  logger: Logger;
  timeoutMs?: number;
};

export type RouteDefinition<TInput> = {
  schema: z.ZodType<TInput>;
  execute: (input: TInput, generator: PlanGenerator, signal: AbortSignal) => Promise<Plan>;
};

export type PlanRoute = (request: Request) => Promise<Response>;

const STATUS_BY_FAILURE: Record<PlanGenerationError["code"], number> = {
  timeout: 504,
  malformed: 502,
  upstream: 502,
  busy: 503,
};

const BUSY_RETRY_AFTER_SECONDS = "5";

const failureResponse = (error: unknown, correlationId: string, logger: Logger): Response => {
  if (error instanceof PlanGenerationError) {
    const upstream =
      error.upstreamStatus === undefined ? {} : { upstreamStatus: error.upstreamStatus };
    logger.warn("plan generation failed", { correlationId, code: error.code, ...upstream });
    return errorResponse(
      { error: error.message },
      {
        status: STATUS_BY_FAILURE[error.code],
        correlationId,
        ...(error.code === "busy" ? { headers: { "Retry-After": BUSY_RETRY_AFTER_SECONDS } } : {}),
      },
    );
  }
  logger.error("unexpected plan route error", {
    correlationId,
    reason: error instanceof Error ? error.name : "unknown",
  });
  return errorResponse(
    { error: "Something went wrong. Please try again." },
    { status: 500, correlationId },
  );
};

const validationResponse = (error: z.ZodError, correlationId: string): Response =>
  errorResponse(
    {
      error: "Please correct the highlighted fields.",
      issues: error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    },
    { status: 400, correlationId },
  );

export const createPlanRoute =
  <TInput>(definition: RouteDefinition<TInput>, deps: RouteDependencies): PlanRoute =>
  async (request) => {
    const correlationId = crypto.randomUUID();
    if (isCrossSiteRequest(request))
      return errorResponse(
        { error: "Cross-site requests are not allowed" },
        { status: 403, correlationId },
      );

    const decision = deps.limiter.consume(clientKey(request));
    if (!decision.allowed) {
      return errorResponse(
        { error: "Too many requests. Please wait a moment." },
        {
          status: 429,
          correlationId,
          headers: { "Retry-After": String(decision.retryAfterSeconds) },
        },
      );
    }

    const body = await readJsonBody(request, LIMITS.requestBodyBytes);
    if (!body.ok)
      return errorResponse({ error: body.message }, { status: body.status, correlationId });

    const parsed = definition.schema.safeParse(body.value);
    if (!parsed.success) return validationResponse(parsed.error, correlationId);

    const signal = AbortSignal.any([
      AbortSignal.timeout(deps.timeoutMs ?? API.requestTimeoutMs),
      request.signal,
    ]);
    try {
      const plan = await definition.execute(parsed.data, deps.generator(), signal);
      return jsonResponse(plan, { status: 200, correlationId });
    } catch (error) {
      // 499: client closed the request; nobody is listening for the response.
      if (request.signal.aborted) return new Response(null, { status: 499 });
      return failureResponse(error, correlationId, deps.logger);
    }
  };
