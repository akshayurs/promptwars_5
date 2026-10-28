import { toAdmission, toEventType } from "@/components/intake/formState";

describe("form value narrowing", () => {
  it.each(["wedding", "birthday", "community"])("keeps the known event type %s", (value) => {
    expect(toEventType(value)).toBe(value);
  });

  it("falls back to wedding for an unknown event type", () => {
    expect(toEventType("conference")).toBe("wedding");
  });

  it.each(["free", "ticketed"])("keeps the known admission %s", (value) => {
    expect(toAdmission(value)).toBe(value);
  });

  it("falls back to free for an unknown admission", () => {
    expect(toAdmission("invite-only")).toBe("free");
  });
});
