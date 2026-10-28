export type BodyResult =
  { ok: true; value: unknown } | { ok: false; status: 400 | 413 | 415; message: string };

const TOO_LARGE: BodyResult = { ok: false, status: 413, message: "Request body is too large" };

const declaredLength = (request: Request): number => {
  const length = Number(request.headers.get("content-length") ?? Number.NaN);
  return Number.isFinite(length) ? length : 0;
};

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
  if (body === null) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return concat(chunks, total);
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
    return { ok: false, status: 400, message: "Request body is not valid UTF-8" };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, message: "Request body is not valid JSON" };
  }
};

export const readJsonBody = async (request: Request, maxBytes: number): Promise<BodyResult> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { ok: false, status: 415, message: "Content-Type must be application/json" };
  }
  if (declaredLength(request) > maxBytes) return TOO_LARGE;
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

export const clientKey = (request: Request): string =>
  lastForwardedHop(request.headers.get("x-forwarded-for")) ??
  nonEmpty(request.headers.get("x-real-ip")) ??
  "anonymous";

const ALLOWED_FETCH_SITES: ReadonlySet<string> = new Set(["same-origin", "none"]);

/**
 * Rejects browser requests issued by other sites, which would spend this deployment's model quota.
 * Browsers send Sec-Fetch-Site on every fetch; Origin covers older ones. Clients that send neither
 * are not browsers and are left to the rate limiter.
 */
export const isCrossSiteRequest = (request: Request): boolean => {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) return !ALLOWED_FETCH_SITES.has(fetchSite);
  const origin = request.headers.get("origin");
  if (origin === null) return false;
  const host = request.headers.get("host") ?? new URL(request.url).host;
  return URL.parse(origin)?.host !== host;
};

export type ApiErrorBody = {
  error: string;
  correlationId: string;
  issues?: ReadonlyArray<{ path: string; message: string }>;
};

export type ResponseOptions = {
  status: number;
  correlationId: string;
  headers?: Record<string, string>;
};

export const jsonResponse = (
  body: unknown,
  { status, correlationId, headers = {} }: ResponseOptions,
): Response =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Request-Id": correlationId, ...headers },
  });

export const errorResponse = (
  body: Omit<ApiErrorBody, "correlationId">,
  options: ResponseOptions,
): Response => jsonResponse({ ...body, correlationId: options.correlationId }, options);
