import "server-only";

import type { RejectionReason } from "@/lib/http";
import type { Logger } from "@/lib/logger";
import type { RateLimitDecision } from "@/lib/rateLimit";

type HeaderMap = Record<string, string>;

// JSON is never rendered as a document, so nothing on these responses may load or be framed.
const API_RESPONSE_HEADERS: Readonly<HeaderMap> = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
};

const RATE_LIMIT_POLICY = '"default"';

export type ApiErrorBody = {
  error: string;
  correlationId: string;
  issues?: ReadonlyArray<{ path: string; message: string }>;
};

export type ResponseOptions = {
  status: number;
  correlationId: string;
  headers?: HeaderMap;
};

export type Rejection = Omit<ApiErrorBody, "correlationId" | "error"> & {
  status: number;
  reason: RejectionReason;
  message: string;
  headers?: HeaderMap;
};

const responseHeaders = ({ correlationId, headers = {} }: ResponseOptions): HeaderMap => ({
  ...API_RESPONSE_HEADERS,
  "X-Request-Id": correlationId,
  ...headers,
});

/** JSON response with the API's no-store, no-sniff, locked-down CSP and request id headers. */
export const jsonResponse = (body: unknown, options: ResponseOptions): Response =>
  Response.json(body, { status: options.status, headers: responseHeaders(options) });

/** Error response whose body repeats the correlation id from the X-Request-Id header. */
export const errorResponse = (
  body: Omit<ApiErrorBody, "correlationId">,
  options: ResponseOptions,
): Response => jsonResponse({ ...body, correlationId: options.correlationId }, options);

/** Body-less response carrying the same headers as every other API response. */
export const emptyResponse = (options: ResponseOptions): Response =>
  new Response(null, { status: options.status, headers: responseHeaders(options) });

/** IETF RateLimit-Policy and RateLimit fields describing the caller's token bucket. */
export const rateLimitHeaders = (decision: RateLimitDecision): HeaderMap => ({
  "RateLimit-Policy": `${RATE_LIMIT_POLICY};q=${decision.limit};w=${decision.windowSeconds}`,
  RateLimit: `${RATE_LIMIT_POLICY};r=${decision.remaining};t=${decision.resetSeconds}`,
});

/** Logs a rejected request by status and reason (never its body) and returns the error response. */
export const rejectRequest = (
  { status, reason, message, headers, issues }: Rejection,
  correlationId: string,
  logger: Logger,
): Response => {
  logger.warn("request rejected", { correlationId, status, reason });
  return errorResponse(
    { error: message, ...(issues === undefined ? {} : { issues }) },
    { status, correlationId, ...(headers === undefined ? {} : { headers }) },
  );
};

/** 405 for every method a POST-only route handler does not serve. */
export const methodNotAllowed = (): Response =>
  errorResponse(
    { error: "Method not allowed" },
    { status: 405, correlationId: crypto.randomUUID(), headers: { Allow: "POST" } },
  );
