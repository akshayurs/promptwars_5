import { describe, expect, it } from "vitest";

import { createConcurrencyLimiter } from "@/lib/concurrencyLimit";

describe("createConcurrencyLimiter", () => {
  it("grants slots up to the cap and refuses the next one", () => {
    const limiter = createConcurrencyLimiter(2);
    expect(limiter.acquire("a")).toBeTypeOf("function");
    expect(limiter.acquire("a")).toBeTypeOf("function");
    expect(limiter.acquire("a")).toBeNull();
  });

  it("counts keys independently", () => {
    const limiter = createConcurrencyLimiter(1);
    expect(limiter.acquire("a")).not.toBeNull();
    expect(limiter.acquire("b")).not.toBeNull();
    expect(limiter.acquire("a")).toBeNull();
    expect(limiter.size()).toBe(2);
  });

  it("frees a slot on release", () => {
    const limiter = createConcurrencyLimiter(1);
    const release = limiter.acquire("a");
    release?.();
    expect(limiter.acquire("a")).not.toBeNull();
  });

  it("ignores a repeated release so it cannot free another holder's slot", () => {
    const limiter = createConcurrencyLimiter(2);
    const first = limiter.acquire("a");
    limiter.acquire("a");
    first?.();
    first?.();
    expect(limiter.acquire("a")).not.toBeNull();
    expect(limiter.acquire("a")).toBeNull();
  });

  it("forgets a key once its last slot is released", () => {
    const limiter = createConcurrencyLimiter(2);
    const first = limiter.acquire("a");
    const second = limiter.acquire("a");
    first?.();
    expect(limiter.size()).toBe(1);
    second?.();
    expect(limiter.size()).toBe(0);
  });

  it("keeps a released holder from affecting a key that was re-created", () => {
    const limiter = createConcurrencyLimiter(1);
    const stale = limiter.acquire("a");
    stale?.();
    limiter.acquire("a");
    stale?.();
    expect(limiter.acquire("a")).toBeNull();
    expect(limiter.size()).toBe(1);
  });
});
