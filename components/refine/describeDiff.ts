import type { PlanDiff } from "@/lib/plan";

const DIFF_LABELS = [
  ["budget", "budget line"],
  ["timeline", "milestone"],
  ["vendors", "vendor"],
  ["ideas", "idea"],
] as const;

const countOf = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Plain-language summary of what a refinement changed. */
export const describeDiff = (diff: PlanDiff): string => {
  const changed = DIFF_LABELS.filter(([key]) => diff[key] > 0).map(([key, noun]) =>
    countOf(diff[key], noun),
  );
  return changed.length > 0
    ? `Updated ${changed.join(", ")}.`
    : "The plan already matched your request.";
};
