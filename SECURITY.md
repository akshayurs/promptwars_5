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
returned to the browser and kept in `localStorage`.

| Threat                             | Control                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secret exposure                    | The key is read only on the server by [lib/env.ts](lib/env.ts), validated at boot in [instrumentation.ts](instrumentation.ts) and used in [lib/gemini.ts](lib/gemini.ts). It is never sent to the client and never logged.                                                                             |
| Cross-site scripting               | Per-request nonce CSP with `strict-dynamic` and no `unsafe-inline` for scripts in production ([proxy.ts](proxy.ts)). React escapes all model output; plain-text output is requested in [lib/prompts.ts](lib/prompts.ts).                                                                               |
| Clickjacking                       | `frame-ancestors 'none'` in the CSP and `X-Frame-Options: DENY` ([next.config.ts](next.config.ts)).                                                                                                                                                                                                    |
| Transport and browser hardening    | `Strict-Transport-Security` (two years, `includeSubDomains`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation, payment disabled), `Cross-Origin-Opener-Policy: same-origin`, `X-Powered-By` removed.      |
| Malformed or oversized input       | `readJsonBody` in [lib/http.ts](lib/http.ts) enforces `application/json` (415), a 32,768 byte limit (413) and valid JSON (400). Zod `.strict()` schemas in [lib/schema.ts](lib/schema.ts) reject unknown keys and out-of-range values (400 with field issues).                                         |
| Prompt injection                   | Intake and plan data are wrapped in `<intake>`, `<current_plan>` and `<request>` tags and the system prompt marks them as untrusted data ([lib/prompts.ts](lib/prompts.ts)). The model has no tools, so the worst outcome is a poor plan, and every response is re-validated by `GeneratedPlanSchema`. |
| Malformed model output             | JSON-schema constrained output plus Zod validation; one retry, then a 502 ([lib/gemini.ts](lib/gemini.ts)).                                                                                                                                                                                            |
| Abuse and cost exhaustion          | Token-bucket limiter, 10 requests burst, refilling 0.2 per second per client key, returning 429 with `Retry-After` ([lib/rateLimit.ts](lib/rateLimit.ts), [lib/api/planRoute.ts](lib/api/planRoute.ts)). Upstream calls abort after 45 seconds and when the client disconnects.                        |
| Information leakage                | Errors return generic messages with an `X-Request-Id` correlation id. Logs ([lib/logger.ts](lib/logger.ts)) record the id and failure code only, never request bodies or plans. Responses are `Cache-Control: no-store`.                                                                               |
| Corrupt or tampered client storage | `loadWorkspace` in [lib/storage.ts](lib/storage.ts) validates stored JSON against `StoredWorkspaceSchema` and removes invalid entries.                                                                                                                                                                 |
| Vulnerable or unused dependencies  | Dependencies are pinned to exact versions in [package.json](package.json); `npm run knip` flags unused ones; CI runs on every push ([.github/workflows/ci.yml](.github/workflows/ci.yml)).                                                                                                             |

## Known limitations

- The rate limiter is in memory and per server instance. It does not coordinate across instances
  (on Vercel, each serverless instance has its own counters) or restarts.
- The client key is the right-most `x-forwarded-for` hop, which the platform proxy appends
  (Vercel overwrites the header), falling back to `x-real-ip` ([lib/http.ts](lib/http.ts)).
  Behind a proxy that does not set these headers, all clients share one key or can spoof one.
- The limiter's bucket map is capped at 10,000 keys with least-recently-used eviction
  (`MAX_KEYS` in [lib/rateLimit.ts](lib/rateLimit.ts)), so memory stays bounded under a
  flood of distinct keys; an evicted key starts again with a full bucket.
- Plan data is stored unencrypted in the browser's `localStorage` and is readable by anyone with
  access to that browser profile.
- Event details are sent to Google's Gemini API; do not enter sensitive personal data.

## Operational guidance

- Provide `GEMINI_API_KEY` through the host's secret store (a sensitive environment variable on
  Vercel) or `.env.local` for local development. Never commit `.env*` files.
- Run `npm audit` and update dependencies regularly; re-run `npm run check` afterwards.
