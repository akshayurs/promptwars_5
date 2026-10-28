# Testing

There are three layers. The two unit-level layers run in Vitest, which is configured with two
projects in [vitest.config.mts](../vitest.config.mts): `node` (`tests/unit/**` and `tests/api/**`)
and `dom` (jsdom: `tests/components/**` plus the unit files that need a browser, such as
`storage`, `workspaceStore` and `zod`). Every test must contain an assertion
(`expect.requireAssertions`). End-to-end tests run in Playwright.

| Layer             | Location                                                             | Environment                                      | What it covers                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit              | [tests/unit/](../tests/unit)                                         | Vitest, `node` project                           | Pure logic in `lib/`: schemas, budget, milestone and vendor logic, plan merging, reducer, store, storage, limiter, prompts, Gemini wrapper, env, logger, HTTP and response helpers, `proxy.ts`, `instrumentation.ts`, `robots.ts` |
| Component and API | [tests/components/](../tests/components), [tests/api/](../tests/api) | `dom` project (components), `node` project (API) | React components, every `app/` page, loading file, the root layout and the global error page with Testing Library and user-event; route handlers (plan, refine, CSP report) called with `Request` objects                         |
| End-to-end        | [tests/e2e/](../tests/e2e)                                           | Playwright, production build                     | Full flows, axe accessibility scans, security headers and API guards                                                                                                                                                              |

## What is mocked

- **Gemini SDK (unit):** [tests/unit/gemini.test.ts](../tests/unit/gemini.test.ts) builds a
  `ModelClient` with a `vi.fn` `generateContent`, so no network call is made. It covers valid JSON,
  empty output, invalid JSON, schema mismatches, the single malformed retry, timeouts and upstream
  errors. [tests/unit/deps.test.ts](../tests/unit/deps.test.ts) mocks `@/lib/gemini` and
  `@/lib/env` to check lazy construction.
- **Route dependencies (API):** [tests/api/routes.test.ts](../tests/api/routes.test.ts) mocks
  `@/lib/api/deps`; [tests/api/planRoute.test.ts](../tests/api/planRoute.test.ts) injects a fake
  generator, limiter and logger into `createPlanRoute`.
- **Client requests (components):** `@/lib/client` is mocked with `vi.mock`; `next/navigation`'s
  `useRouter` is mocked where navigation is asserted. [tests/unit/client.test.ts](../tests/unit/client.test.ts)
  stubs global `fetch`.
- **Browser storage:** jsdom `localStorage` is cleared and Testing Library is cleaned up after each
  test in [tests/setup.ts](../tests/setup.ts).
- **Time and timezone:** both projects load [tests/setup.clock.ts](../tests/setup.clock.ts), which
  fakes only `Date` and sets it to `FIXED_NOW` ([tests/unit/clock.ts](../tests/unit/clock.ts)) before
  every test, so tests that call `vi.useFakeTimers()` themselves keep the same instant. Fixtures derive
  dates from `FIXED_NOW` instead of reading the real clock, and pure functions also take injectable
  clocks. Runs are pinned to `TZ=UTC` (`vitest.config.mts`, the `test*` npm scripts and Playwright's
  `timezoneId`).
- **E2E page guard:** [tests/e2e/fixtures.ts](../tests/e2e/fixtures.ts) fails every e2e test on a CSP
  violation (`securitypolicyviolation` event or console message), an uncaught page error, or a mocked
  API request body that does not match the shared request schemas.
- **API routes (e2e):** Playwright intercepts `**/api/plan` and `**/api/refine` with `page.route`
  ([tests/e2e/fixtures.ts](../tests/e2e/fixtures.ts)), so e2e never reaches Gemini. The web server
  starts with a dummy `GEMINI_API_KEY` set in [playwright.config.ts](../playwright.config.ts).
  The security spec calls the real routes directly to check the 415, 400, 413 and cross-site 403
  rejections, which happen before any model call.

