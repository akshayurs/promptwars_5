"use client";

import type { ReactElement } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { errorDigest } from "@/lib/errors";

type ErrorPageProps = Readonly<{ error: unknown; retry: () => void }>;

export default function ErrorPage({ error, retry }: ErrorPageProps): ReactElement {
  const digest = errorDigest(error);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <Alert tone="error">The page could not be displayed. Your saved plan is unaffected.</Alert>
      {digest === null ? null : (
        <p className="text-sm">
          Reference id: <code>{digest}</code>
        </p>
      )}
      <Button onClick={retry}>Try again</Button>
    </section>
  );
}
