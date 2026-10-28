import "server-only";

import { z } from "zod";

import { buildGeneratedPlanSchema, strictPlanFactories, type PlanFactories } from "@/lib/schema";
import { truncateAtWord } from "@/lib/text";

// Descriptions are the only way limits reach the model: Gemini cannot serve length/count keywords.
const describedFactories: PlanFactories = {
  text: (max) => strictPlanFactories.text(max).describe(`Plain text, under ${max} characters`),
  list: (item, bounds) =>
    strictPlanFactories.list(item, bounds).describe(`${bounds.min} to ${bounds.max} items`),
  days: strictPlanFactories.days,
};

// Model output is coerced to fit rather than rejected; minimum constraints still apply.
const lenientFactories: PlanFactories = {
  text: (max) =>
    z
      .string()
      .trim()
      .min(1)
      .transform((value) => truncateAtWord(value, max)),
  list: (item, { min, max }) =>
    z
      .array(item)
      .min(min)
      .transform((values) => values.slice(0, max)),
  days: (max) =>
    z
      .number()
      .int()
      .min(0)
      .transform((value) => Math.min(value, max)),
};

/** Source of the Gemini response JSON schema; must stay free of transforms. */
export const GeneratedPlanSchema = buildGeneratedPlanSchema(describedFactories);

/** Parses model output, truncating over-long strings and arrays instead of rejecting them. */
export const LenientGeneratedPlanSchema = buildGeneratedPlanSchema(lenientFactories);
