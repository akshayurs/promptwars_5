import { describe, expect, it } from "vitest";

import { LIMITS } from "@/lib/constants";
import { createIntakeSchema } from "@/lib/schema";

import { makeIntake, makeIntakeFor } from "./fixtures";

const schema = createIntakeSchema(() => new Date("2029-06-01T12:00:00Z"));
const rep = (n: number): string => "a".repeat(n);

const issuesOf = (candidate: unknown): Record<string, string> =>
  Object.fromEntries(
    (schema.safeParse(candidate).error?.issues ?? []).map((issue) => [
      issue.path.join("."),
      issue.message,
    ]),
  );

const messageFor = (path: string, candidate: unknown): string | undefined =>
  issuesOf(candidate)[path];

const withCommon = (patch: Record<string, unknown>): unknown => ({ ...makeIntake(), ...patch });

const withDetails = (eventType: "wedding" | "birthday" | "community", details: unknown) => ({
  ...makeIntakeFor(eventType),
  details,
});

describe("intake messages: common fields", () => {
  it.each([
    ["eventName", "", "Enter an event name of at least 2 characters"],
    ["eventName", " a ", "Enter an event name of at least 2 characters"],
    ["eventName", rep(81), "Enter an event name of at most 80 characters"],
    ["eventName", undefined, "Enter an event name"],
    ["location", "a", "Enter a location of at least 2 characters"],
    ["location", rep(201), "Enter a location of at most 200 characters"],
    ["vibe", "ab", "Enter a vibe of at least 3 characters"],
    ["vibe", rep(501), "Enter a vibe of at most 500 characters"],
    ["mustHaves", rep(501), "Enter must-haves of at most 500 characters"],
    ["mustHaves", undefined, "Enter your must-haves"],
  ])("%s = %j", (field, value, message) => {
    expect(messageFor(field, withCommon({ [field]: value }))).toBe(message);
  });

  it.each([
    [0, "Enter a guest count between 1 and 100,000"],
    [LIMITS.maxGuests + 1, "Enter a guest count between 1 and 100,000"],
    [10.5, "Enter a guest count as a whole number"],
    [Number.NaN, "Enter a number"],
    ["12", "Enter a number"],
  ])("guestCount = %s", (guestCount, message) => {
    expect(messageFor("guestCount", withCommon({ guestCount }))).toBe(message);
  });

  it.each([
    [0, "Enter a total budget greater than 0"],
    [-5, "Enter a total budget greater than 0"],
    [LIMITS.maxBudget + 1, "Enter a total budget of at most 1,000,000,000"],
    [Number.NaN, "Enter a number"],
    [Number.POSITIVE_INFINITY, "Enter a number"],
  ])("totalBudget = %s", (totalBudget, message) => {
    expect(messageFor("totalBudget", withCommon({ totalBudget }))).toBe(message);
  });

  it.each([
    ["", "Enter a valid event date"],
    ["2029-02-30", "Enter a valid event date"],
    ["01/06/2029", "Enter a valid event date"],
    ["2029-05-01", "Choose an event date between today and 5 years from now"],
    ["2040-01-01", "Choose an event date between today and 5 years from now"],
  ])("eventDate = %j", (eventDate, message) => {
    expect(messageFor("eventDate", withCommon({ eventDate }))).toBe(message);
  });

  it("asks for a currency from the list", () => {
    expect(messageFor("currency", withCommon({ currency: "JPY" }))).toBe(
      "Choose a currency from the list",
    );
  });

  it("asks for an event type when it is missing or unknown", () => {
    expect(messageFor("eventType", withCommon({ eventType: "party" }))).toBe(
      "Choose the type of event",
    );
    expect(messageFor("eventType", withCommon({ eventType: undefined }))).toBe(
      "Choose the type of event",
    );
  });

  it("names unexpected fields without developer terms", () => {
    expect(messageFor("", withCommon({ extra: 1 }))).toBe("Remove fields this form does not use");
  });
});

describe("intake messages: event details", () => {
  it.each([
    [{ coupleNames: "A", ceremonyStyle: "Civil" }, "details.coupleNames", "the couple's names"],
    [{ coupleNames: "Asha", ceremonyStyle: "" }, "details.ceremonyStyle", "a ceremony style"],
  ])("wedding %j", (details, path, subject) => {
    expect(messageFor(path, withDetails("wedding", details))).toBe(
      `Enter ${subject} of at least 2 characters`,
    );
  });

  it("caps wedding text at the short limit", () => {
    const details = { coupleNames: "Asha and Ravi", ceremonyStyle: rep(81) };
    expect(messageFor("details.ceremonyStyle", withDetails("wedding", details))).toBe(
      "Enter a ceremony style of at most 80 characters",
    );
  });

  it.each([
    [
      { honoreeName: "", honoreeAge: 7 },
      "details.honoreeName",
      "Enter the guest of honour's name of at least 2 characters",
    ],
    [
      { honoreeName: "Aarav", honoreeAge: 0 },
      "details.honoreeAge",
      "Enter an age between 1 and 120",
    ],
    [
      { honoreeName: "Aarav", honoreeAge: 121 },
      "details.honoreeAge",
      "Enter an age between 1 and 120",
    ],
    [
      { honoreeName: "Aarav", honoreeAge: 7.5 },
      "details.honoreeAge",
      "Enter an age as a whole number",
    ],
    [{ honoreeName: "Aarav", honoreeAge: Number.NaN }, "details.honoreeAge", "Enter a number"],
  ])("birthday %j", (details, path, message) => {
    expect(messageFor(path, withDetails("birthday", details))).toBe(message);
  });

  it.each([
    [
      { admission: "paid", needsPermit: false },
      "details.admission",
      "Choose free or ticketed admission",
    ],
    [
      { admission: "free", needsPermit: "yes" },
      "details.needsPermit",
      "Choose whether the event needs a public permit",
    ],
  ])("community %j", (details, path, message) => {
    expect(messageFor(path, withDetails("community", details))).toBe(message);
  });

  it("asks for details when they are missing or not an object", () => {
    for (const details of [undefined, null, "Asha"]) {
      expect(messageFor("details", withDetails("wedding", details))).toBe(
        "Add the details for this type of event",
      );
    }
  });

  it("names unexpected detail fields without developer terms", () => {
    const details = { coupleNames: "Asha and Ravi", ceremonyStyle: "Civil", theme: "x" };
    expect(messageFor("details", withDetails("wedding", details))).toBe(
      "Remove fields this form does not use",
    );
  });
});

describe("intake messages: wording", () => {
  it("never surfaces schema jargon for a fully empty form", () => {
    const empty = {
      eventType: "birthday",
      details: { honoreeName: "", honoreeAge: Number.NaN },
      eventName: "",
      eventDate: "",
      guestCount: 0,
      totalBudget: 0,
      currency: "",
      location: "",
      vibe: "",
      mustHaves: "",
    };
    const messages = Object.values(issuesOf(empty));
    expect(messages.length).toBeGreaterThanOrEqual(9);
    for (const message of messages) {
      expect(message).not.toMatch(/expected|too small|too big|invalid|received|>=|<=/i);
      expect(message).toMatch(/^(Enter|Choose|Add|Remove) /);
    }
  });
});
