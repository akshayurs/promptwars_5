import "server-only";

import { ApiError, FinishReason, GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { API } from "@/lib/constants";
import { toIsoDay } from "@/lib/dates";
import { toGeminiResponseSchema } from "@/lib/geminiSchema";
import { buildPlanPrompt, buildRefinePrompt, type Prompt } from "@/lib/prompts";
import {
  GeneratedPlanSchema,
  LenientGeneratedPlanSchema,
  type GeneratedPlan,
  type Intake,
  type RefineRequest,
} from "@/lib/schema";

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

export type PlanGenerator = {
  generate(intake: Intake, signal: AbortSignal): Promise<GeneratedPlan>;
  refine(request: RefineRequest, signal: AbortSignal): Promise<GeneratedPlan>;
};

const RESPONSE_JSON_SCHEMA = toGeminiResponseSchema(GeneratedPlanSchema);
const BUSY_STATUSES: ReadonlySet<number> = new Set([429, 503]);
const RETRIES_ON_MALFORMED = 1;

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
  if (error instanceof PlanGenerationError) return error;
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

export const createPlanGenerator = (
  client: ModelClient,
  clock: () => Date = () => new Date(),
): PlanGenerator => {
  const callModel = async (prompt: Prompt, signal: AbortSignal): Promise<GeneratedPlan> => {
    const response = await client.models.generateContent({
      model: API.geminiModel,
      contents: prompt.user,
      config: {
        systemInstruction: prompt.system,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        maxOutputTokens: API.geminiMaxOutputTokens,
        thinkingConfig: { thinkingBudget: API.geminiThinkingBudget },
        abortSignal: signal,
      },
    });
    return parseGenerated(response);
  };

  const callWithRetry = async (prompt: Prompt, signal: AbortSignal): Promise<GeneratedPlan> => {
    let attemptsLeft = RETRIES_ON_MALFORMED + 1;
    for (;;) {
      attemptsLeft -= 1;
      try {
        return await callModel(prompt, signal);
      } catch (error) {
        const failure = toGenerationError(error);
        if (failure.code !== "malformed" || attemptsLeft === 0) throw failure;
      }
    }
  };

  return {
    generate: (intake, signal) => callWithRetry(buildPlanPrompt(intake, toIsoDay(clock())), signal),
    refine: (request, signal) =>
      callWithRetry(buildRefinePrompt(request, toIsoDay(clock())), signal),
  };
};

export const createGeminiClient = (apiKey: string): ModelClient =>
  new GoogleGenAI({ apiKey, httpOptions: { timeout: API.requestTimeoutMs } });
