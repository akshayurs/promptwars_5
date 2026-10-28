import type { Vendor } from "@/lib/schema";

/** Flips one vendor between booked and not booked. */
export const toggleVendor = (vendors: readonly Vendor[], id: string): Vendor[] =>
  vendors.map((vendor) => (vendor.id === id ? { ...vendor, booked: !vendor.booked } : vendor));

export type VendorProgress = { booked: number; total: number; ratio: number };

/** Booked vendors out of the total, with the booked share as a 0..1 ratio. */
export const vendorProgress = (vendors: readonly Vendor[]): VendorProgress => {
  const booked = vendors.filter((vendor) => vendor.booked).length;
  return { booked, total: vendors.length, ratio: vendors.length > 0 ? booked / vendors.length : 0 };
};
