# ADR-003: Nonce-based CSP with dynamic rendering

Status: Accepted

## Context

The application renders model-generated text and loads Next.js framework scripts. A Content
Security Policy without `unsafe-inline` limits the impact of any injected markup. Next.js inline
bootstrap scripts need a nonce, and a nonce must be unique per response, which is incompatible
with statically prerendered pages that are served unchanged.

## Decision

- Generate a nonce per request in [proxy.ts](../proxy.ts) from `crypto.randomUUID()` (base64) and
  set the policy on both the forwarded request headers (so Next.js can apply the nonce, via
  `x-nonce` and `Content-Security-Policy`) and the response.
- Policy: `default-src 'self'`; `script-src 'self' 'nonce-...' 'strict-dynamic'`;
  `style-src 'self' 'nonce-...'`; `img-src 'self' blob: data:`; `font-src 'self'`;
  `connect-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`;
  `frame-ancestors 'none'`; `upgrade-insecure-requests`. In development only, `'unsafe-eval'` is
  added to scripts and `'unsafe-inline'` to styles for hot reloading.
- `connect-src 'self'` is sufficient because the browser only calls `/api/*`; Gemini is called
  server-side.
- The proxy matcher skips `/api`, `_next/static`, `_next/image`, `favicon.ico` and prefetch
  requests.
- Force request-time rendering in [app/layout.tsx](../app/layout.tsx) with
  `await connection()`, so pages are never prerendered with a stale nonce.
- Static headers that do not vary per request live in [next.config.ts](../next.config.ts):
  HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and
  `Cross-Origin-Opener-Policy`.
- [tests/e2e/security.spec.ts](../tests/e2e/security.spec.ts) asserts the nonce, `frame-ancestors`
  and the hardened headers on a production build.

## Consequences

- Strong XSS mitigation: injected inline scripts without the nonce do not run, and
  `strict-dynamic` lets trusted scripts load their dependencies.
- Every page is rendered per request, so there is no static caching of HTML or CDN full-page
  caching. Pages are small and the data is client-side, so the cost is modest.
- Any new inline script or style must receive the nonce, and any new external origin (fonts,
  analytics, API) must be added to the policy deliberately.
- The development policy is weaker than production; the production policy must be verified with
  `npm run build` and the e2e security spec.
- Browsers differ on `'strict-dynamic'` and nonce support in older versions; unsupported browsers
  fall back to `'self'` rules.
