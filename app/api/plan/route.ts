import { routeDependencies } from "@/lib/api/deps";
import { createPlanRoute } from "@/lib/api/planRoute";
import { fitPlanToIntake, toPlan } from "@/lib/plan";
import { IntakeSchema } from "@/lib/schema";

export const maxDuration = 60;

export const POST = createPlanRoute(
  {
    schema: IntakeSchema,
    execute: async (intake, generator, signal) =>
      toPlan(fitPlanToIntake(await generator.generate(intake, signal), intake)),
  },
  routeDependencies,
);
