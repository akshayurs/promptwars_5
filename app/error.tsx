"use client";

import type { ReactElement } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ErrorReference } from "@/components/ui/ErrorReference";
import { CARD_PADDED, PAGE_TITLE } from "@/components/ui/styles";

type ErrorPageProps = Readonly<{ error: unknown; retry: () => void }>;

export default function ErrorPage({ error, retry }: ErrorPageProps): ReactElement {
  return (
    <section className={`${CARD_PADDED} mx-auto flex w-full max-w-xl flex-col gap-4`}>
      <title>Something went wrong · EventCraft</title>
      <h1 className={PAGE_TITLE}>Something went wrong</h1>
      <Alert tone="error">The page could not be displayed. Your saved plan is unaffected.</Alert>
      <ErrorReference error={error} />
      <Button onClick={retry} className="self-start">
        Try again
      </Button>
    </section>
  );
}
