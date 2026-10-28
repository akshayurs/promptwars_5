"use client";

import type { ReactElement } from "react";

import { CakeIcon, HeartIcon, UsersIcon } from "@/components/ui/Icons";
import { EVENT_TYPES } from "@/lib/constants";
import { EVENT_TYPE_LABELS } from "@/lib/eventTypes";
import type { EventType } from "@/lib/schema";

import type { FieldsProps } from "./formState";

const EVENT_ICONS: Record<EventType, typeof HeartIcon> = {
  wedding: HeartIcon,
  birthday: CakeIcon,
  community: UsersIcon,
};

const OPTION =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-ink-muted transition-[color,background-color,border-color,box-shadow] duration-150 hover:text-ink has-checked:border-brand has-checked:bg-surface-raised has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand";

export const EventTypeChoice = ({ values, onChange }: FieldsProps): ReactElement => (
  <fieldset className="flex flex-col gap-2">
    <legend className="mb-1.5 text-sm font-medium">Event type</legend>
    <div className="grid gap-1 rounded-xl border border-line bg-surface-muted p-1 sm:grid-cols-3">
      {EVENT_TYPES.map((type) => {
        const Icon = EVENT_ICONS[type];
        return (
          <label key={type} className={OPTION}>
            <input
              type="radio"
              name="eventType"
              value={type}
              checked={values.eventType === type}
              onChange={onChange("eventType")}
              className="size-4 shrink-0 accent-brand focus-visible:outline-none"
            />
            <Icon className="size-4 text-brand" />
            {EVENT_TYPE_LABELS[type]}
          </label>
        );
      })}
    </div>
  </fieldset>
);
