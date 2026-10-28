import { z } from "zod";

// Gemini rejects schemas carrying these keywords ("too many states for serving");
// Zod still enforces every limit when the response is parsed.
const UNSUPPORTED_KEYWORDS: ReadonlySet<string> = new Set([
  "$schema",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "minItems",
  "maxItems",
]);

const stripKeywords = (node: unknown, isPropertyMap = false): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => stripKeywords(item));
  }
  if (typeof node !== "object" || node === null) {
    return node;
  }
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => isPropertyMap || !UNSUPPORTED_KEYWORDS.has(key))
      .map(([key, value]) => [key, stripKeywords(value, !isPropertyMap && key === "properties")]),
  );
};

/** JSON schema for Gemini's responseJsonSchema, without the constraint keywords it cannot serve. */
export const toGeminiResponseSchema = (schema: z.ZodType): unknown =>
  stripKeywords(z.toJSONSchema(schema));
