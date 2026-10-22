import { routeDependencies } from "@/lib/api/deps";
import { createPlanRoute } from "@/lib/api/planRoute";
import { fitPlanToIntake, mergeRefinedPlan } from "@/lib/plan";
import { RefineRequestSchema } from "@/lib/schema";

export const maxDuration = 60;

export const POST = createPlanRoute(
  {
    schema: RefineRequestSchema,
    execute: async (request, generator, signal) =>
      mergeRefinedPlan(
        request.plan,
        fitPlanToIntake(await generator.refine(request, signal), request.intake),
      ),
  },
  routeDependencies,
);
