"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import type { ReactElement } from "react";

import { CheckIcon } from "@/components/ui/Icons";
import { CHECKBOX } from "@/components/ui/styles";

export type CheckboxProps = {
  id: string;
  checked: boolean;
  onToggle: () => void;
  describedBy: string | undefined;
};

export const Checkbox = ({ id, checked, onToggle, describedBy }: CheckboxProps): ReactElement => (
  <RadixCheckbox.Root
    id={id}
    checked={checked}
    aria-describedby={describedBy}
    onCheckedChange={() => {
      onToggle();
    }}
    className={CHECKBOX}
  >
    <RadixCheckbox.Indicator aria-hidden="true">
      <CheckIcon />
    </RadixCheckbox.Indicator>
  </RadixCheckbox.Root>
);
