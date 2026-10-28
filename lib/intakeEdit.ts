import type { Intake, Plan, RefineRequest } from "@/lib/schema";

// Sent as the refine request when the planner edits the event details; never shown in the UI.
const ADAPT_INSTRUCTION =
  "The planner has just updated the event details, and the intake block holds the updated " +
  "values. Use the total budget, guest count and event date exactly as the intake block gives " +
  "them; this request never changes them. Adapt every section to the intake: fit budget amounts " +
  "to its total budget and currency, reschedule milestones against its event date, size " +
  "catering, venue and vendor needs to its guest count, and reflect its location, vibe and " +
  "must-haves. Keep everything that still fits.";

/** Refine request that adapts the current plan to edited event details. */
export const buildAdaptRequest = (intake: Intake, plan: Plan): RefineRequest => ({
  intake,
  plan,
  instruction: ADAPT_INSTRUCTION,
});
