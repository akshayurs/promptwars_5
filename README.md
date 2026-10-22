# EventCraft

EventCraft is a planning assistant for weddings, birthdays and community events. You describe the event (type, name, date, guest count, budget, currency, location, vibe and must-haves) and Gemini 2.5 Flash returns a structured plan: a budget breakdown, a dated timeline, a vendor checklist with questions to ask, and ideas that cite which part of your brief inspired them. You can edit amounts, tick vendors off, ask the model to revise the plan in natural language (with one-step undo), and export the result as JSON or print it. The Gemini key is only ever used on the server; the plan itself lives in your browser's localStorage.

## Features

| Problem-statement clause              | What it does                                                                                                                  | Implemented in                                                                                                                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weddings, birthdays, community events | Event type chosen on the intake form; each type has its own planning guidance in the prompt                                   | [components/IntakeForm.tsx](components/IntakeForm.tsx), [lib/constants.ts](lib/constants.ts) (`EVENT_TYPES`), [lib/prompts.ts](lib/prompts.ts) (`EVENT_GUIDANCE`)                                                         |
| Budgets                               | Per-category allocations with rationale, editable amounts, live "allocated vs total" progress and an "Over budget" warning    | [components/BudgetTable.tsx](components/BudgetTable.tsx), [lib/budget.ts](lib/budget.ts)                                                                                                                                  |
| Timelines                             | Milestones grouped by phase (planning, booking, final-prep, event-day) and shown with real dates computed from the event date | [components/Timeline.tsx](components/Timeline.tsx), [lib/budget.ts](lib/budget.ts) (`groupMilestonesByPhase`), [lib/format.ts](lib/format.ts)                                                                             |
| Vendor checklists                     | Vendors with why-needed, questions to ask, and a booked checkbox with progress                                                | [components/VendorChecklist.tsx](components/VendorChecklist.tsx)                                                                                                                                                          |
| Personalised ideas                    | Ideas that each name the intake detail that inspired them                                                                     | [components/IdeasList.tsx](components/IdeasList.tsx), [lib/prompts.ts](lib/prompts.ts)                                                                                                                                    |
| Refine loop                           | Free-text instruction sends intake + current plan to the model; booked vendors are carried over by category; one-step undo    | [components/RefinePanel.tsx](components/RefinePanel.tsx), [app/api/refine/route.ts](app/api/refine/route.ts), [lib/plan.ts](lib/plan.ts) (`mergeRefinedPlan`, `diffPlans`), [lib/workspace.ts](lib/workspace.ts) (`undo`) |
| Keep and share the result             | Printable summary, JSON export, start over                                                                                    | [components/PlanSummary.tsx](components/PlanSummary.tsx)                                                                                                                                                                  |

Routes: `/` (intake), `/plan` (workspace with Budget, Timeline, Vendors and Ideas tabs plus the refine panel), `/plan/summary` (read-only printable view), `POST /api/plan`, `POST /api/refine`.

## Architecture

```
Browser (IntakeForm / RefinePanel)
  | IntakeSchema.safeParse on the client (fast feedback)
  | fetch POST /api/plan or /api/refine  (lib/client.ts)
  v
Route handler (app/api/plan/route.ts, app/api/refine/route.ts)
  -> createPlanRoute (lib/api/planRoute.ts)
       1. in-memory token-bucket rate limit per client IP   (lib/rateLimit.ts)
       2. content-type, 32 KiB body limit, JSON parse        (lib/http.ts)
       3. Zod validation of the request body                 (lib/schema.ts)
       4. 45 s timeout combined with the request abort signal
  v
Gemini 2.5 Flash, structured JSON output (lib/gemini.ts)
  responseMimeType application/json + JSON schema derived from the Zod schema,
  prompts built in lib/prompts.ts, one retry only if the output is malformed
  v
Zod validation of the model output (GeneratedPlanSchema)
  v
Server assigns UUIDs (toPlan / mergeRefinedPlan in lib/plan.ts)
  v
Browser validates the response again (PlanSchema in lib/client.ts)
  v
Client store (lib/workspaceStore.ts + lib/workspace.ts reducer, read through useSyncExternalStore)
  v
localStorage key "eventcraft.plan.v1" (lib/storage.ts, validated with StoredWorkspaceSchema on read)
```

Failures map to HTTP status codes: 400 validation or invalid JSON, 413 body too large, 415 wrong content type, 429 rate limited (with `Retry-After`), 502 upstream or malformed model output, 504 timeout, 500 unexpected. Every response carries a correlation id (`X-Request-Id` header and `correlationId` in error bodies).

