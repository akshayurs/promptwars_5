import { DAY_MS, STORAGE_KEY } from "@/lib/constants";
import {
  StoredWorkspaceSchema,
  type EventDetails,
  type EventType,
  type Intake,
  type Plan,
  type StoredWorkspace,
} from "@/lib/schema";

import { FIXED_NOW } from "../unit/clock";

const FUTURE_DAYS = 60;

export const futureDate = (days: number = FUTURE_DAYS): string =>
  new Date(FIXED_NOW.getTime() + days * DAY_MS).toISOString().slice(0, 10);

type IntakeOverrides = Partial<Omit<Intake, "eventType" | "details">>;

export const makeIntake = (overrides: IntakeOverrides = {}): Intake => ({
  eventType: "wedding",
  details: { coupleNames: "Asha and Ravi", ceremonyStyle: "Traditional Hindu" },
  eventName: "Asha & Ravi Wedding",
  eventDate: futureDate(),
  guestCount: 150,
  totalBudget: 500_000,
  currency: "INR",
  location: "Bengaluru",
  vibe: "Warm, floral and traditional",
  mustHaves: "Live music",
  ...overrides,
});

const DETAILS_BY_TYPE = {
  wedding: { coupleNames: "Asha and Ravi", ceremonyStyle: "Traditional Hindu" },
  birthday: { honoreeName: "Aarav", honoreeAge: 7 },
  community: { admission: "free", needsPermit: true },
} as const satisfies Record<EventType, EventDetails>;

/** Builds an intake of the given event type with matching type-specific details. */
export const makeIntakeFor = (eventType: EventType, overrides: IntakeOverrides = {}): Intake => {
  const base = makeIntake(overrides);
  switch (eventType) {
    case "wedding":
      return { ...base, eventType, details: DETAILS_BY_TYPE.wedding };
    case "birthday":
      return { ...base, eventType, details: DETAILS_BY_TYPE.birthday };
    case "community":
      return { ...base, eventType, details: DETAILS_BY_TYPE.community };
  }
};

export const makePlan = (overrides: Partial<Plan> = {}): Plan => ({
  summary: "A warm floral celebration with live music.",
  budget: [
    { id: crypto.randomUUID(), category: "Venue", amount: 200_000, rationale: "Hall for guests" },
    { id: crypto.randomUUID(), category: "Catering", amount: 150_000, rationale: "Food and drink" },
    { id: crypto.randomUUID(), category: "Decor", amount: 50_000, rationale: "Flowers and lights" },
  ],
  timeline: [
    {
      id: crypto.randomUUID(),
      title: "Set the guest list",
      phase: "planning",
      daysBeforeEvent: 120,
      done: false,
      details: "Finalise names with both families",
    },
    {
      id: crypto.randomUUID(),
      title: "Book the venue",
      phase: "booking",
      daysBeforeEvent: 90,
      done: false,
      details: "Pay the deposit",
    },
    {
      id: crypto.randomUUID(),
      title: "Confirm headcount",
      phase: "final-prep",
      daysBeforeEvent: 7,
      done: false,
      details: "Share the number with caterers",
    },
    {
      id: crypto.randomUUID(),
      title: "Celebrate",
      phase: "event-day",
      daysBeforeEvent: 0,
      done: false,
      details: "Enjoy the day",
    },
  ],
  vendors: [
    {
      id: crypto.randomUUID(),
      category: "Caterer",
      whyNeeded: "Feeds the guests",
      questionsToAsk: ["Do you cover dietary needs?", "What is the per-plate price?"],
      booked: false,
    },
    {
      id: crypto.randomUUID(),
      category: "Photographer",
      whyNeeded: "Captures memories",
      questionsToAsk: ["How many hours are included?"],
      booked: false,
    },
    {
      id: crypto.randomUUID(),
      category: "Florist",
      whyNeeded: "Handles flowers",
      questionsToAsk: ["Which flowers are in season?"],
      booked: false,
    },
  ],
  ideas: [
    {
      id: crypto.randomUUID(),
      title: "Marigold arch",
      description: "A welcoming entrance arch",
      inspiredBy: "Traditional floral themes",
    },
    {
      id: crypto.randomUUID(),
      title: "Live sitar",
      description: "Music during the reception",
      inspiredBy: "Your live music request",
    },
    {
      id: crypto.randomUUID(),
      title: "Memory wall",
      description: "Guests pin photos",
      inspiredBy: "Warm personal touches",
    },
  ],
  ...overrides,
});

export const makeWorkspace = (overrides: Partial<StoredWorkspace> = {}): StoredWorkspace => ({
  version: 2,
  intake: makeIntake(),
  plan: makePlan(),
  previousPlan: null,
  savedAt: FIXED_NOW.toISOString(),
  ...overrides,
});

export const readStoredWorkspace = (): StoredWorkspace | null => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === null ? null : StoredWorkspaceSchema.parse(JSON.parse(raw));
};
