import type { ReactElement } from "react";

import { errorDigest } from "@/lib/errors";

/** The server error digest as a reference id the user can quote, when Next.js provides one. */
export const ErrorReference = ({ error }: { error: unknown }): ReactElement | null => {
  const digest = errorDigest(error);
  if (digest === null) {
    return null;
  }
  return (
    <p className="text-sm text-ink-muted">
      Reference id:{" "}
      <code className="rounded bg-surface-muted px-1.5 py-0.5 text-ink">{digest}</code>
    </p>
  );
};
