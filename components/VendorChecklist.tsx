"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import type { ReactElement } from "react";

import { vendorProgress } from "@/lib/budget";
import type { Vendor } from "@/lib/schema";

export type VendorChecklistProps = {
  vendors: readonly Vendor[];
  onToggle?: (id: string) => void;
};

const VendorName = ({
  vendor,
  interactive,
}: {
  vendor: Vendor;
  interactive: boolean;
}): ReactElement =>
  interactive ? (
    <label htmlFor={`vendor-${vendor.id}`} className="font-medium">
      {vendor.category}
    </label>
  ) : (
    <span className="font-medium">
      {vendor.category}
      <span className="sr-only">{vendor.booked ? " (booked)" : " (not booked)"}</span>
    </span>
  );

export const VendorChecklist = ({ vendors, onToggle }: VendorChecklistProps): ReactElement => {
  const progress = vendorProgress(vendors);
  return (
    <section aria-labelledby="vendors-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="vendors-heading" className="text-lg font-semibold">
          Vendor checklist
        </h2>
        <p id="vendors-progress" role="status" className="text-sm text-ink-muted">
          {progress.booked} of {progress.total} vendors booked
        </p>
        <progress
          aria-labelledby="vendors-progress"
          value={progress.booked}
          max={Math.max(progress.total, 1)}
          className="h-2 w-full"
        />
      </div>
      <ul className="flex flex-col gap-3">
        {vendors.map((vendor) => (
          <li key={vendor.id} className="rounded-md border border-line bg-surface-raised p-4">
            <div className="flex items-start gap-3">
              {onToggle ? (
                <Checkbox.Root
                  id={`vendor-${vendor.id}`}
                  checked={vendor.booked}
                  onCheckedChange={() => {
                    onToggle(vendor.id);
                  }}
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded border border-control bg-surface data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-surface-raised"
                >
                  <Checkbox.Indicator aria-hidden="true">✓</Checkbox.Indicator>
                </Checkbox.Root>
              ) : (
                <span aria-hidden="true" className="mt-0.5 w-6 text-center">
                  {vendor.booked ? "✓" : "○"}
                </span>
              )}
              <div className="flex flex-col gap-1">
                <VendorName vendor={vendor} interactive={Boolean(onToggle)} />
                <p className="text-sm text-ink-muted">{vendor.whyNeeded}</p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-brand">Questions to ask</summary>
                  <ul className="mt-2 list-disc pl-5">
                    {vendor.questionsToAsk.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
