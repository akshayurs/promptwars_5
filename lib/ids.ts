/** Source of unique ids; injectable so tests stay deterministic. */
export type IdFactory = () => string;

/** Random UUID v4 ids from the Web Crypto API. */
export const randomId: IdFactory = () => crypto.randomUUID();
