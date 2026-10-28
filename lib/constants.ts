export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export const ADMISSION_TYPES = ["free", "ticketed"] as const;
export const MILESTONE_PHASES = ["planning", "booking", "final-prep", "event-day"] as const;

export const LIMITS = {
  shortText: 80,
  mediumText: 200,
  longText: 500,
  summaryText: 600,
  minTextChars: 2,
  minVibeChars: 3,
  minInstructionChars: 3,
  minAge: 1,
  maxAge: 120,
  minGuests: 1,
  maxGuests: 100_000,
  maxBudget: 1_000_000_000,
  maxYearsAhead: 5,
  /** Event dates may be one day before the UTC "today" so planners west of UTC can pick theirs. */
  pastDateGraceDays: 1,
  maxDaysBeforeEvent: 1_095,
  budgetLines: { min: 3, max: 15 },
  milestones: { min: 4, max: 25 },
  vendors: { min: 3, max: 15 },
  ideas: { min: 3, max: 10 },
  questionsPerVendor: 5,
  truncationMinKeepRatio: 0.6,
  /** Fits a refine request at every schema maximum even when each character takes 3 UTF-8 bytes. */
  requestBodyBytes: 131_072,
  cspReportBodyBytes: 8_192,
} as const;

export const API = {
  requestTimeoutMs: 45_000,
  rateLimit: { capacity: 10, refillPerSecond: 0.2, maxKeys: 10_000 },
  cspReportRateLimit: { capacity: 20, refillPerSecond: 0.5, maxKeys: 10_000 },
  rateLimitSweepIntervalMs: 1_000,
  busyRetryAfterSeconds: 5,
  geminiModel: "gemini-2.5-flash",
  geminiMaxOutputTokens: 16_384,
  geminiThinkingBudget: 512,
  geminiTemperature: { generate: 0.7, refine: 0.3 },
  geminiMalformedRetries: 1,
  geminiBusyStatuses: [429, 503],
} as const;

/** Rationale given to budget lines the planner adds by hand. */
export const USER_ADDED_RATIONALE = "Added by you";
export const SECOND_MS = 1_000;

/** Shape version of the stored workspace; bumping it discards plans saved by older versions. */
export const WORKSPACE_VERSION = 2;
export const STORAGE_KEY = `eventcraft.plan.v${String(WORKSPACE_VERSION)}`;
export const DAY_MS = 86_400_000;
export const DAYS_PER_YEAR = 365;
/** Length of a YYYY-MM-DD calendar day at the start of an ISO 8601 timestamp. */
export const ISO_DATE_LENGTH = 10;
/** Minor currency units (cents, paise, pence) per major unit for every supported currency. */
export const MINOR_UNITS = 100;
export const DUE_SOON_DAYS = 7;
/** Delay before a pending generation or refinement announces that it is still running. */
export const LONG_WAIT_NOTICE_MS = 10_000;
