import type { FieldIssues } from "@/lib/types";

// Details issues keep their nested key ("details.honoreeAge") so they land on the inner field.
const issueKey = (path: readonly PropertyKey[]): string =>
  path[0] === "details" ? path.slice(0, 2).map(String).join(".") : String(path[0]);

/** Validation issues keyed by field, one message per field. */
export const firstPathIssues = (
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
): FieldIssues => Object.fromEntries(issues.map((issue) => [issueKey(issue.path), issue.message]));

/** The `error` prop for a field when it has an issue. */
export const errorFor = (
  issues: FieldIssues,
  key: string,
): { error: string } | Record<string, never> => (issues[key] ? { error: issues[key] } : {});
