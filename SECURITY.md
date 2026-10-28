# Security Policy

## Reporting a vulnerability

Email **akshay.u@browserstack.com** with the subject `EventCraft security report`. Include:

- A description of the issue and its impact.
- Steps to reproduce, or a proof of concept.
- The affected route, file or commit, if known.

Please do not open a public issue for a suspected vulnerability. Expect an acknowledgement within
five working days. Reports are triaged by severity, fixed on `main`, and the reporter is told when
the fix ships. Please allow a reasonable disclosure window before publishing details.

Never include a real `GEMINI_API_KEY` in a report. If you find one committed anywhere, report its
location and rotate it.

## Supported versions

| Version | Supported                     |
| ------- | ----------------------------- |
| 1.0.x   | Yes (`main` is the only line) |
| < 1.0   | No                            |

Only the latest commit on `main` receives security fixes.

## Threat model summary

EventCraft has no accounts and no database. The only server-side secret is `GEMINI_API_KEY`. User
data (the intake and generated plan) is sent to `/api/plan` or `/api/refine`, forwarded to Gemini,
returned to the browser and kept in `localStorage`. Browsers may also post CSP violation reports
to `/api/csp-report`.

| Threat                             | Control                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secret exposure                    | The key is read only on the server by [lib/env.ts](lib/env.ts), validated at boot in [instrumentation.ts](instrumentation.ts) and used in [lib/gemini.ts](lib/gemini.ts). It is never sent to the client and never logged.                                                                                                                                                                                                                                         |
| Cross-site scripting               | Per-request CSP in [proxy.ts](proxy.ts) with a 128-bit nonce from `crypto.getRandomValues`, `strict-dynamic` and no `unsafe-inline` for scripts in production. React escapes all model output; plain-text output is requested in [lib/prompts.ts](lib/prompts.ts).                                                                                                                                                                                                 |
| Undetected CSP violations          | The page CSP carries `report-to csp` (with a `Reporting-Endpoints` header) and `report-uri` for older browsers, both pointing at `POST /api/csp-report` ([lib/api/cspReport.ts](lib/api/cspReport.ts)). That route accepts only `application/reports+json` and `application/csp-report`, caps bodies at 8,192 bytes, has its own rate limiter, answers 204 and logs only counts of directive names and blocked hosts, never URLs, paths, query strings or samples. |
| Clickjacking                       | `frame-ancestors 'none'` in the CSP and `X-Frame-Options: DENY` ([next.config.ts](next.config.ts)).                                                                                                                                                                                                                                                                                                                                                                |
| Transport and browser hardening    | `Strict-Transport-Security` (two years, `includeSubDomains`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation, payment disabled), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `X-Permitted-Cross-Domain-Policies: none`, `X-Powered-By` removed.                                                                          |
| API response misuse                | Every API response ([lib/api/responses.ts](lib/api/responses.ts)) carries `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` and an `X-Request-Id`, including the empty 204 and 499 responses. `GET`, `PUT`, `PATCH` and `DELETE` on the API routes return 405 with `Allow: POST`.                                                                                                |
| Malformed or oversized input       | `readJsonBody` in [lib/http.ts](lib/http.ts) enforces the exact media type (415), a 131,072 byte limit (413) that fits the largest schema-valid refine request even in three-byte UTF-8 text, and valid UTF-8 JSON (400). Zod `.strict()` schemas in [lib/schema.ts](lib/schema.ts) reject unknown keys and out-of-range values (400 with field issues).                                                                                                           |
| Prompt injection                   | The intake, plan and request are wrapped in `<intake>`, `<current_plan>`, `<keep>` and `<request>` tags, `<` is escaped inside them, and the system prompt marks them as untrusted data ([lib/prompts.ts](lib/prompts.ts)). Free-text details are never interpolated into instructions. The model has no tools, so the worst outcome is a poor plan, and every response is re-validated by `LenientGeneratedPlanSchema`.                                           |
| Malformed model output             | JSON-schema constrained output, then `LenientGeneratedPlanSchema` ([lib/generatedPlanSchema.ts](lib/generatedPlanSchema.ts)), which truncates over-long text and lists and rejects missing or mistyped fields. One retry on a malformed reply (skipped once the request is aborted), then a 502 ([lib/gemini.ts](lib/gemini.ts)).                                                                                                                                  |
| Cross-site request forgery         | `POST /api/plan` and `POST /api/refine` reject browser requests from other sites with 403 before any other work: `Sec-Fetch-Site` must be `same-origin` or `none` (a user-initiated navigation), or, when a browser omits it, `Origin` must match the host ([lib/http.ts](lib/http.ts) `isCrossSiteRequest`). Rejected requests do not consume rate-limit tokens.                                                                                                  |
| Abuse and cost exhaustion          | Token-bucket limiter, 10 requests burst, refilling 0.2 per second per client key ([lib/rateLimit.ts](lib/rateLimit.ts), [lib/api/planRoute.ts](lib/api/planRoute.ts)). Responses carry `RateLimit-Policy` and `RateLimit` headers; a 429 adds `Retry-After`. Gemini output is capped by `maxOutputTokens` and a thinking budget. Upstream calls abort after 45 seconds and when the client disconnects.                                                            |
| Information leakage                | Errors return generic messages with an `X-Request-Id` correlation id. Logs ([lib/logger.ts](lib/logger.ts)) never contain request bodies, plans or prompts: rejected requests (400, 403, 413, 415, 429) are logged at warn with the id, status and a reason code; generation failures with the id and failure code; each model call at info with the id, attempt, duration and token counts.                                                                       |
| Corrupt or tampered client storage | `loadWorkspace` in [lib/storage.ts](lib/storage.ts) validates stored JSON against `StoredWorkspaceSchema` and removes invalid entries.                                                                                                                                                                                                                                                                                                                             |
| Vulnerable or unused dependencies  | Dependencies are pinned to exact versions in [package.json](package.json); `npm run knip` flags unused ones; CI runs on every push ([.github/workflows/ci.yml](.github/workflows/ci.yml)).                                                                                                                                                                                                                                                                         |