## Tech stack

Versions are the exact pins from [package.json](package.json).

- Next.js 16.4.2 (App Router), React 19.3.0, TypeScript 5.9.3 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Tailwind CSS 4.3.3 via `@tailwindcss/turbopack` 4.3.3
- `@google/genai` 2.30.0 (model `gemini-2.5-flash`), Zod 4.6.7
- Radix UI primitives: `@radix-ui/react-tabs` 1.2.1, `@radix-ui/react-checkbox` 1.4.1
- Vitest 5.0.5 with `@vitest/coverage-v8`, Testing Library (`@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.8, `@testing-library/jest-dom` 7.0.1), jsdom 29.1.1
- Playwright 1.64.1 and `@axe-core/playwright` 4.14.0
- ESLint 9.39.5 (typescript-eslint 8.71.2 strict-type-checked, jsx-a11y, sonarjs), Prettier 3.9.10, Knip 6.41.0

## Setup

Requires Node.js 20 or newer (`engines.node` is `>=20`; CI uses Node 22).

```bash
npm ci
cp .env.example .env.local
# edit .env.local and set GEMINI_API_KEY (create a key in Google AI Studio)
npm run dev
```

Open http://localhost:3000. The server refuses to start without `GEMINI_API_KEY` (see Security below).

## Scripts

| Script                 | Command                                                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `npm run dev`          | `next dev`                                             | Development server                                     |
| `npm run build`        | `next build`                                           | Production build (also type-checks)                    |
| `npm run start`        | `next start`                                           | Serve the production build                             |
| `npm run lint`         | `eslint . --max-warnings 0`                            | Lint, zero warnings allowed                            |
| `npm run format`       | `prettier --check .`                                   | Verify formatting                                      |
| `npm run format:write` | `prettier --write .`                                   | Apply formatting                                       |
| `npm run typecheck`    | `tsc --noEmit`                                         | Type check                                             |
| `npm run test`         | `vitest run --coverage`                                | Unit, API and component tests with coverage thresholds |
| `npm run test:watch`   | `vitest`                                               | Watch mode                                             |
| `npm run test:e2e`     | `playwright test`                                      | End-to-end and accessibility tests                     |
| `npm run knip`         | `knip`                                                 | Unused files, exports and dependencies                 |
| `npm run check`        | lint, format, typecheck, test, knip, build in sequence | Everything CI runs except e2e                          |

## Testing strategy

- **Unit and API (Vitest, jsdom)**: `tests/unit/**` for pure logic (schema, budget maths, plan merging and diffing, formatting, prompts, rate limiter, storage) and `tests/api/**` for the route handler. Coverage is measured with V8 over `lib/**`, `components/**` and `app/api/**`, and `vitest.config.ts` fails the run below 95% lines, 90% branches, 95% functions and 95% statements.
- **Components (Vitest + Testing Library)**: `tests/components/**` render the budget table, vendor checklist, ideas list, refine panel and UI primitives and interact with them as a user would.
- **End to end (Playwright)**: `tests/e2e/**` runs against a production build (`npm run build && next start -p 3100`, configured in [playwright.config.ts](playwright.config.ts)) on two projects, desktop Chrome and a Pixel 7 emulation.
  - `planning.spec.ts`: intake validation, happy path (tabs by click and ArrowRight, vendor progress, over-budget warning, persistence across reload), refine and undo, summary (read-only, JSON export, start over), API error handling, empty state.
  - `security.spec.ts`: CSP with nonce and `frame-ancestors 'none'`, `X-Content-Type-Options`, `X-Frame-Options`, no `X-Powered-By`, and 415, 400 and 413 responses from `POST /api/plan`.
  - `accessibility.spec.ts`: axe-core scans (tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice`) on the intake page, each workspace tab, the empty workspace and the summary; exactly one `h1` per page; skip link is the first focusable element and moves focus to `#main`.
- **What is mocked and why**: Gemini is never called in any test. Unit and API tests inject a fake model client. In e2e the browser's `POST /api/plan` and `POST /api/refine` are intercepted with `page.route` and answered with schema-valid plan fixtures (`tests/e2e/fixtures.ts`), so tests are deterministic, free and need no real key. The security tests hit the real route handler directly with malformed requests that are rejected before any model call.

## Security notes

- **Server-only key**: `GEMINI_API_KEY` is read in [lib/env.ts](lib/env.ts) and used only in [lib/api/deps.ts](lib/api/deps.ts) and [lib/gemini.ts](lib/gemini.ts) inside route handlers. It is not exposed through a `NEXT_PUBLIC_` variable.
- **Env validation at startup**: [instrumentation.ts](instrumentation.ts) calls `readEnv()` when the Node.js runtime registers, so a missing key fails fast.
- **Strict Zod at every boundary**: request bodies (`IntakeSchema`, `RefineRequestSchema`), model output (`GeneratedPlanSchema`), the API response as read by the browser (`PlanSchema`) and the stored workspace (`StoredWorkspaceSchema`). Object schemas are `.strict()` and text fields have length limits ([lib/constants.ts](lib/constants.ts) `LIMITS`).
- **Body size limit**: 32,768 bytes, checked against `Content-Length` and again on the actual text ([lib/http.ts](lib/http.ts)); non-JSON content types get 415.
- **Rate limiting**: token bucket per client key (capacity 10, refill 0.2 per second) in [lib/rateLimit.ts](lib/rateLimit.ts); 429 with `Retry-After`.
- **CSP with a per-request nonce**: [proxy.ts](proxy.ts) builds `default-src 'self'`, nonce plus `'strict-dynamic'` script policy, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` and `connect-src 'self'` (`'unsafe-eval'` only in development).
- **Security headers**: [next.config.ts](next.config.ts) sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, and disables `X-Powered-By`.
- **Prompt-injection mitigation**: [lib/prompts.ts](lib/prompts.ts) wraps user input in `<intake>`, `<current_plan>` and `<request>` tags and tells the model to treat the tagged content as data, not instructions. Output is constrained by a JSON schema and re-validated, so injected text can at worst change plan content, not shape or behaviour.
- **No HTML rendering of model output**: all model text is rendered as React text nodes; there is no `dangerouslySetInnerHTML`.
- **localStorage validated on read**: [lib/storage.ts](lib/storage.ts) parses with `StoredWorkspaceSchema` and removes the entry if it is corrupt or invalid.
- **Errors**: upstream failures return generic messages; logs carry a correlation id and error class, not request bodies.

## Accessibility notes

Target: WCAG 2.2 AA.

- Landmarks: skip link, `header`, `nav` ("Primary"), `main#main`, `footer` in [app/layout.tsx](app/layout.tsx); `lang="en"` on the document.
- Skip link is the first focusable element and moves focus to the focusable `main` element.
- Every control is labelled; form errors use `aria-invalid` and `aria-describedby` ([components/ui/Field.tsx](components/ui/Field.tsx)); after a failed submit focus moves to the error summary container at the top of the form.
- Status messages use `role="status"` and `aria-live="polite"` (vendor progress, budget status, refine result, loading).
- Tabs and checkboxes use Radix primitives, which provide arrow-key navigation and correct ARIA roles; tables have captions and header scopes.
- Touch targets are at least 44 px tall (`min-h-11`) on buttons and tabs; state is never conveyed by colour alone (icons and text accompany alert tones).
- `prefers-reduced-motion` is honoured in [app/globals.css](app/globals.css); a dark colour scheme is provided.
- axe-core runs in the e2e suite (see Testing strategy).

## Efficiency notes

- Server components by default; client components (`"use client"`) only where interaction is needed: the intake form, workspace, tabs, budget table, vendor checklist, refine panel, summary actions and error boundary.
- One model call per user action (generate or refine); a second call happens only if the first response fails schema validation (`RETRIES_ON_MALFORMED = 1` in [lib/gemini.ts](lib/gemini.ts)).
- Bounded cost: `maxOutputTokens` 8,192, thinking budget 512, request timeout 45 s, and list size caps in the schema.
- State lives in a small external store read with `useSyncExternalStore`; persistence is a single localStorage write per change.

## Known limitations

- The rate limiter is in memory, so each server instance has its own counters and they reset on restart. A shared store (for example Redis) would be needed for multi-instance deployments.
- Plans are stored only in the browser's localStorage: no accounts, no sync across devices, cleared with site data. One plan at a time and one level of undo.
- The UI is English only, and currency and date formatting use fixed locales per currency.
- `npm audit` (all dependencies) reports 5 high-severity advisories that come through the `eslint-config-next` dev dependency (`@next/eslint-plugin-next` to `fast-glob` to `micromatch`). `npm audit --omit=dev` reports 0 vulnerabilities, because this tooling is not part of the production bundle. This was checked with `npm audit` on 2026-10-22.
