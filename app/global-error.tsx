"use client";

import "./globals.css";

import type { ReactElement } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorReference } from "@/components/ui/ErrorReference";
import { CARD_PADDED, PAGE_TITLE } from "@/components/ui/styles";

type GlobalErrorProps = Readonly<{ error: unknown; retry: () => void }>;

export default function GlobalError({ error, retry }: GlobalErrorProps): ReactElement {
  return (
    <html lang="en">
      <body className="min-h-screen px-4 py-16 antialiased">
        <title>Something went wrong · EventCraft</title>
        <main className={`${CARD_PADDED} mx-auto flex max-w-xl flex-col gap-4`}>
          <h1 className={PAGE_TITLE}>Something went wrong</h1>
          <p className="text-ink-muted">
            EventCraft could not be displayed. Your saved plan in this browser is unaffected.
          </p>
          <ErrorReference error={error} />
          <Button onClick={retry} className="self-start">
            Try again
          </Button>
        </main>
      </body>
    </html>
  );
}
