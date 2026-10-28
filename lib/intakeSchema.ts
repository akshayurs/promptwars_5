import { z } from "zod";

import { ADMISSION_TYPES, CURRENCIES, DAYS_PER_YEAR, LIMITS } from "@/lib/constants";
import { daysUntil, systemClock, type Clock } from "@/lib/dates";
import { formatCount } from "@/lib/format";

const ENTER_A_NUMBER = "Enter a number";
const UNKNOWN_FIELDS = "Remove fields this form does not use";

type Bounds = { subject: string; min: number; max: number };

/** Trimmed text with plain-language length messages, e.g. "Enter a location of at least 2…". */
export const boundedText = ({ subject, min, max }: Bounds): z.ZodString =>
  z
    .string({ error: `Enter ${subject}` })
    .trim()
    .min(min, { error: `Enter ${subject} of at least ${formatCount(min)} characters` })
    .max(max, { error: `Enter ${subject} of at most ${formatCount(max)} characters` });

const wholeNumber = ({ subject, min, max }: Bounds): z.ZodNumber => {
  const range = `Enter ${subject} between ${formatCount(min)} and ${formatCount(max)}`;
  return z
    .number({ error: ENTER_A_NUMBER })
    .int({ error: `Enter ${subject} as a whole number` })
    .min(min, { error: range })
    .max(max, { error: range });
};

// Objects reject unknown keys; a missing or non-object value gets the field-specific message.
const objectError = (missing: string): { error: (issue: { code: string }) => string } => ({
  error: (issue) => (issue.code === "unrecognized_keys" ? UNKNOWN_FIELDS : missing),
});

const detailsError = objectError("Add the details for this type of event");

const shortText = (subject: string): z.ZodString =>
  boundedText({ subject, min: LIMITS.minTextChars, max: LIMITS.shortText });

const WeddingDetailsSchema = z.strictObject(
  { coupleNames: shortText("the couple's names"), ceremonyStyle: shortText("a ceremony style") },
  detailsError,
);

const BirthdayDetailsSchema = z.strictObject(
  {
    honoreeName: shortText("the guest of honour's name"),
    honoreeAge: wholeNumber({ subject: "an age", min: LIMITS.minAge, max: LIMITS.maxAge }),
  },
  detailsError,
);

const CommunityDetailsSchema = z.strictObject(
  {
    admission: z.enum(ADMISSION_TYPES, { error: "Choose free or ticketed admission" }),
    needsPermit: z.boolean({ error: "Choose whether the event needs a public permit" }),
  },
  detailsError,
);

// `abort` keeps the date-window message from replacing the format message on malformed input.
const DateSchema = z.iso.date({ error: "Enter a valid event date", abort: true });

const isUpcomingDate = (isoDay: string, now: Clock): boolean => {
  const days = daysUntil(isoDay, now);
  return days >= -LIMITS.pastDateGraceDays && days <= LIMITS.maxYearsAhead * DAYS_PER_YEAR;
};

const commonFields = (eventDate: z.ZodType<string>) => ({
  eventName: shortText("an event name"),
  eventDate,
  guestCount: wholeNumber({
    subject: "a guest count",
    min: LIMITS.minGuests,
    max: LIMITS.maxGuests,
  }),
  totalBudget: z
    .number({ error: ENTER_A_NUMBER })
    .positive({ error: "Enter a total budget greater than 0" })
    .max(LIMITS.maxBudget, {
      error: `Enter a total budget of at most ${formatCount(LIMITS.maxBudget)}`,
    }),
  currency: z.enum(CURRENCIES, { error: "Choose a currency from the list" }),
  location: boundedText({
    subject: "a location",
    min: LIMITS.minTextChars,
    max: LIMITS.mediumText,
  }),
  vibe: boundedText({ subject: "a vibe", min: LIMITS.minVibeChars, max: LIMITS.longText }),
  mustHaves: z
    .string({ error: "Enter your must-haves" })
    .trim()
    .max(LIMITS.longText, {
      error: `Enter must-haves of at most ${formatCount(LIMITS.longText)} characters`,
    }),
});

const buildIntakeSchema = (eventDate: z.ZodType<string>) => {
  const common = commonFields(eventDate);
  const fieldsError = objectError("Fill in the event details");
  return z.discriminatedUnion(
    "eventType",
    [
      z.strictObject(
        { eventType: z.literal("wedding"), details: WeddingDetailsSchema, ...common },
        fieldsError,
      ),
      z.strictObject(
        { eventType: z.literal("birthday"), details: BirthdayDetailsSchema, ...common },
        fieldsError,
      ),
      z.strictObject(
        { eventType: z.literal("community"), details: CommunityDetailsSchema, ...common },
        fieldsError,
      ),
    ],
    { error: "Choose the type of event" },
  );
};

/** Intake shape without the date window, for stored workspaces and refine requests. */
export const IntakeFieldsSchema = buildIntakeSchema(DateSchema);

/** Intake for a new plan: the event date must fall between today and the planning horizon. */
export const createIntakeSchema = (now: Clock = systemClock): typeof IntakeFieldsSchema =>
  buildIntakeSchema(
    DateSchema.refine((isoDay) => isUpcomingDate(isoDay, now), {
      error: `Choose an event date between today and ${LIMITS.maxYearsAhead} years from now`,
    }),
  );

export const IntakeSchema = createIntakeSchema();
export type Intake = z.infer<typeof IntakeSchema>;
export type EventDetails = Intake["details"];
