import { useId, type ReactElement } from "react";

import { bindToggle, CheckControl } from "@/components/ui/CheckControl";
import { ChevronDownIcon } from "@/components/ui/Icons";
import { CARD, SECTION_HEADING } from "@/components/ui/styles";
import type { Toggle } from "@/components/workspace/types";
import type { Vendor } from "@/lib/schema";
import { vendorProgress } from "@/lib/vendors";

export type VendorChecklistProps = {
  vendors: readonly Vendor[];
  onToggle?: Toggle;
};

type VendorItemProps = { vendor: Vendor; onToggle: Toggle | undefined };

const VendorName = ({
  vendor,
  controlId,
}: {
  vendor: Vendor;
  controlId: string | null;
}): ReactElement =>
  controlId === null ? (
    <span className="font-semibold">
      {vendor.category}
      <span className="sr-only">{vendor.booked ? " (booked)" : " (not booked)"}</span>
    </span>
  ) : (
    <label htmlFor={controlId} className="cursor-pointer font-semibold">
      {vendor.category}
    </label>
  );

// The model may repeat a question; each is listed once and doubles as a unique key.
const VendorQuestions = ({ vendor }: { vendor: Vendor }): ReactElement => (
  <details className="group mt-1 text-sm">
    <summary className="flex min-h-11 w-fit cursor-pointer items-center gap-1 rounded-md font-medium text-brand sm:min-h-8">
      Questions to ask
      <span className="sr-only">{`: ${vendor.category}`}</span>
      <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
    </summary>
    <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 marker:text-ink-muted">
      {[...new Set(vendor.questionsToAsk)].map((question) => (
        <li key={question}>{question}</li>
      ))}
    </ul>
  </details>
);

const VendorBody = ({ vendor, onToggle }: VendorItemProps): ReactElement => {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <CheckControl id={id} checked={vendor.booked} onToggle={bindToggle(onToggle, vendor.id)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <VendorName vendor={vendor} controlId={onToggle ? id : null} />
        <p className="text-sm leading-relaxed text-ink-muted">{vendor.whyNeeded}</p>
        <VendorQuestions vendor={vendor} />
      </div>
    </div>
  );
};

export const VendorChecklist = ({ vendors, onToggle }: VendorChecklistProps): ReactElement => {
  const progress = vendorProgress(vendors);
  const id = useId();
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id={`${id}-heading`} className={SECTION_HEADING}>
          Vendor checklist
        </h2>
        <p id={`${id}-progress`} role="status" className="text-sm font-medium text-ink-muted">
          {progress.booked} of {progress.total} vendors booked
        </p>
        <progress
          aria-labelledby={`${id}-progress`}
          value={progress.booked}
          max={Math.max(progress.total, 1)}
        />
      </div>
      <ul className="flex flex-col gap-3">
        {vendors.map((vendor) => (
          <li key={vendor.id} className={`${CARD} break-inside-avoid p-4 sm:p-5`}>
            <VendorBody vendor={vendor} onToggle={onToggle} />
          </li>
        ))}
      </ul>
    </section>
  );
};
