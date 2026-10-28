import { API } from "@/lib/constants";

type Bucket = { tokens: number; updatedAt: number };

type RateLimitDecision = { allowed: boolean; retryAfterSeconds: number };

export type RateLimiterOptions = {
  capacity: number;
  refillPerSecond: number;
  now?: () => number;
  maxKeys?: number;
};

const MS_PER_SECOND = 1000;
const SWEEP_INTERVAL_MS = MS_PER_SECOND;

export type RateLimiter = { consume(key: string): RateLimitDecision; size(): number };

export const createRateLimiter = ({
  capacity,
  refillPerSecond,
  now = Date.now,
  maxKeys = API.rateLimit.maxKeys,
}: RateLimiterOptions): RateLimiter => {
  // Map iteration order doubles as LRU order: every touch re-inserts the key at the end.
  const buckets = new Map<string, Bucket>();
  const idleEvictionMs = (capacity / refillPerSecond) * MS_PER_SECOND;
  let lastSweepAt = Number.NEGATIVE_INFINITY;

  const refill = (bucket: Bucket, at: number): Bucket => {
    const elapsedSeconds = Math.max(0, at - bucket.updatedAt) / MS_PER_SECOND;
    return {
      tokens: Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond),
      updatedAt: at,
    };
  };

  const evictIdle = (at: number): void => {
    if (at - lastSweepAt < SWEEP_INTERVAL_MS) return;
    lastSweepAt = at;
    for (const [key, bucket] of buckets) {
      if (at - bucket.updatedAt <= idleEvictionMs) return;
      buckets.delete(key);
    }
  };

  const touch = (key: string, bucket: Bucket): void => {
    buckets.delete(key);
    buckets.set(key, bucket);
    for (const oldest of buckets.keys()) {
      if (buckets.size <= maxKeys) return;
      buckets.delete(oldest);
    }
  };

  return {
    consume(key: string): RateLimitDecision {
      const at = now();
      evictIdle(at);
      const bucket = refill(buckets.get(key) ?? { tokens: capacity, updatedAt: at }, at);
      if (bucket.tokens >= 1) {
        touch(key, { ...bucket, tokens: bucket.tokens - 1 });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      touch(key, bucket);
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((1 - bucket.tokens) / refillPerSecond),
      };
    },
    size(): number {
      return buckets.size;
    },
  };
};
