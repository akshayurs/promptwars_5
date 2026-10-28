import { ApiError, FinishReason } from "@google/genai";
import { describe, expect, it, vi } from "vitest";

import { API } from "@/lib/constants";
import {
  createGeminiClient,
  createPlanGenerator,
  PlanGenerationError,
  type GenerationContext,
  type ModelClient,
} from "@/lib/gemini";
import { createLogger } from "@/lib/logger";

import { FIXED_NOW } from "./clock";
import { makeGeneratedPlan, makeIntake, makePlan } from "./fixtures";

type Generate = ModelClient["models"]["generateContent"];
type Reply = Awaited<ReturnType<Generate>>;

const setup = (clock: () => Date = () => new Date("2030-01-01T23:30:00Z")) => {
  const generateContent = vi.fn<Generate>();
  const client = { models: { generateContent } } as unknown as ModelClient;
  const lines: string[] = [];
  const logger = createLogger((line) => lines.push(line));
  const logs = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  return { generateContent, generator: createPlanGenerator(client, { clock, logger }), logs };
};

const reply = (text: string | undefined, finishReason?: FinishReason): Reply =>
  ({
    text,
    ...(finishReason === undefined ? {} : { candidates: [{ finishReason }] }),
  }) as Reply;
const good = () => reply(JSON.stringify(makeGeneratedPlan()));
const context = (signal = new AbortController().signal): GenerationContext => ({
  signal,
  correlationId: "cid-1",
});
const refineRequest = () => ({
  intake: makeIntake(),
  plan: makePlan(),
  instruction: "Cheaper please",
});

const failureOf = async (promise: Promise<unknown>): Promise<PlanGenerationError> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof PlanGenerationError) return error;
    throw error;
  }
  throw new Error("expected rejection");
};

