"use client";

import type { ReactElement } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CARD_PADDED, PAGE_TITLE } from "@/components/ui/styles";
import { errorDigest } from "@/lib/errors";

type ErrorPageProps = Readonly<{ error: unknown; retry: () => void }>;

export default function ErrorPage({ error, retry }: ErrorPageProps): ReactElement {
  const digest = errorDigest(error);
  return (
    <section className={`${CARD_PADDED} mx-auto flex w-full max-w-xl flex-col gap-4`}>
      <h1 className={PAGE_TITLE}>Something went wrong</h1>
      <Alert tone="error">The page could not be displayed. Your saved plan is unaffected.</Alert>
      {digest === null ? null : (
        <p className="text-sm text-ink-muted">
          Reference id:{" "}
          <code className="rounded bg-surface-muted px-1.5 py-0.5 text-ink">{digest}</code>
        </p>
      )}
      <Button onClick={retry} className="self-start">
        Try again
      </Button>
    </section>
  );
}
