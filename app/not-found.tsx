import Link from "next/link";
import type { ReactElement } from "react";

import { ArrowRightIcon } from "@/components/ui/Icons";
import { CARD_PADDED, PAGE_TITLE, TEXT_LINK } from "@/components/ui/styles";

export default function NotFound(): ReactElement {
  return (
    <section className={`${CARD_PADDED} mx-auto flex w-full max-w-xl flex-col gap-3`}>
      <p className="text-sm font-semibold text-brand">404</p>
      <h1 className={PAGE_TITLE}>Page not found</h1>
      <p className="text-ink-muted">That page does not exist.</p>
      <Link href="/" className={`${TEXT_LINK} flex min-h-11 w-fit items-center gap-1.5`}>
        Back to the intake form
        <ArrowRightIcon />
      </Link>
    </section>
  );
}
