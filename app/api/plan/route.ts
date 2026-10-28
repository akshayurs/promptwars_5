import { routeDependencies } from "@/lib/api/deps";
import { createPlanRoute } from "@/lib/api/planRoute";
import { methodNotAllowed } from "@/lib/api/responses";
import { fitPlanToIntake, toPlan } from "@/lib/plan";
import { IntakeSchema } from "@/lib/schema";

// Seconds, kept above API.requestTimeoutMs; Next.js only accepts a literal segment config.
export const maxDuration = 60;

export const POST = createPlanRoute(
  {
    schema: IntakeSchema,
    execute: async (intake, generator, context) =>
      toPlan(fitPlanToIntake(await generator.generate(intake, context), intake)),
  },
  routeDependencies,
);
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
