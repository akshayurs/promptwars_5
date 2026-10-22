import Link from "next/link";
import type { ReactElement } from "react";

export default function NotFound(): ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-ink-muted">That page does not exist.</p>
      <Link href="/" className="text-brand underline">
        Back to the intake form
      </Link>
    </section>
  );
}
