"use client";

import "./globals.css";

import type { ReactElement } from "react";

import { errorDigest } from "@/lib/errors";

type GlobalErrorProps = Readonly<{ error: unknown; retry: () => void }>;

export default function GlobalError({ error, retry }: GlobalErrorProps): ReactElement {
  const digest = errorDigest(error);
  return (
    <html lang="en">
      <body className="min-h-screen p-6">
        <title>Something went wrong · EventCraft</title>
        <main className="mx-auto flex max-w-xl flex-col gap-4">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p>EventCraft could not be displayed. Your saved plan in this browser is unaffected.</p>
          {digest === null ? null : (
            <p className="text-sm">
              Reference id: <code>{digest}</code>
            </p>
          )}
          <button type="button" className="self-start rounded-md border px-4 py-2" onClick={retry}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
