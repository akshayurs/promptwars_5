import { z } from "zod";

import "@/lib/zod";
import { LIMITS, MILESTONE_PHASES } from "@/lib/constants";
import { IntakeFieldsSchema } from "@/lib/intakeSchema";

export {
  createIntakeSchema,
  IntakeSchema,
  type EventDetails,
  type EventType,
  type Intake,
} from "@/lib/intakeSchema";

type Bounds = { min: number; max: number };
type TextFactory<T extends z.ZodType<string>> = (max: number) => T;
type ListFactory = <T extends z.ZodType>(item: T, bounds: Bounds) => z.ZodType<Array<z.output<T>>>;

// Descriptions are the only way limits reach the model: Gemini cannot serve length/count keywords.
const strictText = (max: number) =>
  z.string().trim().min(1).max(max).describe(`Plain text, under ${max} characters`);
const strictList: ListFactory = (item, { min, max }) =>
  z.array(item).min(min).max(max).describe(`${min} to ${max} items`);

// Model output is coerced to fit rather than rejected; minimum constraints still apply.
const lenientText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, max));
const lenientList: ListFactory = (item, { min, max }) =>
  z
    .array(item)
    .min(min)
    .transform((items) => items.slice(0, max));

const buildGeneratedPlanSchemas = <T extends z.ZodType<string>>(
  text: TextFactory<T>,
  list: ListFactory,
) => {
  const budgetLine = z.object({
    category: text(LIMITS.shortText),
    amount: z
      .number()
      .min(0)
      .max(LIMITS.maxBudget)
      .describe("Amount in the event currency; all lines sum to at most the total budget"),
    rationale: text(LIMITS.mediumText),
  });
  const milestone = z.object({
    title: text(LIMITS.shortText),
    phase: z.enum(MILESTONE_PHASES),
    daysBeforeEvent: z
      .number()
      .int()
      .min(0)
      .max(LIMITS.maxDaysBeforeEvent)
      .describe("Whole days before the event, 0 on event day, at most daysUntilEvent"),
    details: text(LIMITS.mediumText),
  });
  const vendor = z.object({
    category: text(LIMITS.shortText),
    whyNeeded: text(LIMITS.mediumText),
    questionsToAsk: list(text(LIMITS.mediumText), { min: 1, max: LIMITS.questionsPerVendor }),
  });
  const idea = z.object({
    title: text(LIMITS.shortText),
    description: text(LIMITS.longText),
    inspiredBy: text(LIMITS.mediumText),
  });
  const plan = z.object({
    summary: text(LIMITS.summaryText),
    budget: list(budgetLine, LIMITS.budgetLines),
    timeline: list(milestone, LIMITS.milestones),
    vendors: list(vendor, LIMITS.vendors),
    ideas: list(idea, LIMITS.ideas),
  });
  return { budgetLine, milestone, vendor, idea, plan };
};

const strict = buildGeneratedPlanSchemas(strictText, strictList);

/** Source of the Gemini response JSON schema; must stay free of transforms. */
export const GeneratedPlanSchema = strict.plan;
/** Parses model output, truncating over-long strings and arrays instead of rejecting them. */
export const LenientGeneratedPlanSchema = buildGeneratedPlanSchemas(lenientText, lenientList).plan;
export type GeneratedPlan = z.infer<typeof GeneratedPlanSchema>;

const withId = <T extends z.ZodRawShape>(shape: z.ZodObject<T>) =>
  shape.extend({ id: z.uuid() }).strict();

const BudgetLineSchema = withId(strict.budgetLine);
const MilestoneSchema = withId(strict.milestone).extend({ done: z.boolean() });
const VendorSchema = withId(strict.vendor).extend({ booked: z.boolean() });
const IdeaSchema = withId(strict.idea);

export const PlanSchema = z
  .object({
    summary: GeneratedPlanSchema.shape.summary,
    budget: z.array(BudgetLineSchema).min(LIMITS.budgetLines.min).max(LIMITS.budgetLines.max),
    timeline: z.array(MilestoneSchema).min(LIMITS.milestones.min).max(LIMITS.milestones.max),
    vendors: z.array(VendorSchema).min(LIMITS.vendors.min).max(LIMITS.vendors.max),
    ideas: z.array(IdeaSchema).min(LIMITS.ideas.min).max(LIMITS.ideas.max),
  })
  .strict();

export type BudgetLine = z.infer<typeof BudgetLineSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type Vendor = z.infer<typeof VendorSchema>;
export type Idea = z.infer<typeof IdeaSchema>;
export type Plan = z.infer<typeof PlanSchema>;

export const RefineRequestSchema = z
  .object({
    intake: IntakeFieldsSchema,
    plan: PlanSchema,
    instruction: z.string().trim().min(3).max(LIMITS.longText),
  })
  .strict();
export type RefineRequest = z.infer<typeof RefineRequestSchema>;

export const StoredWorkspaceSchema = z
  .object({
    version: z.literal(2),
    intake: IntakeFieldsSchema,
    plan: PlanSchema,
    previousPlan: PlanSchema.nullable(),
    savedAt: z.iso.datetime(),
  })
  .strict();
export type StoredWorkspace = z.infer<typeof StoredWorkspaceSchema>;
