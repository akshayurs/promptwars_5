import { MINOR_UNITS } from "@/lib/constants";

/** Rounds to the nearest minor unit (cent, paisa, penny), removing floating-point noise. */
export const roundMoney = (amount: number): number =>
  Math.round(amount * MINOR_UNITS) / MINOR_UNITS;

/** Rounds down to a whole minor unit, so scaled amounts never exceed the total they came from. */
export const floorMoney = (amount: number): number =>
  Math.floor(amount * MINOR_UNITS) / MINOR_UNITS;
