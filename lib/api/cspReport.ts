import "server-only";

import { z } from "zod";

import { countBy } from "@/lib/collections";
import { LIMITS } from "@/lib/constants";
import { clientKey, readJsonBody } from "@/lib/http";
import type { Logger } from "@/lib/logger";
import type { RateLimiter } from "@/lib/rateLimit";

import { emptyResponse, rateLimitHeaders, rejectRequest, type Rejection } from "./responses";

export type CspReportDependencies = { limiter: RateLimiter; logger: Logger };

type Violation = { directive: string; blocked: string };

const REPORT_MEDIA_TYPES: readonly string[] = [
  "application/reports+json",
  "application/csp-report",
];

// Reporting API (report-to): a list of reports, of which only csp-violation ones are read.
const ReportListSchema = z.array(z.unknown());
const CspViolationReportSchema = z.object({
  type: z.literal("csp-violation"),
  body: z.object({
    effectiveDirective: z.string().catch(""),
    blockedURL: z.string().catch(""),
  }),
});

// Legacy report-uri format.
const LegacyReportSchema = z.object({
  "csp-report": z.object({
    "effective-directive": z.string().optional(),
    "violated-directive": z.string().catch(""),
    "blocked-uri": z.string().catch(""),
  }),
});

const NOT_A_REPORT: Rejection = {
  status: 400,
  reason: "validation_failed",
  message: "Request body is not a CSP violation report",
};

// Keeps logged values to short keyword-like tokens so report content cannot shape the log.
const KEYWORD = /^[a-z][a-z0-9-]{0,39}$/;

const asKeyword = (value: string): string => (KEYWORD.test(value) ? value : "other");

// Legacy reports may carry the whole directive ("script-src 'self'"); only its name is kept.
const directiveName = (value: string): string =>
  asKeyword(value.trim().split(/\s/, 1).join("").toLowerCase());

const blockedSource = (value: string): string => {
  const url = URL.parse(value);
  if (url === null) {
    return asKeyword(value);
  }
  return url.host === "" ? url.protocol : url.host;
};

const toViolations = (value: unknown): Violation[] => {
  const list = ReportListSchema.safeParse(value);
  if (list.success) {
    return list.data.flatMap((item) => {
      const report = CspViolationReportSchema.safeParse(item);
      return report.success
        ? [{ directive: report.data.body.effectiveDirective, blocked: report.data.body.blockedURL }]
        : [];
    });
  }
  const legacy = LegacyReportSchema.safeParse(value);
  if (!legacy.success) {
    return [];
  }
  const report = legacy.data["csp-report"];
  return [
    {
      directive: report["effective-directive"] ?? report["violated-directive"],
      blocked: report["blocked-uri"],
    },
  ];
};

const tally = (values: readonly string[]): string =>
  [...countBy(values)].map(([value, count]) => `${value}=${String(count)}`).join(",");

/** POST handler for browser CSP violation reports: rate limited, size capped, logs counts only. */
export const createCspReportRoute =
  (deps: CspReportDependencies): ((request: Request) => Promise<Response>) =>
  async (request) => {
    const correlationId = crypto.randomUUID();
    const reject = (rejection: Rejection): Response =>
      rejectRequest(rejection, correlationId, deps.logger);
    const decision = deps.limiter.consume(clientKey(request));
    if (!decision.allowed) {
      return reject({
        status: 429,
        reason: "rate_limited",
        message: "Too many reports. Please wait a moment.",
        headers: {
          ...rateLimitHeaders(decision),
          "Retry-After": String(decision.retryAfterSeconds),
        },
      });
    }
    const body = await readJsonBody(request, LIMITS.cspReportBodyBytes, REPORT_MEDIA_TYPES);
    if (!body.ok) {
      return reject(body);
    }
    const violations = toViolations(body.value);
    if (violations.length === 0) {
      return reject(NOT_A_REPORT);
    }
    deps.logger.warn("csp violation", {
      correlationId,
      reports: violations.length,
      directives: tally(violations.map((violation) => directiveName(violation.directive))),
      blocked: tally(violations.map((violation) => blockedSource(violation.blocked))),
    });
    return emptyResponse({ status: 204, correlationId });
  };
