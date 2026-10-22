/** Server error digest forwarded by Next.js to error boundaries, if any. */
export const errorDigest = (error: unknown): string | null =>
  error instanceof Error && "digest" in error && typeof error.digest === "string"
    ? error.digest
    : null;
