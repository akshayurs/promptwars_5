import { routeDependencies } from "@/lib/api/deps";
import { createPlanRoute } from "@/lib/api/planRoute";
import { methodNotAllowed } from "@/lib/api/responses";
import { fitPlanToIntake, mergeRefinedPlan } from "@/lib/plan";
import { RefineRequestSchema } from "@/lib/schema";

export const maxDuration = 60;

export const POST = createPlanRoute(
  {
    schema: RefineRequestSchema,
    execute: async (request, generator, context) =>
      mergeRefinedPlan(
        request.plan,
        fitPlanToIntake(await generator.refine(request, context), request.intake),
      ),
  },
  routeDependencies,
);
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
