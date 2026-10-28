"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import type { ReactElement } from "react";

import { DoneMark } from "@/components/ui/DoneMark";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/Icons";
import { CARD, CHECKBOX, SECTION_HEADING } from "@/components/ui/styles";
import { vendorProgress } from "@/lib/vendors";
import type { Vendor } from "@/lib/schema";

export type VendorChecklistProps = {
  vendors: readonly Vendor[];
  onToggle?: (id: string) => void;
};

type VendorItemProps = { vendor: Vendor; onToggle: ((id: string) => void) | undefined };

const VendorName = ({
  vendor,
  interactive,
}: {
  vendor: Vendor;
  interactive: boolean;
}): ReactElement =>
  interactive ? (
    <label htmlFor={`vendor-${vendor.id}`} className="cursor-pointer font-semibold">
      {vendor.category}
    </label>
  ) : (
    <span className="font-semibold">
      {vendor.category}
      <span className="sr-only">{vendor.booked ? " (booked)" : " (not booked)"}</span>
    </span>
  );

const VendorControl = ({ vendor, onToggle }: VendorItemProps): ReactElement =>
  onToggle ? (
    <Checkbox.Root
      id={`vendor-${vendor.id}`}
      checked={vendor.booked}
      onCheckedChange={() => {
        onToggle(vendor.id);
      }}
      className={CHECKBOX}
    >
      <Checkbox.Indicator aria-hidden="true">
        <CheckIcon />
      </Checkbox.Indicator>
    </Checkbox.Root>
  ) : (
    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
      <DoneMark done={vendor.booked} />
    </span>
  );

const VendorBody = ({ vendor, onToggle }: VendorItemProps): ReactElement => (
  <div className="flex items-start gap-3">
    <VendorControl vendor={vendor} onToggle={onToggle} />
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <VendorName vendor={vendor} interactive={Boolean(onToggle)} />
      <p className="text-sm leading-relaxed text-ink-muted">{vendor.whyNeeded}</p>
      <details className="group mt-1 text-sm">
        <summary className="flex min-h-11 w-fit cursor-pointer items-center gap-1 rounded-md font-medium text-brand sm:min-h-8">
          Questions to ask
          <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 marker:text-ink-muted">
          {vendor.questionsToAsk.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </details>
    </div>
  </div>
);

export const VendorChecklist = ({ vendors, onToggle }: VendorChecklistProps): ReactElement => {
  const progress = vendorProgress(vendors);
  return (
    <section aria-labelledby="vendors-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 id="vendors-heading" className={SECTION_HEADING}>
          Vendor checklist
        </h2>
        <p id="vendors-progress" role="status" className="text-sm font-medium text-ink-muted">
          {progress.booked} of {progress.total} vendors booked
        </p>
        <progress
          aria-labelledby="vendors-progress"
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
