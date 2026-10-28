import "server-only";

import {
  ApiError,
  FinishReason,
  type GenerateContentResponse,
  type GenerateContentResponseUsageMetadata,
} from "@google/genai";
import { API } from "@/lib/constants";
import { LenientGeneratedPlanSchema } from "@/lib/generatedPlanSchema";
import type { GeneratedPlan } from "@/lib/schema";

type PlanGenerationFailure = "timeout" | "malformed" | "upstream" | "busy";

export class PlanGenerationError extends Error {
  constructor(
    public readonly code: PlanGenerationFailure,
    message: string,
    public readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = "PlanGenerationError";
  }
}

const SERVICE_UNAVAILABLE = "Plan generation service is unavailable";

const BUSY_STATUSES: ReadonlySet<number> = new Set<number>(API.geminiBusyStatuses);

const stoppedEarly = (response: GenerateContentResponse): boolean => {
  const finishReason = response.candidates?.[0]?.finishReason;
  const promptBlocked = response.promptFeedback?.blockReason !== undefined;
  return promptBlocked || (finishReason !== undefined && finishReason !== FinishReason.STOP);
};

/** Parses one model reply; safety blocks and early stops are upstream failures, not retried. */
export const parseGenerated = (response: GenerateContentResponse): GeneratedPlan => {
  if (stoppedEarly(response)) {
    throw new PlanGenerationError("upstream", "Model stopped before completing the plan");
  }
  const { text } = response;
  if (text === undefined || text.length === 0) {
    throw new PlanGenerationError("malformed", "Model returned an empty response");
  }
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    throw new PlanGenerationError("malformed", "Model returned invalid JSON");
  }
  const parsed = LenientGeneratedPlanSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new PlanGenerationError("malformed", "Model response did not match the plan schema");
  }
  return parsed.data;
};

/** Maps SDK, abort and parse failures onto the typed generation errors the routes understand. */
export const toGenerationError = (error: unknown): PlanGenerationError => {
  if (error instanceof PlanGenerationError) {
    return error;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new PlanGenerationError("timeout", "Plan generation timed out");
  }
  if (!(error instanceof ApiError)) {
    return new PlanGenerationError("upstream", SERVICE_UNAVAILABLE);
  }
  if (BUSY_STATUSES.has(error.status)) {
    return new PlanGenerationError(
      "busy",
      "The planning model is busy. Please try again in a moment.",
      error.status,
    );
  }
  return new PlanGenerationError("upstream", SERVICE_UNAVAILABLE, error.status);
};

/** Token counts for the call log; never includes content. */
export const usageFields = (
  usage: GenerateContentResponseUsageMetadata | undefined,
): Record<string, number> => ({
  promptTokens: usage?.promptTokenCount ?? 0,
  candidateTokens: usage?.candidatesTokenCount ?? 0,
  thoughtTokens: usage?.thoughtsTokenCount ?? 0,
  totalTokens: usage?.totalTokenCount ?? 0,
});
