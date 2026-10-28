import type { Admission, EventType } from "@/lib/types";

/** Display names for each event type, shared by the intake form and the workspace badge. */
export const EVENT_TYPE_LABELS: Readonly<Record<EventType, string>> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

/** Display names for community event admission types. */
export const ADMISSION_LABELS: Readonly<Record<Admission, string>> = {
  free: "Free",
  ticketed: "Ticketed",
};
