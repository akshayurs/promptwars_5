type Slots = { count: number };

export type ConcurrencyLimiter = {
  /** Claims a slot for `key`: returns its release function, or null when the key is at its cap. */
  acquire(key: string): (() => void) | null;
  /** Keys holding at least one slot. */
  size(): number;
};

/** Caps concurrent work per key; a key is forgotten once its last slot is released. */
export const createConcurrencyLimiter = (maxPerKey: number): ConcurrencyLimiter => {
  const active = new Map<string, Slots>();
  return {
    acquire(key: string): (() => void) | null {
      const slots = active.get(key) ?? { count: 0 };
      if (slots.count >= maxPerKey) {
        return null;
      }
      slots.count += 1;
      active.set(key, slots);
      let released = false;
      return () => {
        if (released) {
          return;
        }
        released = true;
        slots.count -= 1;
        if (slots.count === 0) {
          active.delete(key);
        }
      };
    },
    size(): number {
      return active.size;
    },
  };
};
