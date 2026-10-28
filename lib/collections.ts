type Identified = { id: string };

/** Keys of `T` whose values are booleans, such as a done or booked flag. */
type FlagKey<T> = { [K in keyof T]: T[K] extends boolean ? K : never }[keyof T];

/** Checked-off items out of the total, with the checked share as a 0..1 ratio. */
export type Progress = { done: number; total: number; ratio: number };

/** How many times each key occurs, in first-seen order. */
export const countBy = (keys: Iterable<string>): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

/** Flips one boolean flag on the item with this id; returns the same array for an unknown id. */
export const toggleById = <T extends Identified, L extends readonly T[]>(
  items: L,
  id: string,
  flag: FlagKey<T>,
): L | T[] =>
  items.some((item) => item.id === id)
    ? items.map((item) => (item.id === id ? { ...item, [flag]: !item[flag] } : item))
    : items;

/** Progress over a list, counting the items `isDone` accepts. */
export const progressOf = <T>(items: readonly T[], isDone: (item: T) => boolean): Progress => {
  const done = items.filter(isDone).length;
  return { done, total: items.length, ratio: items.length > 0 ? done / items.length : 0 };
};
