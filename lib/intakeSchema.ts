import { z } from "zod";

import { ADMISSION_TYPES, CURRENCIES, DAY_MS, LIMITS } from "@/lib/constants";

const YEAR_DAYS = 365;

const isUpcomingDate = (iso: string, now: () => number): boolean => {
  const date = Date.parse(`${iso}T00:00:00Z`);
  const today = Math.floor(now() / DAY_MS) * DAY_MS;
  const horizon = today + LIMITS.maxYearsAhead * YEAR_DAYS * DAY_MS;
  // One day of grace keeps "today" valid for planners in time zones west of UTC.
  return date >= today - DAY_MS && date <= horizon;
};

const shortText = z.string().trim().min(2).max(LIMITS.shortText);

const WeddingDetailsSchema = z
  .object({
    coupleNames: shortText,
    ceremonyStyle: shortText,
  })
  .strict();

const BirthdayDetailsSchema = z
  .object({
    honoreeName: shortText,
    honoreeAge: z.number().int().min(LIMITS.minAge).max(LIMITS.maxAge),
  })
  .strict();

const CommunityDetailsSchema = z
  .object({
    admission: z.enum(ADMISSION_TYPES),
    needsPermit: z.boolean(),
  })
  .strict();

const DateSchema = z.iso.date({ error: "Use a valid date in the YYYY-MM-DD format" });

const buildIntakeSchema = (eventDate: z.ZodType<string>) => {
  const common = {
    eventName: shortText,
    eventDate,
    guestCount: z.number().int().min(LIMITS.minGuests).max(LIMITS.maxGuests),
    totalBudget: z.number().positive().max(LIMITS.maxBudget),
    currency: z.enum(CURRENCIES),
    location: z.string().trim().min(2).max(LIMITS.mediumText),
    vibe: z.string().trim().min(3).max(LIMITS.longText),
    mustHaves: z.string().trim().max(LIMITS.longText),
  };
  return z.discriminatedUnion("eventType", [
    z
      .object({ eventType: z.literal("wedding"), details: WeddingDetailsSchema, ...common })
      .strict(),
    z
      .object({ eventType: z.literal("birthday"), details: BirthdayDetailsSchema, ...common })
      .strict(),
    z
      .object({ eventType: z.literal("community"), details: CommunityDetailsSchema, ...common })
      .strict(),
  ]);
};

export const IntakeFieldsSchema = buildIntakeSchema(DateSchema);

export const createIntakeSchema = (now: () => number = Date.now): typeof IntakeFieldsSchema =>
  buildIntakeSchema(
    DateSchema.refine((iso) => isUpcomingDate(iso, now), {
      message: `Date must be today or within the next ${LIMITS.maxYearsAhead} years`,
    }),
  );

export const IntakeSchema = createIntakeSchema();
export type Intake = z.infer<typeof IntakeSchema>;
export type EventType = Intake["eventType"];
export type EventDetails = Intake["details"];
