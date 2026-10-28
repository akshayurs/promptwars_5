export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export const ADMISSION_TYPES = ["free", "ticketed"] as const;
export const MILESTONE_PHASES = ["planning", "booking", "final-prep", "event-day"] as const;

export const LIMITS = {
  shortText: 80,
  mediumText: 200,
  longText: 500,
  summaryText: 600,
  minAge: 1,
  maxAge: 120,
  minGuests: 1,
  maxGuests: 100_000,
  maxBudget: 1_000_000_000,
  maxYearsAhead: 5,
  maxDaysBeforeEvent: 1_095,
  budgetLines: { min: 3, max: 15 },
  milestones: { min: 4, max: 25 },
  vendors: { min: 3, max: 15 },
  ideas: { min: 3, max: 10 },
  questionsPerVendor: 5,
  truncationMinKeepRatio: 0.6,
  requestBodyBytes: 32_768,
} as const;

export const API = {
  requestTimeoutMs: 45_000,
  rateLimit: { capacity: 10, refillPerSecond: 0.2, maxKeys: 10_000 },
  geminiModel: "gemini-2.5-flash",
  geminiMaxOutputTokens: 16_384,
  geminiThinkingBudget: 512,
} as const;

export const STORAGE_KEY = "eventcraft.plan.v2";
export const DAY_MS = 86_400_000;
export const DUE_SOON_DAYS = 7;
