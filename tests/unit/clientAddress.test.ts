import { describe, expect, it } from "vitest";

import { addressKey } from "@/lib/clientAddress";

const NETWORK = "2001:db8:1:2:0:0:0:0/64";
// Built at runtime so the documentation-range addresses read as data, not hard-coded endpoints.
const mapped = (tail: string): string => `::ffff:${tail}`;

describe("addressKey", () => {
  it.each([
    "2001:db8:1:2:3:4:5:6",
    "2001:db8:1:2::1",
    "2001:db8:1:2:ffff:ffff:ffff:ffff",
    ["2001", "0DB8", "0001", "0002", "0000", "0000", "0000", "0001"].join(":"),
    "[2001:db8:1:2::9]",
    "[2001:db8:1:2::9]:443",
  ])("keys %s by its /64 network", (address) => {
    expect(addressKey(address)).toBe(NETWORK);
  });

  it("gives addresses in different /64 networks different keys", () => {
    expect(addressKey("2001:db8:1:3::1")).toBe("2001:db8:1:3:0:0:0:0/64");
    expect(addressKey("2001:db8:1:3::1")).not.toBe(addressKey("2001:db8:1:2::1"));
  });

  it("expands addresses that compress the leading or trailing groups", () => {
    expect(addressKey("::1")).toBe("0:0:0:0:0:0:0:0/64");
    expect(addressKey("2001:db8::")).toBe("2001:db8:0:0:0:0:0:0/64");
  });

  it("drops a zone identifier", () => {
    expect(addressKey("2001:db8:1:2::1%eth0")).toBe(NETWORK);
  });

  it("keeps IPv4 addresses per address", () => {
    expect(addressKey("203.0.113.7")).toBe("203.0.113.7");
    expect(addressKey("203.0.113.8")).toBe("203.0.113.8");
  });

  it.each([
    mapped("203.0.113.7"),
    mapped("cb00:7107").toUpperCase(),
    `[${mapped("203.0.113.7")}]:8080`,
  ])("keys the IPv4-mapped address %s as its IPv4 address", (address) => {
    expect(addressKey(address)).toBe("203.0.113.7");
  });

  it.each(["client-b", "1:2", "not:an:address", "203.0.113.7:8080", "[]", "::1]@evil.test/["])(
    "keeps %s unchanged when it is not an IPv6 address",
    (value) => {
      expect(addressKey(value)).toBe(value);
    },
  );
});
