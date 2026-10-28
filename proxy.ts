import { NextResponse, type NextRequest } from "next/server";

const NONCE_BYTES = 16;
const CSP_REPORT_ENDPOINT = "/api/csp-report";
const CSP_REPORT_GROUP = "csp";

/** 128-bit base64 nonce from the platform CSPRNG, fresh for every request. */
const createNonce = (): string =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(NONCE_BYTES))).toString("base64");

/** Page CSP: nonce-locked scripts and styles, no framing, violations reported to our endpoint. */
export const buildContentSecurityPolicy = (nonce: string, isDevelopment: boolean): string =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    `report-uri ${CSP_REPORT_ENDPOINT}`,
    `report-to ${CSP_REPORT_GROUP}`,
  ].join("; ");

/** Sets the per-request nonce CSP on the page request (for Next to read) and on the response. */
export const proxy = (request: NextRequest): NextResponse => {
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Reporting-Endpoints", `${CSP_REPORT_GROUP}="${CSP_REPORT_ENDPOINT}"`);
  return response;
};

export const config = {
  matcher: [
    {
      source:
        "/((?!api/|_next/static|_next/image|.well-known/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
