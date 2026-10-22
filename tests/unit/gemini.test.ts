import { ApiError, FinishReason } from "@google/genai";
import { describe, expect, it, vi } from "vitest";

import { API } from "@/lib/constants";
import {
  createGeminiClient,
  createPlanGenerator,
  PlanGenerationError,
  type ModelClient,
} from "@/lib/gemini";

import { makeGeneratedPlan, makeIntake, makePlan } from "./fixtures";

type Generate = ModelClient["models"]["generateContent"];

const setup = () => {
  const generateContent = vi.fn<Generate>();
  const client = { models: { generateContent } } as unknown as ModelClient;
  const clock = () => new Date("2030-01-01T23:30:00Z");
  return { generateContent, generator: createPlanGenerator(client, clock) };
};

const reply = (text: string | undefined, finishReason?: FinishReason) =>
  ({
    text,
    ...(finishReason === undefined ? {} : { candidates: [{ finishReason }] }),
  }) as Awaited<ReturnType<Generate>>;
const good = () => reply(JSON.stringify(makeGeneratedPlan()));
const signal = () => new AbortController().signal;

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
    expect(await generator.generate(makeIntake(), signal())).toEqual(makeGeneratedPlan());
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("passes model, schema, system instruction and abort signal", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    const abort = signal();
    await generator.generate(makeIntake(), abort);
    const arg = generateContent.mock.calls[0]?.[0];
    expect(arg?.model).toBe(API.geminiModel);
    expect(arg?.contents).toContain("<intake>");
    expect(arg?.config?.systemInstruction).toEqual(expect.stringContaining("untrusted"));
    expect(arg?.config?.responseMimeType).toBe("application/json");
    expect(arg?.config?.responseJsonSchema).toMatchObject({ type: "object" });
    expect(arg?.config?.abortSignal).toBe(abort);
  });

  it.each([
    ["undefined text", undefined],
    ["empty text", ""],
    ["invalid JSON", "{oops"],
    ["schema mismatch", JSON.stringify({ summary: "x" })],
  ])("retries exactly once then throws malformed on %s", async (_label, text) => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(reply(text));
    const error = await failureOf(generator.generate(makeIntake(), signal()));
    expect(error.code).toBe("malformed");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("tells the model today's date and the days until the event", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    await generator.generate(makeIntake({ eventDate: "2030-01-15" }), signal());
    const contents = generateContent.mock.calls[0]?.[0].contents as string;
    expect(contents).toContain('"today": "2030-01-01"');
    expect(contents).toContain('"daysUntilEvent": 14');
  });

  it("truncates over-long model output instead of retrying", async () => {
    const { generateContent, generator } = setup();
    const plan = makeGeneratedPlan({ summary: "x".repeat(900) });
    generateContent.mockResolvedValue(reply(JSON.stringify(plan), FinishReason.STOP));
    const result = await generator.generate(makeIntake(), signal());
    expect(result.summary).toHaveLength(600);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([FinishReason.MAX_TOKENS, FinishReason.SAFETY])(
    "throws upstream without retrying when the model stops with %s",
    async (finishReason) => {
      const { generateContent, generator } = setup();
      generateContent.mockResolvedValue(reply(JSON.stringify(makeGeneratedPlan()), finishReason));
      const error = await failureOf(generator.generate(makeIntake(), signal()));
      expect(error.code).toBe("upstream");
      expect(error.message).toBe("Model stopped before completing the plan");
      expect(generateContent).toHaveBeenCalledTimes(1);
    },
  );

  it("carries the upstream HTTP status from an SDK ApiError", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockRejectedValue(new ApiError({ message: "schema", status: 400 }));
    const error = await failureOf(generator.generate(makeIntake(), signal()));
    expect(error.code).toBe("upstream");
    expect(error.upstreamStatus).toBe(400);
  });

  it.each([429, 503])("maps upstream %i to busy without retrying", async (status) => {
    const { generateContent, generator } = setup();
    generateContent.mockRejectedValue(new ApiError({ message: "high demand", status }));
    const error = await failureOf(generator.generate(makeIntake(), signal()));
    expect(error.code).toBe("busy");
    expect(error.message).toBe("The planning model is busy. Please try again in a moment.");
    expect(error.upstreamStatus).toBe(status);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("sends a Gemini-compatible response schema", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    await generator.generate(makeIntake(), signal());
    const schema = JSON.stringify(generateContent.mock.calls[0]?.[0].config?.responseJsonSchema);
    expect(schema).not.toMatch(
      /"(\$schema|minLength|maxLength|minimum|maximum|minItems|maxItems)"/,
    );
  });

  it("succeeds when the retry returns a valid plan", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValueOnce(reply("nope")).mockResolvedValueOnce(good());
    expect(await generator.generate(makeIntake(), signal())).toEqual(makeGeneratedPlan());
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("maps AbortError to timeout without retrying", async () => {
    const { generateContent, generator } = setup();
    const abort = new Error("aborted");
    abort.name = "AbortError";
    generateContent.mockRejectedValue(abort);
    const error = await failureOf(generator.generate(makeIntake(), signal()));
    expect(error.code).toBe("timeout");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([new Error("503"), "string failure"])(
    "maps other errors to upstream without retrying (%s)",
    async (thrown) => {
      const { generateContent, generator } = setup();
      generateContent.mockRejectedValue(thrown);
      const error = await failureOf(generator.generate(makeIntake(), signal()));
      expect(error.code).toBe("upstream");
      expect(error.name).toBe("PlanGenerationError");
      expect(error.upstreamStatus).toBeUndefined();
      expect(generateContent).toHaveBeenCalledTimes(1);
    },
  );
});

describe("createPlanGenerator.refine", () => {
  it("builds the refine prompt", async () => {
    const { generateContent, generator } = setup();
    generateContent.mockResolvedValue(good());
    await generator.refine(
      { intake: makeIntake(), plan: makePlan(), instruction: "Cheaper please" },
      signal(),
    );
    const contents = generateContent.mock.calls[0]?.[0].contents;
    expect(contents).toContain("<current_plan>");
    expect(contents).toContain("Cheaper please");
  });
});

describe("createPlanGenerator default clock", () => {
  it("uses the current date when no clock is injected", async () => {
    const generateContent = vi.fn<Generate>().mockResolvedValue(good());
    const generator = createPlanGenerator({
      models: { generateContent },
    } as unknown as ModelClient);
    await generator.generate(makeIntake(), signal());
    const today = new Date().toISOString().slice(0, 10);
    expect(generateContent.mock.calls[0]?.[0].contents as string).toContain(`"today": "${today}"`);
  });
});

describe("createGeminiClient", () => {
  it("returns an object with models", () => {
    expect(createGeminiClient("fake-test-value")).toHaveProperty("models");
  });
});
