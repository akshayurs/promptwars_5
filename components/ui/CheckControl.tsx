"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import { DoneMark } from "@/components/ui/DoneMark";
import { CHECKBOX } from "@/components/ui/styles";
import type { Toggle } from "@/components/workspace/types";

export type CheckControlProps = {
  id: string;
  checked: boolean;
  /** Renders an interactive checkbox when set; otherwise a read-only completion mark. */
  onToggle: (() => void) | undefined;
  describedBy?: string | undefined;
  /** Screen-reader state for the read-only mark, such as "(done)". */
  readOnlyText?: string | undefined;
};

// Loaded on demand so read-only pages never download the checkbox primitive.
const Checkbox = dynamic(() => import("@/components/ui/Checkbox").then((mod) => mod.Checkbox), {
  loading: () => <span aria-hidden="true" className={CHECKBOX} />,
});

/** Binds a list-level toggle to one item, keeping "no handler" as read-only. */
export const bindToggle = (toggle: Toggle | undefined, id: string): (() => void) | undefined =>
  toggle
    ? () => {
        toggle(id);
      }
    : undefined;

export const CheckControl = ({
  id,
  checked,
  onToggle,
  describedBy,
  readOnlyText,
}: CheckControlProps): ReactElement =>
  onToggle ? (
    <Checkbox id={id} checked={checked} onToggle={onToggle} describedBy={describedBy} />
  ) : (
    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
      <DoneMark done={checked} />
      {readOnlyText ? <span className="sr-only">{readOnlyText}</span> : null}
    </span>
  );
