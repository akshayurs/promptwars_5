import "server-only";

import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  type GenerateContentResponse,
  type GenerateContentResponseUsageMetadata,
} from "@google/genai";
import { API } from "@/lib/constants";
import { systemClock, toIsoDay, type Clock } from "@/lib/dates";
import { toGeminiResponseSchema } from "@/lib/geminiSchema";
import { logger as defaultLogger, type Logger } from "@/lib/logger";
import { buildPlanPrompt, buildRefinePrompt, type Prompt } from "@/lib/prompts";
import { GeneratedPlanSchema, LenientGeneratedPlanSchema } from "@/lib/generatedPlanSchema";
import type { GeneratedPlan, Intake, RefineRequest } from "@/lib/schema";

export type PlanGenerationFailure = "timeout" | "malformed" | "upstream" | "busy";

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

export type ModelClient = Pick<GoogleGenAI, "models">;

export type GenerationContext = { signal: AbortSignal; correlationId: string };

export type PlanGenerator = {
  generate(intake: Intake, context: GenerationContext): Promise<GeneratedPlan>;
  refine(request: RefineRequest, context: GenerationContext): Promise<GeneratedPlan>;
};

export type PlanGeneratorOptions = { clock?: Clock; logger?: Logger };

type Operation = keyof typeof API.geminiTemperature;

const RESPONSE_JSON_SCHEMA = toGeminiResponseSchema(GeneratedPlanSchema);
const BUSY_STATUSES: ReadonlySet<number> = new Set<number>(API.geminiBusyStatuses);

const parseGenerated = (response: GenerateContentResponse): GeneratedPlan => {
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason !== undefined && finishReason !== FinishReason.STOP) {
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

const toGenerationError = (error: unknown): PlanGenerationError => {
  if (error instanceof PlanGenerationError) {
    return error;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new PlanGenerationError("timeout", "Plan generation timed out");
  }
  if (!(error instanceof ApiError)) {
    return new PlanGenerationError("upstream", "Plan generation service is unavailable");
  }
  if (BUSY_STATUSES.has(error.status)) {
    return new PlanGenerationError(
      "busy",
      "The planning model is busy. Please try again in a moment.",
      error.status,
    );
  }
  return new PlanGenerationError(
    "upstream",
    "Plan generation service is unavailable",
    error.status,
  );
};

const usageFields = (
  usage: GenerateContentResponseUsageMetadata | undefined,
): Record<string, number> => ({
  promptTokens: usage?.promptTokenCount ?? 0,
  candidateTokens: usage?.candidatesTokenCount ?? 0,
  thoughtTokens: usage?.thoughtsTokenCount ?? 0,
  totalTokens: usage?.totalTokenCount ?? 0,
});

/** Plan generator over the Gemini client: structured output, one retry on malformed replies. */
export const createPlanGenerator = (
  client: ModelClient,
  { clock = systemClock, logger = defaultLogger }: PlanGeneratorOptions = {},
): PlanGenerator => {
  const callModel = async (
    operation: Operation,
    prompt: Prompt,
    { context, attempt }: { context: GenerationContext; attempt: number },
  ): Promise<GeneratedPlan> => {
    const startedAt = clock().getTime();
    const response = await client.models.generateContent({
      model: API.geminiModel,
      contents: prompt.user,
      config: {
        systemInstruction: prompt.system,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        temperature: API.geminiTemperature[operation],
        maxOutputTokens: API.geminiMaxOutputTokens,
        thinkingConfig: { thinkingBudget: API.geminiThinkingBudget },
        abortSignal: context.signal,
      },
    });
    logger.info("model call", {
      correlationId: context.correlationId,
      operation,
      attempt,
      durationMs: clock().getTime() - startedAt,
      ...usageFields(response.usageMetadata),
    });
    return parseGenerated(response);
  };

  const callWithRetry = async (
    operation: Operation,
    prompt: Prompt,
    context: GenerationContext,
  ): Promise<GeneratedPlan> => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await callModel(operation, prompt, { context, attempt });
      } catch (error) {
        const failure = toGenerationError(error);
        const retryable =
          failure.code === "malformed" &&
          attempt <= API.geminiMalformedRetries &&
          !context.signal.aborted;
        if (!retryable) {
          throw failure;
        }
      }
    }
  };

  return {
    generate: (intake, context) =>
      callWithRetry("generate", buildPlanPrompt(intake, toIsoDay(clock())), context),
    refine: (request, context) =>
      callWithRetry("refine", buildRefinePrompt(request, toIsoDay(clock())), context),
  };
};

/** Gemini SDK client with the request timeout applied to every call. */
export const createGeminiClient = (apiKey: string): ModelClient =>
  new GoogleGenAI({ apiKey, httpOptions: { timeout: API.requestTimeoutMs } });
