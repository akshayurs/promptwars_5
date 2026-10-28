import { API, SECOND_MS } from "@/lib/constants";

type Bucket = { tokens: number; updatedAt: number };

export type RateLimitDecision = {
  allowed: boolean;
  /** Seconds until the next request would be allowed; 0 when this one was. */
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
  /** Seconds until the bucket is full again. */
  resetSeconds: number;
  /** Seconds a fully drained bucket takes to refill. */
  windowSeconds: number;
};

export type RateLimiterOptions = {
  capacity: number;
  refillPerSecond: number;
  now?: () => number;
  maxKeys?: number;
};

export type RateLimiter = { consume(key: string): RateLimitDecision; size(): number };

const decide = (
  allowed: boolean,
  tokens: number,
  { capacity, refillPerSecond }: Pick<RateLimiterOptions, "capacity" | "refillPerSecond">,
): RateLimitDecision => ({
  allowed,
  retryAfterSeconds: allowed ? 0 : Math.ceil((1 - tokens) / refillPerSecond),
  limit: capacity,
  remaining: Math.floor(tokens),
  resetSeconds: Math.ceil((capacity - tokens) / refillPerSecond),
  windowSeconds: Math.ceil(capacity / refillPerSecond),
});

/** Per-key token-bucket limiter with idle eviction and a least-recently-used key cap. */
export const createRateLimiter = ({
  capacity,
  refillPerSecond,
  now = Date.now,
  maxKeys = API.rateLimit.maxKeys,
}: RateLimiterOptions): RateLimiter => {
  // Map iteration order doubles as LRU order: every touch re-inserts the key at the end.
  const buckets = new Map<string, Bucket>();
  const idleEvictionMs = (capacity / refillPerSecond) * SECOND_MS;
  let lastSweepAt = Number.NEGATIVE_INFINITY;

  const refill = (bucket: Bucket, at: number): Bucket => {
    const elapsedSeconds = Math.max(0, at - bucket.updatedAt) / SECOND_MS;
    return {
      tokens: Math.min(capacity, bucket.tokens + elapsedSeconds * refillPerSecond),
      updatedAt: at,
    };
  };

  const evictIdle = (at: number): void => {
    if (at - lastSweepAt < API.rateLimitSweepIntervalMs) {
      return;
    }
    lastSweepAt = at;
    for (const [key, bucket] of buckets) {
      if (at - bucket.updatedAt <= idleEvictionMs) {
        return;
      }
      buckets.delete(key);
    }
  };

  const touch = (key: string, bucket: Bucket): void => {
    buckets.delete(key);
    buckets.set(key, bucket);
    for (const oldest of buckets.keys()) {
      if (buckets.size <= maxKeys) {
        return;
      }
      buckets.delete(oldest);
    }
  };

  return {
    consume(key: string): RateLimitDecision {
      const at = now();
      evictIdle(at);
      const bucket = refill(buckets.get(key) ?? { tokens: capacity, updatedAt: at }, at);
      const allowed = bucket.tokens >= 1;
      const next = allowed ? { ...bucket, tokens: bucket.tokens - 1 } : bucket;
      touch(key, next);
      return decide(allowed, next.tokens, { capacity, refillPerSecond });
    },
    size(): number {
      return buckets.size;
    },
  };
};
