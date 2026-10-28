import { addressKey } from "@/lib/clientAddress";

export type RejectionReason =
  | "cross_site"
  | "rate_limited"
  | "too_many_in_flight"
  | "unsupported_media_type"
  | "body_too_large"
  | "invalid_utf8"
  | "invalid_json"
  | "validation_failed";

type BodyFailure = {
  ok: false;
  status: 400 | 413 | 415;
  reason: RejectionReason;
  message: string;
};

export type BodyResult = { ok: true; value: unknown } | BodyFailure;

const JSON_MEDIA_TYPES: readonly string[] = ["application/json"];

const TOO_LARGE: BodyFailure = {
  ok: false,
  status: 413,
  reason: "body_too_large",
  message: "Request body is too large",
};

const declaredLength = (request: Request): number => {
  const length = Number(request.headers.get("content-length") ?? Number.NaN);
  return Number.isFinite(length) ? length : 0;
};

const mediaType = (request: Request): string =>
  (request.headers.get("content-type") ?? "").split(";", 1).join("").trim().toLowerCase();

const concat = (chunks: readonly Uint8Array[], total: number): Uint8Array => {
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const readCapped = async (
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array | null> => {
  if (body === null) {
    return new Uint8Array();
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return concat(chunks, total);
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
};

const decodeJson = (bytes: Uint8Array): BodyResult => {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return {
      ok: false,
      status: 400,
      reason: "invalid_utf8",
      message: "Request body is not valid UTF-8",
    };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      status: 400,
      reason: "invalid_json",
      message: "Request body is not valid JSON",
    };
  }
};

/** Reads a JSON body of an accepted media type, streaming no more than `maxBytes`. */
export const readJsonBody = async (
  request: Request,
  maxBytes: number,
  mediaTypes: readonly string[] = JSON_MEDIA_TYPES,
): Promise<BodyResult> => {
  if (!mediaTypes.includes(mediaType(request))) {
    return {
      ok: false,
      status: 415,
      reason: "unsupported_media_type",
      message: `Content-Type must be ${mediaTypes.join(" or ")}`,
    };
  }
  if (declaredLength(request) > maxBytes) {
    return TOO_LARGE;
  }
  const bytes = await readCapped(request.body, maxBytes);
  return bytes === null ? TOO_LARGE : decodeJson(bytes);
};

const nonEmpty = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
};

// The right-most hop is the one appended by our trusted proxy; earlier entries are client-supplied.
const lastForwardedHop = (header: string | null): string | undefined =>
  header
    ?.split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop.length > 0)
    .at(-1);

/**
 * Rate-limit key for the caller: the proxy-appended forwarded hop, then x-real-ip, with IPv6
 * addresses reduced to their /64 network.
 */
export const clientKey = (request: Request): string => {
  const address =
    lastForwardedHop(request.headers.get("x-forwarded-for")) ??
    nonEmpty(request.headers.get("x-real-ip"));
  return address === undefined ? "anonymous" : addressKey(address);
};

const ALLOWED_FETCH_SITES: ReadonlySet<string> = new Set(["same-origin", "none"]);
const WEB_SCHEMES: ReadonlySet<string> = new Set(["http", "https"]);

// The origin the browser addressed: the proxy-set forwarded scheme and host, else the request URL.
const publicOrigin = (request: Request): string | undefined => {
  const url = new URL(request.url);
  const scheme =
    lastForwardedHop(request.headers.get("x-forwarded-proto"))?.toLowerCase() ??
    url.protocol.slice(0, -1);
  const host =
    lastForwardedHop(request.headers.get("x-forwarded-host")) ??
    nonEmpty(request.headers.get("host")) ??
    url.host;
  return WEB_SCHEMES.has(scheme) ? URL.parse(`${scheme}://${host}`)?.origin : undefined;
};

/**
 * Rejects browser requests issued by other sites, which would spend this deployment's model quota.
 * Browsers send Sec-Fetch-Site on every fetch; for older ones the Origin's scheme, host and port
 * must match the public origin of this request. Clients that send neither are not browsers and
 * are left to the rate limiter.
 */
export const isCrossSiteRequest = (request: Request): boolean => {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return !ALLOWED_FETCH_SITES.has(fetchSite);
  }
  const origin = request.headers.get("origin");
  if (origin === null) {
    return false;
  }
  const expected = publicOrigin(request);
  return expected === undefined || URL.parse(origin)?.origin !== expected;
};
