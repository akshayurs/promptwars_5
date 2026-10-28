import type { Intake, Plan, RefineRequest } from "@/lib/schema";

// Sent as the refine request when the planner edits the event details; never shown in the UI.
const ADAPT_INSTRUCTION =
  "The planner has just updated the event details in the intake block. Adapt every section to " +
  "the updated details: rescale budget amounts to the new total budget and currency, reschedule " +
  "milestones for the new event date, resize catering, venue and vendor needs for the new guest " +
  "count, and reflect any changed location, vibe or must-haves. Keep everything that still fits.";

/** Refine request that adapts the current plan to edited event details. */
export const buildAdaptRequest = (intake: Intake, plan: Plan): RefineRequest => ({
  intake,
  plan,
  instruction: ADAPT_INSTRUCTION,
});
