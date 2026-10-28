import "server-only";

import type { z } from "zod";

import { API, LIMITS } from "@/lib/constants";
import { PlanGenerationError, type GenerationContext, type PlanGenerator } from "@/lib/gemini";
import { clientKey, isCrossSiteRequest, readJsonBody } from "@/lib/http";
import type { Logger } from "@/lib/logger";
import type { RateLimiter } from "@/lib/rateLimit";
import type { Plan } from "@/lib/schema";

import {
  emptyResponse,
  errorResponse,
  jsonResponse,
  rateLimitHeaders,
  rejectRequest,
  type Rejection,
} from "./responses";

export type RouteDependencies = {
  generator: () => PlanGenerator;
  limiter: RateLimiter;
  logger: Logger;
  timeoutMs?: number;
};

export type RouteDefinition<TInput> = {
  schema: z.ZodType<TInput>;
  execute: (input: TInput, generator: PlanGenerator, context: GenerationContext) => Promise<Plan>;
};

export type PlanRoute = (request: Request) => Promise<Response>;

type Exchange = { correlationId: string; headers: Record<string, string>; logger: Logger };

const STATUS_BY_FAILURE: Record<PlanGenerationError["code"], number> = {
  timeout: 504,
  malformed: 502,
  upstream: 502,
  busy: 503,
};

// Non-standard but widely logged status for "client closed the request".
const CLIENT_CLOSED_REQUEST = 499;

const CROSS_SITE: Rejection = {
  status: 403,
  reason: "cross_site",
  message: "Cross-site requests are not allowed",
};

const failureResponse = (
  error: unknown,
  { correlationId, headers, logger }: Exchange,
): Response => {
  if (error instanceof PlanGenerationError) {
    const upstream =
      error.upstreamStatus === undefined ? {} : { upstreamStatus: error.upstreamStatus };
    logger.warn("plan generation failed", { correlationId, code: error.code, ...upstream });
    const retryAfter =
      error.code === "busy" ? { "Retry-After": String(API.busyRetryAfterSeconds) } : {};
    return errorResponse(
      { error: error.message },
      {
        status: STATUS_BY_FAILURE[error.code],
        correlationId,
        headers: { ...headers, ...retryAfter },
      },
    );
  }
  logger.error("unexpected plan route error", {
    correlationId,
    reason: error instanceof Error ? error.name : "unknown",
  });
  return errorResponse(
    { error: "Something went wrong. Please try again." },
    { status: 500, correlationId, headers },
  );
};

const validationRejection = (error: z.ZodError): Rejection => ({
  status: 400,
  reason: "validation_failed",
  message: "Please correct the highlighted fields.",
  issues: error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  })),
});

/**
 * POST handler pipeline shared by the plan routes: same-site check, rate limit, capped JSON body,
 * schema validation, then generation under a timeout tied to the client connection.
 */
export const createPlanRoute =
  <TInput>(definition: RouteDefinition<TInput>, deps: RouteDependencies): PlanRoute =>
  async (request) => {
    const correlationId = crypto.randomUUID();
    const reject = (rejection: Rejection): Response =>
      rejectRequest(rejection, correlationId, deps.logger);
    if (isCrossSiteRequest(request)) {
      return reject(CROSS_SITE);
    }

    const decision = deps.limiter.consume(clientKey(request));
    const headers = rateLimitHeaders(decision);
    if (!decision.allowed) {
      return reject({
        status: 429,
        reason: "rate_limited",
        message: "Too many requests. Please wait a moment.",
        headers: { ...headers, "Retry-After": String(decision.retryAfterSeconds) },
      });
    }

    const body = await readJsonBody(request, LIMITS.requestBodyBytes);
    if (!body.ok) {
      return reject({ ...body, headers });
    }
    const parsed = definition.schema.safeParse(body.value);
    if (!parsed.success) {
      return reject({ ...validationRejection(parsed.error), headers });
    }

    const exchange: Exchange = { correlationId, headers, logger: deps.logger };
    const signal = AbortSignal.any([
      AbortSignal.timeout(deps.timeoutMs ?? API.requestTimeoutMs),
      request.signal,
    ]);
    try {
      const plan = await definition.execute(parsed.data, deps.generator(), {
        signal,
        correlationId,
      });
      return jsonResponse(plan, { status: 200, correlationId, headers });
    } catch (error) {
      if (request.signal.aborted) {
        deps.logger.info("client closed request", { correlationId });
        return emptyResponse({ status: CLIENT_CLOSED_REQUEST, correlationId, headers });
      }
      return failureResponse(error, exchange);
    }
  };
