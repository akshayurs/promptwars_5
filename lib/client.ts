import { z } from "zod";

import { PlanSchema, type Intake, type Plan, type RefineRequest } from "@/lib/schema";
import type { FieldIssues } from "@/lib/types";

export type ApiResult<T> =
  { ok: true; value: T } | { ok: false; message: string; issues: FieldIssues };

const ErrorBodySchema = z.object({
  error: z.string(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

const toIssueMap = (issues: ReadonlyArray<{ path: string; message: string }>): FieldIssues =>
  Object.fromEntries(issues.map((issue) => [issue.path, issue.message]));

const failure = (message: string, issues: FieldIssues = {}): ApiResult<never> => ({
  ok: false,
  message,
  issues,
});

const readFailure = (payload: unknown): ApiResult<never> => {
  const body = ErrorBodySchema.safeParse(payload);
  if (!body.success) {
    return failure("The request could not be completed.");
  }
  return failure(body.data.error, toIssueMap(body.data.issues ?? []));
};

type PostRequest<T> = { url: string; body: unknown; schema: z.ZodType<T>; signal?: AbortSignal };

const postJson = async <T>({
  url,
  body,
  schema,
  signal,
}: PostRequest<T>): Promise<ApiResult<T>> => {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    const cancelled = error instanceof Error && error.name === "AbortError";
    return failure(
      cancelled ? "The request was cancelled." : "Network error. Check your connection.",
    );
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return readFailure(payload);
  }
  const parsed = schema.safeParse(payload);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : failure("Unexpected response from server.");
};

/** Asks the server to generate a plan for the intake. */
export const requestPlan = (intake: Intake, signal?: AbortSignal): Promise<ApiResult<Plan>> =>
  postJson({ url: "/api/plan", body: intake, schema: PlanSchema, ...(signal ? { signal } : {}) });

/** Asks the server to revise the plan according to the planner's instruction. */
export const requestRefinement = (
  request: RefineRequest,
  signal?: AbortSignal,
): Promise<ApiResult<Plan>> =>
  postJson({
    url: "/api/refine",
    body: request,
    schema: PlanSchema,
    ...(signal ? { signal } : {}),
  });
