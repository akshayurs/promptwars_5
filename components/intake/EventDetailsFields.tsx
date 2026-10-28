"use client";

import type { ReactElement } from "react";

import type { EventType, FieldIssues } from "@/lib/types";

import { BirthdayFields, CommunityFields, WeddingFields, type DetailsProps } from "./DetailsFields";
import { detailsFor, type DetailsUpdate, type DetailsValues } from "./formValues";

const DETAILS_FIELDS: { readonly [T in EventType]: (props: DetailsProps<T>) => ReactElement } = {
  wedding: WeddingFields,
  birthday: BirthdayFields,
  community: CommunityFields,
};

type EventDetailsProps<T extends EventType> = {
  type: T;
  details: DetailsValues;
  issues: FieldIssues;
  onDetail: DetailsUpdate;
};

/** The fieldset for the chosen event type's own details. */
export const EventDetailsFields = <T extends EventType>({
  type,
  details,
  issues,
  onDetail,
}: EventDetailsProps<T>): ReactElement => {
  const Fields: (props: DetailsProps<T>) => ReactElement = DETAILS_FIELDS[type];
  return (
    <Fields
      values={detailsFor(details, type)}
      issues={issues}
      onChange={(patch) => {
        onDetail(type, patch);
      }}
    />
  );
};
