export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export const ADMISSION_TYPES = ["free", "ticketed"] as const;
export const MILESTONE_PHASES = ["planning", "booking", "final-prep", "event-day"] as const;

export const DAYS_PER_YEAR = 365;
const MAX_YEARS_AHEAD = 5;

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
  maxYearsAhead: MAX_YEARS_AHEAD,
  /** Event dates may be one day before the UTC "today" so planners west of UTC can pick theirs. */
  pastDateGraceDays: 1,
  /** No milestone can precede today, and the furthest event date is maxYearsAhead away. */
  maxDaysBeforeEvent: MAX_YEARS_AHEAD * DAYS_PER_YEAR,
  budgetLines: { min: 3, max: 15 },
  milestones: { min: 4, max: 25 },
  vendors: { min: 3, max: 15 },
  ideas: { min: 3, max: 10 },
  questionsPerVendor: 5,
  truncationMinKeepRatio: 0.6,
  /** Fits a refine request at every schema maximum even when each character takes 3 UTF-8 bytes. */
  requestBodyBytes: 131_072,
  cspReportBodyBytes: 8_192,
  /** An exported workspace holds two plans, so twice the request cap fits any valid file. */
  importFileBytes: 262_144,
} as const;

export const API = {
  requestTimeoutMs: 45_000,
  rateLimit: { capacity: 10, refillPerSecond: 0.2, maxKeys: 10_000 },
  cspReportRateLimit: { capacity: 20, refillPerSecond: 0.5, maxKeys: 10_000 },
  rateLimitSweepIntervalMs: 1_000,
  /** IPv6 clients share one rate-limit key per /64, the smallest prefix a site is usually given. */
  ipv6KeyPrefixBits: 64,
  /** Model generations one client key may have running at the same time. */
  maxInFlightPerClient: 2,
  inFlightRetryAfterSeconds: 10,
  busyRetryAfterSeconds: 5,
  geminiModel: "gemini-2.5-flash",
  geminiMaxOutputTokens: 16_384,
  geminiThinkingBudget: 512,
  geminiTemperature: { generate: 0.7, refine: 0.3 },
  geminiMalformedRetries: 1,
  geminiBusyStatuses: [429, 503],
} as const;

/** Display rationale for a budget line the planner adds without writing one. */
export const USER_ADDED_RATIONALE = "Added by you";
/**
 * Words marking a budget line the organiser holds back rather than pays to a supplier (a
 * contingency or buffer); such lines need no vendor. Matched as whole words, case-insensitively.
 */
export const NON_SUPPLIER_BUDGET_WORDS = [
  "contingency",
  "reserve",
  "buffer",
  "miscellaneous",
  "misc",
  "unallocated",
] as const;
export const SECOND_MS = 1_000;

/** Shape version of the stored workspace; bumping it discards plans saved by older versions. */
export const WORKSPACE_VERSION = 2;
export const STORAGE_KEY = `eventcraft.plan.v${String(WORKSPACE_VERSION)}`;
export const DAY_MS = 86_400_000;
/** Length of a YYYY-MM-DD calendar day at the start of an ISO 8601 timestamp. */
export const ISO_DATE_LENGTH = 10;
/** Minor currency units (cents, paise, pence) per major unit for every supported currency. */
export const MINOR_UNITS = 100;
/** Smallest increment a money input accepts: one minor unit. */
export const MONEY_STEP = 1 / MINOR_UNITS;
export const DUE_SOON_DAYS = 7;
/** Delay before a pending generation or refinement announces that it is still running. */
export const LONG_WAIT_NOTICE_MS = 10_000;
/** Quiet period after the last keystroke-rate edit before the workspace is written to storage. */
export const PERSIST_DEBOUNCE_MS = 300;
/** RFC 5545 content lines longer than this many octets are folded. */
export const ICS_MAX_LINE_OCTETS = 75;
export const BYTES_PER_KB = 1_024;
/** Browser UI colour per scheme; matches --surface in app/globals.css. */
export const THEME_COLORS = { light: "#f7f8fa", dark: "#0b0d12" } as const;
