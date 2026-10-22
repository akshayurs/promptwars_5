import type { GeneratedPlan, Intake, Plan, StoredWorkspace } from "@/lib/schema";

export const makeIntake = (overrides: Partial<Intake> = {}): Intake => ({
  eventType: "wedding",
  eventName: "Asha and Ravi",
  eventDate: "2030-01-15",
  guestCount: 120,
  totalBudget: 500_000,
  currency: "INR",
  location: "Bengaluru",
  vibe: "Warm, floral, relaxed",
  mustHaves: "Live music",
  ...overrides,
});

export const makeGeneratedPlan = (overrides: Partial<GeneratedPlan> = {}): GeneratedPlan => ({
  summary: "A relaxed floral celebration.",
  budget: [
    { category: "Venue", amount: 200_000, rationale: "Main hall" },
    { category: "Catering", amount: 150_000, rationale: "Dinner for guests" },
    { category: "Decor", amount: 50_000, rationale: "Flowers" },
  ],
  timeline: [
    { title: "Book venue", phase: "booking", daysBeforeEvent: 180, details: "Lock the hall" },
    { title: "Pick theme", phase: "planning", daysBeforeEvent: 240, details: "Moodboard" },
    {
      title: "Final headcount",
      phase: "final-prep",
      daysBeforeEvent: 14,
      details: "Confirm RSVPs",
    },
    { title: "Wedding day", phase: "event-day", daysBeforeEvent: 0, details: "Enjoy" },
  ],
  vendors: [
    { category: "Caterer", whyNeeded: "Food", questionsToAsk: ["Menu options?"] },
    { category: "Florist", whyNeeded: "Decor", questionsToAsk: ["Seasonal flowers?"] },
    { category: "Photographer", whyNeeded: "Memories", questionsToAsk: ["Albums included?"] },
  ],
  ideas: [
    { title: "Floral arch", description: "Marigold arch", inspiredBy: "Floral vibe" },
    { title: "Live band", description: "Acoustic set", inspiredBy: "Live music" },
    { title: "Candle aisle", description: "Warm lighting", inspiredBy: "Warm vibe" },
  ],
  ...overrides,
});

export const makePlan = (overrides: Partial<Plan> = {}): Plan => {
  const generated = makeGeneratedPlan();
  return {
    summary: generated.summary,
    budget: generated.budget.map((line) => ({ ...line, id: crypto.randomUUID() })),
    timeline: generated.timeline.map((item) => ({ ...item, id: crypto.randomUUID() })),
    vendors: generated.vendors.map((vendor) => ({
      ...vendor,
      id: crypto.randomUUID(),
      booked: false,
    })),
    ideas: generated.ideas.map((idea) => ({ ...idea, id: crypto.randomUUID() })),
    ...overrides,
  };
};

export const makeWorkspace = (overrides: Partial<StoredWorkspace> = {}): StoredWorkspace => ({
  version: 1,
  intake: makeIntake(),
  plan: makePlan(),
  previousPlan: null,
  savedAt: "2030-01-01T00:00:00.000Z",
  ...overrides,
});

export const makeMemoryStorage = (): Storage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};
