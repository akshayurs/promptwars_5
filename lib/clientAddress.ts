import { API } from "@/lib/constants";

const GROUPS = 8;
const GROUP_BITS = 16;
const GROUP_MASK = 0xffff;
const BYTE_BITS = 8;
const BYTE_MASK = 0xff;
const IPV4_MAPPED_PREFIX: readonly number[] = [0, 0, 0, 0, 0, GROUP_MASK];
const IPV6_CHARACTERS = /^[\da-f:.]+$/iu;
// "[2001:db8::1]:443" and "fe80::1%eth0" carry a port or zone that is not part of the address.
const BRACKETED = /^\[([^\]]+)\](?::\d+)?$/u;

// The WHATWG URL parser validates an IPv6 literal and serialises it in compressed hex form.
const canonicalIpv6 = (address: string): string | undefined =>
  IPV6_CHARACTERS.test(address)
    ? URL.parse(`http://[${address}]/`)?.hostname.slice(1, -1)
    : undefined;

const parseGroups = (part: string): number[] =>
  part === "" ? [] : part.split(":").map((group) => Number.parseInt(group, 16));

const expandIpv6 = (canonical: string): number[] => {
  const gap = canonical.indexOf("::");
  if (gap === -1) {
    return parseGroups(canonical);
  }
  const left = parseGroups(canonical.slice(0, gap));
  const right = parseGroups(canonical.slice(gap + 2));
  return [...left, ...Array<number>(GROUPS - left.length - right.length).fill(0), ...right];
};

const isIpv4Mapped = (groups: readonly number[]): boolean =>
  IPV4_MAPPED_PREFIX.every((group, index) => groups[index] === group);

const ipv4FromGroups = (groups: readonly number[]): string =>
  groups
    .slice(-2)
    .flatMap((group) => [group >> BYTE_BITS, group & BYTE_MASK])
    .join(".");

const maskGroup = (group: number, index: number): number => {
  const kept = Math.min(Math.max(API.ipv6KeyPrefixBits - index * GROUP_BITS, 0), GROUP_BITS);
  return group & (GROUP_MASK << (GROUP_BITS - kept)) & GROUP_MASK;
};

const ipv6Key = (groups: readonly number[]): string => {
  if (isIpv4Mapped(groups)) {
    return ipv4FromGroups(groups);
  }
  const prefix = groups.map(maskGroup).map((group) => group.toString(16));
  return `${prefix.join(":")}/${String(API.ipv6KeyPrefixBits)}`;
};

/**
 * Rate-limit key for a client address. One IPv6 host controls a whole /64, so IPv6 addresses are
 * keyed by that prefix. IPv4-mapped IPv6 is keyed as its IPv4 address; IPv4 and anything that is
 * not an IPv6 address stay as given.
 */
export const addressKey = (address: string): string => {
  const unwrapped = (BRACKETED.exec(address)?.[1] ?? address).split("%", 1).join("");
  const canonical = unwrapped.includes(":") ? canonicalIpv6(unwrapped) : undefined;
  return canonical === undefined ? address : ipv6Key(expandIpv6(canonical));
};
