import { afterEach, beforeEach, vi } from "vitest";

import { FIXED_NOW } from "./unit/clock";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});
