import { progressOf, toggleById, type Progress } from "@/lib/collections";
import type { Vendor } from "@/lib/schema";

/** Flips one vendor between booked and not booked; returns the same array for an unknown id. */
export const toggleVendor = <T extends readonly Vendor[]>(vendors: T, id: string): T | Vendor[] =>
  toggleById<Vendor, T>(vendors, id, "booked");

/** Booked vendors out of the total. */
export const vendorProgress = (vendors: readonly Vendor[]): Progress =>
  progressOf(vendors, (vendor) => vendor.booked);
