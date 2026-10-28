import "server-only";

import { GoogleGenAI, HarmBlockThreshold, HarmCategory, type SafetySetting } from "@google/genai";
import { API } from "@/lib/constants";
import { systemClock, toIsoDay, type Clock } from "@/lib/dates";
import { toGeminiResponseSchema } from "@/lib/geminiSchema";
import { parseGenerated, toGenerationError, usageFields } from "@/lib/geminiResponse";
import { GeneratedPlanSchema } from "@/lib/generatedPlanSchema";
import { logger as defaultLogger, type Logger } from "@/lib/logger";
import { uncoveredBudgetCategories } from "@/lib/plan";
import { buildPlanPrompt, buildRefinePrompt, withCoverageNote, type Prompt } from "@/lib/prompts";
import type { GeneratedPlan, Intake, RefineRequest } from "@/lib/schema";

export { PlanGenerationError } from "@/lib/geminiResponse";

export type ModelClient = Pick<GoogleGenAI, "models">;

export type GenerationContext = { signal: AbortSignal; correlationId: string };

export type PlanGenerator = {
  generate(intake: Intake, context: GenerationContext): Promise<GeneratedPlan>;
  refine(request: RefineRequest, context: GenerationContext): Promise<GeneratedPlan>;
};

export type PlanGeneratorOptions = { clock?: Clock; logger?: Logger };

type Operation = keyof typeof API.geminiTemperature;
type Attempt = { context: GenerationContext; attempt: number };

const RESPONSE_JSON_SCHEMA = toGeminiResponseSchema(GeneratedPlanSchema);

const SAFETY_SETTINGS: SafetySetting[] = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

// Malformed replies and vendor-coverage gaps share one retry budget.
const canRetry = ({ context, attempt }: Attempt): boolean =>
  attempt <= API.geminiMalformedRetries && !context.signal.aborted;

type CallModel = (operation: Operation, prompt: Prompt, call: Attempt) => Promise<GeneratedPlan>;

const createModelCaller =
  (client: ModelClient, { clock, logger }: Required<PlanGeneratorOptions>): CallModel =>
  async (
    operation: Operation,
    prompt: Prompt,
    { context, attempt }: Attempt,
  ): Promise<GeneratedPlan> => {
    const startedAt = clock().getTime();
    const response = await client.models.generateContent({
      model: API.geminiModel,
      contents: prompt.user,
      config: {
        systemInstruction: prompt.system,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        safetySettings: SAFETY_SETTINGS,
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

/**
 * Plan generator over the Gemini client: structured output, explicit safety thresholds and one
 * retry, spent on a malformed reply or on budget lines left without a vendor.
 */
export const createPlanGenerator = (
  client: ModelClient,
  { clock = systemClock, logger = defaultLogger }: PlanGeneratorOptions = {},
): PlanGenerator => {
  const callModel = createModelCaller(client, { clock, logger });

  // A valid plan is never lost: a failed or worse coverage retry returns the first plan.
  const coverVendors = async (
    operation: Operation,
    prompt: Prompt,
    { plan, ...call }: Attempt & { plan: GeneratedPlan },
  ): Promise<GeneratedPlan> => {
    const uncovered = uncoveredBudgetCategories(plan);
    if (uncovered.length === 0 || !canRetry(call)) {
      return plan;
    }
    const { correlationId } = call.context;
    logger.info("vendor coverage gap", { correlationId, operation, uncovered: uncovered.length });
    try {
      const retried = await callModel(operation, withCoverageNote(prompt, uncovered), {
        context: call.context,
        attempt: call.attempt + 1,
      });
      return uncoveredBudgetCategories(retried).length <= uncovered.length ? retried : plan;
    } catch (error) {
      logger.warn("vendor coverage retry failed", {
        correlationId,
        code: toGenerationError(error).code,
      });
      return plan;
    }
  };

  const callWithRetry = async (
    operation: Operation,
    prompt: Prompt,
    context: GenerationContext,
  ): Promise<GeneratedPlan> => {
    for (let attempt = 1; ; attempt += 1) {
      let plan: GeneratedPlan;
      try {
        plan = await callModel(operation, prompt, { context, attempt });
      } catch (error) {
        const failure = toGenerationError(error);
        if (failure.code !== "malformed" || !canRetry({ context, attempt })) {
          throw failure;
        }
        continue;
      }
      return coverVendors(operation, prompt, { context, attempt, plan });
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
