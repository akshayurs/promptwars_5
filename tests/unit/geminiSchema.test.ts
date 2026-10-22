import { z } from "zod";
import { describe, expect, it } from "vitest";

import { toGeminiResponseSchema } from "@/lib/geminiSchema";
import { GeneratedPlanSchema } from "@/lib/schema";

const DROPPED = ["$schema", "minLength", "maxLength", "minimum", "maximum", "minItems", "maxItems"];

const collectKeys = (node: unknown, keys = new Set<string>()): Set<string> => {
  if (Array.isArray(node)) {
    for (const item of node) collectKeys(item, keys);
  } else if (typeof node === "object" && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      keys.add(key);
      collectKeys(value, keys);
    }
  }
  return keys;
};

type JsonNode = {
  type?: string;
  properties?: Record<string, JsonNode>;
  required?: string[];
  items?: JsonNode;
  enum?: string[];
  description?: string;
  additionalProperties?: boolean;
};

describe("toGeminiResponseSchema", () => {
  const schema = toGeminiResponseSchema(GeneratedPlanSchema) as JsonNode;

  it("drops every keyword Gemini cannot serve", () => {
    const keys = collectKeys(schema);
    for (const key of DROPPED) expect(keys.has(key)).toBe(false);
  });

  it("keeps the object structure, required fields, enums and descriptions", () => {
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(["summary", "budget", "timeline", "vendors", "ideas"]);
    expect(schema.additionalProperties).toBe(false);
    const timeline = schema.properties?.timeline;
    expect(timeline?.type).toBe("array");
    expect(timeline?.description).toBe("4 to 25 items");
    const milestone = timeline?.items;
    expect(milestone?.properties?.phase?.enum).toEqual([
      "planning",
      "booking",
      "final-prep",
      "event-day",
    ]);
    expect(milestone?.properties?.title?.description).toBe("Plain text, under 80 characters");
    expect(milestone?.properties?.daysBeforeEvent?.type).toBe("integer");
  });

  it("does not drop properties that share a keyword name", () => {
    const result = toGeminiResponseSchema(
      z.object({ minimum: z.number().min(1), tags: z.array(z.string()).max(2) }),
    ) as JsonNode;
    expect(Object.keys(result.properties ?? {})).toEqual(["minimum", "tags"]);
    expect(result.required).toEqual(["minimum", "tags"]);
    expect(collectKeys(result).has("maxItems")).toBe(false);
  });
});