## Known limitations

- **Per-instance rate limiting.** The limiter is in memory and per server instance. It does not
  coordinate across instances (on Vercel, each serverless instance has its own counters) or
  survive restarts, so the effective limit grows with the number of warm instances. For
  multi-instance deployments, add a Vercel Firewall rate-limit rule on `/api/plan` and
  `/api/refine`, or back the limiter with a shared store such as Upstash Redis.
- **Client key trust.** The client key is the right-most `x-forwarded-for` hop, which the platform
  proxy appends (Vercel overwrites the header), falling back to `x-real-ip`
  ([lib/http.ts](lib/http.ts)). Behind a proxy that does not set these headers, all clients share
  one key or can spoof one.
- **Bounded limiter memory.** The bucket map is capped at `API.rateLimit.maxKeys` (10,000) in
  [lib/constants.ts](lib/constants.ts) with least-recently-used eviction, so memory stays bounded
  under a flood of distinct keys; an evicted key starts again with a full bucket.
- **No global spend cap.** Nothing in the app limits total Gemini spend across all clients. Set a
  Google Cloud budget alert on the project and a per-day quota on the API key.
- **No bot challenge.** Requests are not challenged (no CAPTCHA or proof of work); automated
  clients are limited only by the rate limiter and the same-site check.
- **No Trusted Types enforcement.** The CSP does not include `require-trusted-types-for 'script'`:
  the Next.js runtime chunk loader assigns `script.src` from plain strings, which enforcement would
  block. The app itself has no HTML sinks; all model output is rendered as React text nodes.
- Plan data is stored unencrypted in the browser's `localStorage` and is readable by anyone with
  access to that browser profile.
- Event details are sent to Google's Gemini API; do not enter sensitive personal data.

## Operational guidance

- Provide `GEMINI_API_KEY` through the host's secret store (a sensitive environment variable on
  Vercel) or `.env.local` for local development. Never commit `.env*` files.
- Watch warn-level `csp violation` and `request rejected` log lines; a spike in either is the first
  sign of an injection attempt or abuse.
- Run `npm audit` and update dependencies regularly; re-run `npm run check` afterwards.
