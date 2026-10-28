"use client";

import "./globals.css";

import type { ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { CARD_PADDED, PAGE_TITLE } from "@/components/ui/styles";
import { errorDigest } from "@/lib/errors";

type GlobalErrorProps = Readonly<{ error: unknown; retry: () => void }>;

export default function GlobalError({ error, retry }: GlobalErrorProps): ReactElement {
  const digest = errorDigest(error);
  return (
    <html lang="en">
      <body className="min-h-screen px-4 py-16 antialiased">
        <title>Something went wrong · EventCraft</title>
        <main className={`${CARD_PADDED} mx-auto flex max-w-xl flex-col gap-4`}>
          <h1 className={PAGE_TITLE}>Something went wrong</h1>
          <p className="text-ink-muted">
            EventCraft could not be displayed. Your saved plan in this browser is unaffected.
          </p>
          {digest === null ? null : (
            <p className="text-sm text-ink-muted">
              Reference id:{" "}
              <code className="rounded bg-surface-muted px-1.5 py-0.5 text-ink">{digest}</code>
            </p>
          )}
          <Button onClick={retry} className="self-start">
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
