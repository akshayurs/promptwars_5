import { describe, expect, it } from "vitest";

import { sanitizeText } from "@/lib/sanitize";

const single = { multiline: false };
const multi = { multiline: true };

describe("sanitizeText", () => {
  it("leaves ordinary text, Indic scripts and emoji untouched", () => {
    const text = "Garden party — मेहंदी, 🎉 and a 50/50 raffle";
    expect(sanitizeText(text, single)).toBe(text);
    expect(sanitizeText(text, multi)).toBe(text);
  });

  it("removes C0, DEL and C1 control characters", () => {
    expect(sanitizeText("a\u0000b\u0007c\u001Bd\u007Fe\u0085f\u009Fg", multi)).toBe("abcdefg");
  });

  it.each([
    ["LRE", "‪"],
    ["RLE", "‫"],
    ["PDF", "‬"],
    ["LRO", "‭"],
    ["RLO", "‮"],
    ["LRI", "⁦"],
    ["RLI", "⁧"],
    ["FSI", "⁨"],
    ["PDI", "⁩"],
    ["zero-width space", "​"],
    ["word joiner", "⁠"],
    ["byte order mark", "﻿"],
  ])("removes the %s character", (_name, char) => {
    expect(sanitizeText(`in${char}voice${char}.txt`, single)).toBe("invoice.txt");
  });

  it("keeps the joiners that Indic scripts and emoji sequences need", () => {
    const family = "👩‍👩‍👧";
    const nonJoined = "क्‌ष";
    expect(sanitizeText(`${family} ${nonJoined}`, single)).toBe(`${family} ${nonJoined}`);
  });

  it("keeps tabs and newlines in multi-line text and normalises line breaks", () => {
    expect(sanitizeText("one\r\ntwo\rthree\n\tfour", multi)).toBe("one\ntwo\nthree\n\tfour");
  });

  it("turns tabs and line breaks into spaces in single-line text", () => {
    expect(sanitizeText("Pune\r\nMaharashtra\tIndia\rWest", single)).toBe(
      "Pune Maharashtra India West",
    );
  });

  it("returns an empty string for text made only of removable characters", () => {
    expect(sanitizeText("‮​\u0000﻿", single)).toBe("");
  });
});