## Coverage thresholds

Configured in [vitest.config.mts](../vitest.config.mts) for `lib/**`, `components/**`, `app/**`,
`proxy.ts` and `instrumentation.ts` (v8 provider). All four metrics must be 100%:

| Metric     | Minimum |
| ---------- | ------- |
| Lines      | 100%    |
| Statements | 100%    |
| Functions  | 100%    |
| Branches   | 100%    |

`npm test` fails if any threshold is missed. Tests are type-checked by their own project
([tests/tsconfig.json](../tests/tsconfig.json)) as part of `npm run typecheck`. Reports (text, html, lcov, json-summary) go to the
terminal and `coverage/`.

## Running

```bash
npm test                      # unit, component, API tests with coverage and thresholds
npm run test:watch            # Vitest watch mode
npx vitest run tests/unit/budget.test.ts   # a single file
npm run test:e2e              # builds, serves on 127.0.0.1:3100, runs desktop and mobile projects
npx playwright install chromium            # first run only
npx playwright test tests/e2e/accessibility.spec.ts --project=mobile
npx playwright show-report    # open the HTML report after a run
```

Playwright runs two projects, `desktop` (Desktop Chrome) and `mobile` (Pixel 7), with traces kept
on failure and `forbidOnly` enabled. The web server is always rebuilt (`reuseExistingServer:
false`), so port 3100 must be free.

## End-to-end specs

- [planning.spec.ts](../tests/e2e/planning.spec.ts): intake validation (focus on the error summary,
  `aria-invalid`), API failure message, generate-browse-edit-persist (tabs by click and
  `ArrowRight`, vendor progress, over-budget warning, reload), budget controls within the
  viewport, empty workspace, refine and undo, summary print layout, JSON export and start over.
- [workspace.spec.ts](../tests/e2e/workspace.spec.ts): milestone progress and the "Next up" card,
  milestone and vendor checkboxes toggled with `Space`, budget lines added, removed and the total
  edited, all persisting across reload.
- [refine.spec.ts](../tests/e2e/refine.spec.ts): the refine request body, a too-short instruction,
  and 502 and 503 failures.
- [eventTypes.spec.ts](../tests/e2e/eventTypes.spec.ts): birthday and community intake fields and
  generated plans.
- [flows.spec.ts](../tests/e2e/flows.spec.ts): cancelling generation and refinement (the mocked
  route is held on a promise the test releases), editing event details, the replace-plan
  confirmation, importing a plan file (valid and invalid), the calendar and CSV downloads, and
  budget amount validation.
- [accessibility.spec.ts](../tests/e2e/accessibility.spec.ts): axe scans of the intake page (also
  with validation errors), every workspace tab, an over-budget workspace, the empty workspace, the
  summary, the edit-details page, the 404 page, the replace-plan confirmation, an invalid import,
  the cancelled notice, the start-over confirmation, refine success, error and validation states, and the intake, workspace
  and summary pages in the dark colour scheme; one `h1` on the intake, workspace, edit, summary and 404 pages; skip link reached with `Tab` and
  activated with `Enter`.
- [security.spec.ts](../tests/e2e/security.spec.ts): CSP nonce, hardened headers, and for both API
  routes 415, 400 (invalid JSON and schema-invalid), 413, 405 with `Allow: POST`, and cross-site
  403 responses.

## Writing tests

- Build inputs with the fixtures in [tests/unit/fixtures.ts](../tests/unit/fixtures.ts) and
  [tests/components/fixtures.tsx](../tests/components/fixtures.tsx).
- Inject clocks and id factories (`createWorkspaceReducer(now)`, `createRateLimiter({ now })`,
  `toPlan(generated, nextId)`) instead of faking timers or `crypto`.
- Query by role and accessible name in component and e2e tests.
- CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) runs the Vitest layer in the `verify`
  job (uploading `coverage/`) and Playwright in the `e2e` job, uploading `playwright-report/` on
  failure.
