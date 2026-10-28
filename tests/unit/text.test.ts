import { describe, expect, it } from "vitest";

import { truncateAtWord } from "@/lib/text";

describe("truncateAtWord", () => {
  it("returns text at or under the limit unchanged", () => {
    expect(truncateAtWord("Warm lighting", 20)).toBe("Warm lighting");
    expect(truncateAtWord("exactly ten", 11)).toBe("exactly ten");
  });

  it("cuts at the last whole word and appends an ellipsis within the limit", () => {
    const text = "Covers the venue and catering for every event including all evening functions";
    const result = truncateAtWord(text, 60);
    expect(result).toBe("Covers the venue and catering for every event including all…");
    expect(result.length).toBeLessThanOrEqual(60);
  });

  it("keeps a word that ends exactly at the cut", () => {
    expect(truncateAtWord("Book the venue early please", 15)).toBe("Book the venue…");
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(truncateAtWord("Florals, lighting, drapes and more", 20)).toBe("Florals, lighting…");
  });

  it("treats line breaks as word boundaries", () => {
    expect(truncateAtWord("Book the venue\nthen the caterer", 17)).toBe("Book the venue…");
  });

  it("falls back to a hard cut when the last break would drop too much text", () => {
    const result = truncateAtWord(`Go ${"x".repeat(40)}`, 20);
    expect(result).toBe(`Go ${"x".repeat(16)}…`);
    expect(result).toHaveLength(20);
  });

  it("never returns more than the limit for text without spaces", () => {
    expect(truncateAtWord("x".repeat(900), 600)).toHaveLength(600);
  });
});
