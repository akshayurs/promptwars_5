import { describe, expect, it } from "vitest";

import { createRateLimiter } from "@/lib/rateLimit";

const setup = (capacity = 3, refillPerSecond = 1, maxKeys?: number) => {
  let time = 1_000_000;
  const limiter = createRateLimiter({
    capacity,
    refillPerSecond,
    now: () => time,
    ...(maxKeys === undefined ? {} : { maxKeys }),
  });
  return {
    limiter,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

describe("createRateLimiter", () => {
  it("allows a burst up to capacity then denies with a retry hint", () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.consume("a")).toEqual({ allowed: true, retryAfterSeconds: 0 });
    }
    const denied = limiter.consume("a");
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("refills tokens over time", () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 3; i += 1) limiter.consume("a");
    expect(limiter.consume("a").allowed).toBe(false);
    advance(1000);
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
  });

  it("computes retryAfterSeconds from the refill rate", () => {
    const { limiter } = setup(1, 0.5);
    limiter.consume("a");
    expect(limiter.consume("a").retryAfterSeconds).toBe(2);
  });

  it("never refills beyond capacity", () => {
    const { limiter, advance } = setup();
    limiter.consume("a");
    advance(500);
    limiter.consume("a");
    advance(100_000);
    for (let i = 0; i < 3; i += 1) expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
  });

  it("tracks keys independently", () => {
    const { limiter } = setup(1);
    expect(limiter.consume("a").allowed).toBe(true);
    expect(limiter.consume("a").allowed).toBe(false);
    expect(limiter.consume("b").allowed).toBe(true);
  });

  it("evicts idle buckets", () => {
    const { limiter, advance } = setup(2, 1);
    limiter.consume("a");
    limiter.consume("b");
    expect(limiter.size()).toBe(2);
    advance(2_001);
    limiter.consume("c");
    expect(limiter.size()).toBe(1);
  });

  it("keeps recently used buckets when idle ones are evicted", () => {
    const { limiter, advance } = setup(2, 1);
    limiter.consume("a");
    advance(1_500);
    limiter.consume("b");
    advance(1_000);
    limiter.consume("c");
    expect(limiter.size()).toBe(2);
  });

  it("sweeps idle buckets at most once per second", () => {
    const { limiter, advance } = setup(1, 10);
    limiter.consume("a");
    advance(500);
    limiter.consume("b");
    expect(limiter.size()).toBe(2);
    advance(600);
    limiter.consume("c");
    expect(limiter.size()).toBe(1);
  });

  it("caps tracked keys, evicting the least recently used", () => {
    const { limiter } = setup(1, 0.001, 2);
    limiter.consume("a");
    limiter.consume("b");
    limiter.consume("a");
    limiter.consume("c");
    expect(limiter.size()).toBe(2);
    expect(limiter.consume("a").allowed).toBe(false);
    expect(limiter.consume("b").allowed).toBe(true);
  });

  it("uses the real clock by default", () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 0.001 });
    expect(limiter.consume("x").allowed).toBe(true);
    expect(limiter.consume("x").allowed).toBe(false);
  });
});
