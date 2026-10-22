# Testing

There are three layers. All unit-level layers run in Vitest; end-to-end runs in Playwright.

| Layer             | Location                                                             | Environment                      | What it covers                                                                                                                   |
| ----------------- | -------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Unit              | [tests/unit/](../tests/unit)                                         | Vitest + jsdom                   | Pure logic in `lib/`: schemas, budget math, reducer, store, storage, limiter, prompts, Gemini wrapper, env, logger, HTTP helpers |
| Component and API | [tests/components/](../tests/components), [tests/api/](../tests/api) | Vitest + jsdom + Testing Library | React components with user-event; route handlers called with `Request` objects                                                   |
| End-to-end        | [tests/e2e/](../tests/e2e)                                           | Playwright, production build     | Full flows, axe accessibility scans, security headers and API guards                                                             |

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
- **Browser storage:** jsdom `localStorage` is cleared after each test in
  [vitest.setup.ts](../vitest.setup.ts).
- **API routes (e2e):** Playwright intercepts `**/api/plan` and `**/api/refine` with `page.route`
  ([tests/e2e/fixtures.ts](../tests/e2e/fixtures.ts)), so e2e never reaches Gemini. The web server
  starts with a placeholder `GEMINI_API_KEY` set in [playwright.config.ts](../playwright.config.ts).
  The security spec calls the real routes directly to check 415, 400 and 413 responses, which are
  rejected before any model call.

## Coverage thresholds

Configured in [vitest.config.ts](../vitest.config.ts) for `lib/**`, `components/**` and
`app/api/**` (v8 provider):

| Metric     | Minimum |
| ---------- | ------- |
| Lines      | 95%     |
| Statements | 95%     |
| Functions  | 95%     |
| Branches   | 90%     |

`npm test` fails if any threshold is missed. Reports go to the terminal and `coverage/`.

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

- [planning.spec.ts](../tests/e2e/planning.spec.ts): intake validation, API failure message,
  generate-browse-edit-persist, empty workspace, refine and undo, summary export and start over.
- [accessibility.spec.ts](../tests/e2e/accessibility.spec.ts): axe scans of every page and
  workspace tab, one `h1` per page, skip-link behaviour.
- [security.spec.ts](../tests/e2e/security.spec.ts): CSP nonce, hardened headers, request guards.

## Writing tests

- Build inputs with the fixtures in [tests/unit/fixtures.ts](../tests/unit/fixtures.ts) and
  [tests/components/fixtures.tsx](../tests/components/fixtures.tsx).
- Inject clocks and id factories (`createWorkspaceReducer(now)`, `createRateLimiter({ now })`,
  `toPlan(generated, nextId)`) instead of faking timers or `crypto`.
- Query by role and accessible name in component and e2e tests.
- CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) runs the Vitest layer in the `verify`
  job and Playwright in the `e2e` job, uploading `playwright-report/` on failure.
