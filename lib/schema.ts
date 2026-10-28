import { z } from "zod";

import "@/lib/zod";
import { LIMITS, MILESTONE_PHASES, WORKSPACE_VERSION } from "@/lib/constants";
import { systemClock, type Clock } from "@/lib/dates";
import { boundedText, createIntakeSchema, IntakeFieldsSchema } from "@/lib/intakeSchema";

export {
  createIntakeSchema,
  IntakeSchema,
  type EventDetails,
  type Intake,
} from "@/lib/intakeSchema";
export type { EventType } from "@/lib/types";

type Bounds = { min: number; max: number };
type TextFactory = (max: number) => z.ZodType<string>;
type ListFactory = <T extends z.ZodType>(item: T, bounds: Bounds) => z.ZodType<Array<z.output<T>>>;
type DaysFactory = (max: number) => z.ZodType<number>;

/** How plan text, lists and day counts are validated: exactly, or coerced to fit model output. */
export type PlanFactories = { text: TextFactory; list: ListFactory; days: DaysFactory };

/** Enforces every limit exactly; the basis for stored plans and the model's response schema. */
export const strictPlanFactories: PlanFactories = {
  text: (max) => z.string().trim().min(1).max(max),
  list: (item, { min, max }) => z.array(item).min(min).max(max),
  days: (max) => z.number().int().min(0).max(max),
};

const buildPlanItems = ({ text, list, days }: PlanFactories) => ({
  budgetLine: z.object({
    category: text(LIMITS.shortText),
    amount: z
      .number()
      .min(0)
      .max(LIMITS.maxBudget)
      .describe("Amount in the event currency; all lines sum to at most the total budget"),
    rationale: text(LIMITS.mediumText),
  }),
  milestone: z.object({
    title: text(LIMITS.shortText),
    phase: z.enum(MILESTONE_PHASES),
    daysBeforeEvent: days(LIMITS.maxDaysBeforeEvent).describe(
      "Whole days before the event, 0 on event day, at most daysUntilEvent",
    ),
    details: text(LIMITS.mediumText),
  }),
  vendor: z.object({
    category: text(LIMITS.shortText),
    whyNeeded: text(LIMITS.mediumText),
    questionsToAsk: list(text(LIMITS.mediumText), { min: 1, max: LIMITS.questionsPerVendor }),
    budgetCategory: text(LIMITS.shortText).describe(
      "Category of the budget line that pays this vendor, copied exactly",
    ),
  }),
  idea: z.object({
    title: text(LIMITS.shortText),
    description: text(LIMITS.longText),
    inspiredBy: text(LIMITS.mediumText),
  }),
});

type PlanItems = ReturnType<typeof buildPlanItems>;

/** A plan as the model returns it: no ids, booking or completion state. */
export type GeneratedPlan = {
  summary: string;
  budget: Array<z.output<PlanItems["budgetLine"]>>;
  timeline: Array<z.output<PlanItems["milestone"]>>;
  vendors: Array<z.output<PlanItems["vendor"]>>;
  ideas: Array<z.output<PlanItems["idea"]>>;
};

/** Model-facing plan schema built from the given factories (see lib/generatedPlanSchema.ts). */
export const buildGeneratedPlanSchema = (factories: PlanFactories): z.ZodType<GeneratedPlan> => {
  const { text, list } = factories;
  const items = buildPlanItems(factories);
  return z.object({
    summary: text(LIMITS.summaryText),
    budget: list(items.budgetLine, LIMITS.budgetLines),
    timeline: list(items.milestone, LIMITS.milestones),
    vendors: list(items.vendor, LIMITS.vendors),
    ideas: list(items.idea, LIMITS.ideas),
  });
};

const { text, list } = strictPlanFactories;
const items = buildPlanItems(strictPlanFactories);

const withId = <T extends z.ZodRawShape>(shape: z.ZodObject<T>) =>
  shape.extend({ id: z.uuid() }).strict();

// Optional fields keep workspaces saved before they existed loading.
const BudgetLineSchema = withId(items.budgetLine).extend({ addedByUser: z.boolean().optional() });
const MilestoneSchema = withId(items.milestone).extend({ done: z.boolean() });
const VendorSchema = withId(items.vendor).extend({
  booked: z.boolean(),
  budgetCategory: text(LIMITS.shortText).optional(),
});
const IdeaSchema = withId(items.idea);

export const PlanSchema = z
  .object({
    summary: text(LIMITS.summaryText),
    budget: list(BudgetLineSchema, LIMITS.budgetLines),
    timeline: list(MilestoneSchema, LIMITS.milestones),
    vendors: list(VendorSchema, LIMITS.vendors),
    ideas: list(IdeaSchema, LIMITS.ideas),
  })
  .strict();

export type BudgetLine = z.infer<typeof BudgetLineSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type Vendor = z.infer<typeof VendorSchema>;
export type Idea = z.infer<typeof IdeaSchema>;
export type Plan = z.infer<typeof PlanSchema>;

const buildRefineRequestSchema = (intake: typeof IntakeFieldsSchema) =>
  z
    .object({
      intake,
      plan: PlanSchema,
      instruction: boundedText({
        subject: "a change",
        min: LIMITS.minInstructionChars,
        max: LIMITS.longText,
        multiline: true,
      }),
    })
    .strict();

/** Refine request; edited event details must keep the date inside the new-plan window. */
export const createRefineRequestSchema = (
  now: Clock = systemClock,
): ReturnType<typeof buildRefineRequestSchema> => buildRefineRequestSchema(createIntakeSchema(now));

export const RefineRequestSchema = createRefineRequestSchema();
export type RefineRequest = z.infer<typeof RefineRequestSchema>;

export const StoredWorkspaceSchema = z
  .object({
    version: z.literal(WORKSPACE_VERSION),
    intake: IntakeFieldsSchema,
    plan: PlanSchema,
    previousPlan: PlanSchema.nullable(),
    savedAt: z.iso.datetime(),
  })
  .strict();
export type StoredWorkspace = z.infer<typeof StoredWorkspaceSchema>;