describe("createPlanGenerator.generate", () => {
  it("parses a valid JSON response", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    expect(await generator.generate(makeIntake(), context())).toEqual(makeGeneratedPlan());
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("passes model, schema, system instruction and abort signal", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    const call = context();
    await generator.generate(makeIntake(), call);
    const arg = generateContent.mock.calls[0]?.[0];
    expect(arg?.model).toBe(API.geminiModel);
    expect(arg?.contents).toContain("<intake>");
    expect(arg?.config?.systemInstruction).toEqual(expect.stringContaining("untrusted"));
    expect(arg?.config?.responseMimeType).toBe("application/json");
    expect(arg?.config?.responseJsonSchema).toMatchObject({ type: "object" });
    expect(arg?.config?.abortSignal).toBe(call.signal);
  });

  it("passes the generation temperature, output token cap and thinking budget", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    await generator.generate(makeIntake(), context());
    const config = generateContent.mock.calls[0]?.[0].config;
    expect(API.geminiTemperature).toEqual({ generate: 0.7, refine: 0.3 });
    expect(config?.temperature).toBe(API.geminiTemperature.generate);
    expect(config?.maxOutputTokens).toBe(API.geminiMaxOutputTokens);
    expect(config?.thinkingConfig).toEqual({ thinkingBudget: API.geminiThinkingBudget });
  });

  it.each([
    ["undefined text", undefined],
    ["empty text", ""],
    ["invalid JSON", "{oops"],
    ["schema mismatch", JSON.stringify({ summary: "x" })],
  ])("retries exactly once then throws malformed on %s", async (_label, text) => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(reply(text));
    const error = await failureOf(generator.generate(makeIntake(), context()));
    expect(error.code).toBe("malformed");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("does not retry a malformed reply once the request is aborted", async () => {
    const { generateContent, generator } = setup();
    const controller = new AbortController();
    generateContent.mockImplementation(() => {
      controller.abort();
      return Promise.resolve(reply("{oops"));
    });
    const error = await failureOf(generator.generate(makeIntake(), context(controller.signal)));
    expect(error.code).toBe("malformed");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("tells the model today's date and the days until the event", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    await generator.generate(makeIntake({ eventDate: "2030-01-15" }), context());
    const contents = generateContent.mock.calls[0]?.[0].contents as string;
    expect(contents).toContain('"Today":"2030-01-01"');
    expect(contents).toContain('"Days until the event":14');
  });

  it("truncates over-long model output instead of retrying", async () => {
    const { generateContent, generator } = setup();
    const plan = makeGeneratedPlan({ summary: "x".repeat(900) });
    generateContent.mockResolvedValue(reply(JSON.stringify(plan), FinishReason.STOP));
    const result = await generator.generate(makeIntake(), context());
    expect(result.summary).toHaveLength(600);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([FinishReason.MAX_TOKENS, FinishReason.SAFETY])(
    "throws upstream without retrying when the model stops with %s",
    async (finishReason) => {
      const { generateContent, generator } = setup();
      generateContent.mockResolvedValue(reply(JSON.stringify(makeGeneratedPlan()), finishReason));
      const error = await failureOf(generator.generate(makeIntake(), context()));
      expect(error.code).toBe("upstream");
      expect(error.message).toBe("Model stopped before completing the plan");
      expect(generateContent).toHaveBeenCalledTimes(1);
    },
  );

  it("carries the upstream HTTP status from an SDK ApiError", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockRejectedValue(new ApiError({ message: "schema", status: 400 }));
    const error = await failureOf(generator.generate(makeIntake(), context()));
    expect(error.code).toBe("upstream");
    expect(error.upstreamStatus).toBe(400);
  });

  it.each(API.geminiBusyStatuses)("maps upstream %i to busy without retrying", async (status) => {
    const { generateContent, generator } = setup();
    generateContent.mockRejectedValue(new ApiError({ message: "high demand", status }));
    const error = await failureOf(generator.generate(makeIntake(), context()));
    expect(error.code).toBe("busy");
    expect(error.message).toBe("The planning model is busy. Please try again in a moment.");
    expect(error.upstreamStatus).toBe(status);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("sends a Gemini-compatible response schema", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    await generator.generate(makeIntake(), context());
    const schema = JSON.stringify(generateContent.mock.calls[0]?.[0].config?.responseJsonSchema);
    expect(schema).not.toMatch(
      /"(\$schema|minLength|maxLength|minimum|maximum|minItems|maxItems)"/,
    );
  });

  it("succeeds when the retry returns a valid plan", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValueOnce(reply("nope")).mockResolvedValueOnce(good());
    expect(await generator.generate(makeIntake(), context())).toEqual(makeGeneratedPlan());
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("maps AbortError to timeout without retrying", async () => {
    const { generateContent, generator } = setup();
    const abort = new Error("aborted");
    abort.name = "AbortError";
    generateContent.mockRejectedValue(abort);
    const error = await failureOf(generator.generate(makeIntake(), context()));
    expect(error.code).toBe("timeout");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([new Error("503"), "string failure"])(
    "maps other errors to upstream without retrying (%s)",
    async (thrown) => {
      const { generateContent, generator } = setup();
      generateContent.mockRejectedValue(thrown);
      const error = await failureOf(generator.generate(makeIntake(), context()));
      expect(error.code).toBe("upstream");
      expect(error.name).toBe("PlanGenerationError");
      expect(error.upstreamStatus).toBeUndefined();
      expect(generateContent).toHaveBeenCalledTimes(1);
    },
  );
});

describe("createPlanGenerator usage logging", () => {
  it("logs token usage, duration and attempt per call without content", async () => {
    let time = Date.parse("2030-01-01T10:00:00Z");
    const { generateContent, generator, logs } = setup(() => {
      time += 250;
      return new Date(time);
    });
    generateContent.mockResolvedValue({
      text: JSON.stringify(makeGeneratedPlan()),
      usageMetadata: {
        promptTokenCount: 900,
        candidatesTokenCount: 2_000,
        thoughtsTokenCount: 300,
        totalTokenCount: 3_200,
      },
    } as Reply);
    await generator.generate(makeIntake(), context());
    expect(logs()).toEqual([
      expect.objectContaining({
        level: "info",
        message: "model call",
        correlationId: "cid-1",
        operation: "generate",
        attempt: 1,
        durationMs: 250,
        promptTokens: 900,
        candidateTokens: 2_000,
        thoughtTokens: 300,
        totalTokens: 3_200,
      }),
    ]);
    expect(JSON.stringify(logs())).not.toContain(makeIntake().vibe);
  });

  it("logs every attempt and zero tokens when usage is missing", async () => {
    const { generateContent, generator, logs } = setup();
    generateContent.mockResolvedValueOnce(reply("nope")).mockResolvedValueOnce(good());
    await generator.generate(makeIntake(), context());
    expect(logs().map((log) => log.attempt)).toEqual([1, 2]);
    expect(logs()[0]).toMatchObject({ promptTokens: 0, totalTokens: 0, durationMs: 0 });
  });
});

describe("createPlanGenerator.refine", () => {
  it("builds the refine prompt", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    await generator.refine(refineRequest(), context());
    const contents = generateContent.mock.calls[0]?.[0].contents;
    expect(contents).toContain("<current_plan>");
    expect(contents).toContain("Cheaper please");
  });

  it("uses the lower refine temperature and logs the refine operation", async () => {
    const { generateContent, generator, logs } = setup();
    generateContent.mockResolvedValue(good());
    await generator.refine(refineRequest(), context());
    expect(generateContent.mock.calls[0]?.[0].config?.temperature).toBe(
      API.geminiTemperature.refine,
    );
    expect(logs()[0]).toMatchObject({ operation: "refine" });
  });
});

describe("createPlanGenerator defaults", () => {
  it("uses the current date and the shared logger when nothing is injected", async () => {
    const write = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    const generateContent = vi.fn<Generate>().mockResolvedValue(good());
    const generator = createPlanGenerator({
      models: { generateContent },
    } as unknown as ModelClient);
    await generator.generate(makeIntake(), context());
    const today = FIXED_NOW.toISOString().slice(0, 10);
    expect(generateContent.mock.calls[0]?.[0].contents as string).toContain(`"Today":"${today}"`);
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"message":"model call"'));
    write.mockRestore();
  });
});

describe("createGeminiClient", () => {
  it("returns an object with models", () => {
    expect(createGeminiClient("fake-test-value")).toHaveProperty("models");
  });
});
