"use client";

import { useState } from "react";

import type { Intake } from "@/lib/schema";

import { detailsFor, toDetailsValues, type DetailsUpdate, type DetailsValues } from "./formValues";

/** Type-specific details for every event type, so switching type keeps what was typed. */
export const useDetailsState = (initial?: Intake): [DetailsValues, DetailsUpdate] => {
  const [details, setDetails] = useState<DetailsValues>(() =>
    initial ? toDetailsValues(initial) : {},
  );
  const update: DetailsUpdate = (type, patch) => {
    setDetails((current) => ({ ...current, [type]: { ...detailsFor(current, type), ...patch } }));
  };
  return [details, update];
};
