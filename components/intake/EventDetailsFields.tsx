import type { ReactElement } from "react";

import type { FieldIssues } from "@/lib/types";
import type { EventType } from "@/lib/schema";

import { BirthdayFields, CommunityFields, WeddingFields } from "./DetailsFields";
import type { DetailsUpdate, DetailsValues } from "./formState";

type EventDetailsProps = {
  type: EventType;
  details: DetailsValues;
  issues: FieldIssues;
  onDetail: DetailsUpdate;
};

export const EventDetailsFields = ({
  type,
  details,
  issues,
  onDetail,
}: EventDetailsProps): ReactElement => {
  switch (type) {
    case "wedding":
      return (
        <WeddingFields
          values={details.wedding}
          issues={issues}
          onChange={(patch) => {
            onDetail("wedding", patch);
          }}
        />
      );
    case "birthday":
      return (
        <BirthdayFields
          values={details.birthday}
          issues={issues}
          onChange={(patch) => {
            onDetail("birthday", patch);
          }}
        />
      );
    case "community":
      return (
        <CommunityFields
          values={details.community}
          issues={issues}
          onChange={(patch) => {
            onDetail("community", patch);
          }}
        />
      );
  }
};
