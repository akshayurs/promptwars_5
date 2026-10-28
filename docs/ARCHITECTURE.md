# Architecture

EventCraft is a Next.js 16 App Router application (React 19, TypeScript, Tailwind CSS 4). It has no
database. The server validates input, calls Gemini 2.5 Flash and returns a plan; the browser owns
and persists all plan state.

## Layout

| Path                                                                                                                               | Responsibility                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [app/](../app)                                                                                                                     | Routes: `/` intake and plan import, `/plan` workspace, `/plan/edit` edit event details, `/plan/summary`, `POST /api/plan`, `POST /api/refine`, `POST /api/csp-report`; `loading.tsx` for `/plan` and `/plan/summary`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `robots.ts` |
| [components/](../components)                                                                                                       | Feature components; their parts live in `intake/`, `budget/`, `timeline/`, `workspace/`, `summary/`, `refine/`; [ui/](../components/ui) holds primitives, icons and shared styles                                                                                                   |
| [lib/schema.ts](../lib/schema.ts), [lib/intakeSchema.ts](../lib/intakeSchema.ts), [lib/types.ts](../lib/types.ts)                  | Zod schemas and inferred types (single source of truth)                                                                                                                                                                                                                             |
| [lib/generatedPlanSchema.ts](../lib/generatedPlanSchema.ts), [lib/geminiSchema.ts](../lib/geminiSchema.ts)                         | Server-only model contract: the described schema, the lenient parser for model output, and the JSON schema sent to Gemini with unsupported keywords stripped                                                                                                                        |
| [lib/constants.ts](../lib/constants.ts)                                                                                            | Limits, API settings, storage key and version                                                                                                                                                                                                                                       |
| [lib/gemini.ts](../lib/gemini.ts)                                                                                                  | `PlanGenerator`: Gemini call, JSON parsing, retry, error mapping                                                                                                                                                                                                                    |
| [lib/prompts.ts](../lib/prompts.ts), [lib/promptBlocks.ts](../lib/promptBlocks.ts)                                                 | System and user prompt builders and the data blocks they embed                                                                                                                                                                                                                      |
| [lib/plan.ts](../lib/plan.ts)                                                                                                      | Server-side plan rules: ids, budget fit, lead-time clamp, refine carry-over, diffs                                                                                                                                                                                                  |
| [lib/budget.ts](../lib/budget.ts), [lib/milestones.ts](../lib/milestones.ts), [lib/vendors.ts](../lib/vendors.ts)                  | Pure budget, timeline and vendor logic used by the reducer and the UI                                                                                                                                                                                                               |
| [lib/money.ts](../lib/money.ts), [lib/dates.ts](../lib/dates.ts), [lib/format.ts](../lib/format.ts), [lib/text.ts](../lib/text.ts) | Minor-unit rounding, calendar-day arithmetic with injectable clocks, display formatting, word-boundary truncation                                                                                                                                                                   |
| [lib/api/](../lib/api)                                                                                                             | `createPlanRoute` pipeline, `createCspReportRoute`, response helpers and route dependencies                                                                                                                                                                                         |
| [lib/http.ts](../lib/http.ts), [lib/rateLimit.ts](../lib/rateLimit.ts), [lib/logger.ts](../lib/logger.ts)                          | Body reading, client key and cross-site check, limiter, JSON-lines logs                                                                                                                                                                                                             |
| [lib/workspace.ts](../lib/workspace.ts), [lib/workspaceStore.ts](../lib/workspaceStore.ts), [lib/storage.ts](../lib/storage.ts)    | Client state                                                                                                                                                                                                                                                                        |
| [lib/export.ts](../lib/export.ts)                                                                                                  | Export files built from the workspace: JSON, an iCalendar file (RFC 5545, all-day entries for the event and each milestone) and a budget CSV (RFC 4180, formula-prefix defused, UTF-8 BOM)                                                                                          |
| [lib/importWorkspace.ts](../lib/importWorkspace.ts), [lib/intakeEdit.ts](../lib/intakeEdit.ts)                                     | Validation of an exported plan file (size cap `LIMITS.importFileBytes`, then `StoredWorkspaceSchema`); the fixed instruction that turns edited event details into a refine request                                                                                                  |
| [proxy.ts](../proxy.ts), [next.config.ts](../next.config.ts)                                                                       | CSP nonce and security headers                                                                                                                                                                                                                                                      |
| [instrumentation.ts](../instrumentation.ts)                                                                                        | Validates `GEMINI_API_KEY` when the Node.js server starts; logs request errors by digest                                                                                                                                                                                            |

## Request flow (`POST /api/plan`, `POST /api/refine`)

Both routes are built with `createPlanRoute` ([lib/api/planRoute.ts](../lib/api/planRoute.ts)); only
the schema and `execute` function differ. Any other method on these routes (and on
`/api/csp-report`) returns 405 with `Allow: POST` (`methodNotAllowed` in
[lib/api/responses.ts](../lib/api/responses.ts)).

```
Browser (lib/client.ts postJson)
  |  POST application/json
  v
app/api/{plan|refine}/route.ts
  |
  1. correlationId = crypto.randomUUID()
  2. isCrossSiteRequest                  -> 403 (Sec-Fetch-Site not same-origin/none,
                                                  or Origin host differs)
  3. limiter.consume(clientKey)          -> 429 + Retry-After (+ RateLimit headers on all
                                                  later responses)
  4. readJsonBody (131,072 byte cap)     -> 415 / 413 / 400 (invalid UTF-8 or JSON)
  5. schema.safeParse                    -> 400 + issues[]
        plan:   IntakeSchema
        refine: RefineRequestSchema (intake + plan + instruction)
  6. signal = AbortSignal.any([timeout(45s), request.signal])
  7. generator.generate | generator.refine
        buildPlanPrompt | buildRefinePrompt
        -> Gemini gemini-2.5-flash (JSON mime type + JSON schema,
           temperature 0.7 generate / 0.3 refine, maxOutputTokens 16,384,
           thinkingBudget 512)
        -> JSON.parse -> LenientGeneratedPlanSchema; retry once if malformed
  8. plan:   toPlan(fitPlanToIntake(generated, intake))
     refine: mergeRefinedPlan(previous, fitPlanToIntake(generated, intake))
  |
  v  200 Plan
     499 client closed the request (empty body)
     502 malformed or upstream failure
     503 model busy (upstream 429 or 503) + Retry-After: 5
     504 timeout
     500 unexpected
```

Every response carries `Cache-Control: no-store`, `Content-Security-Policy: default-src 'none';
frame-ancestors 'none'`, `X-Content-Type-Options: nosniff` and `X-Request-Id`; error bodies repeat
the id as `correlationId`. Responses after the rate-limit check also carry `RateLimit-Policy` and
`RateLimit`. A rejected request is logged by status and reason, never by body; each model call logs
its operation, attempt, duration and token counts.

The browser validates a successful response with `PlanSchema` before using it
([lib/client.ts](../lib/client.ts)).

The generator is created lazily in [lib/api/deps.ts](../lib/api/deps.ts), so a missing key fails the
request instead of the build. The limiter and logger are injected, which lets tests supply fakes.

### CSP reports

`POST /api/csp-report` ([app/api/csp-report/route.ts](../app/api/csp-report/route.ts),
[lib/api/cspReport.ts](../lib/api/cspReport.ts)) receives browser violation reports
(`application/reports+json` or `application/csp-report`). It applies its own rate limiter (20
tokens, 0.5 per second), an 8,192 byte body cap and strict parsing, and logs only counts of the
directive and blocked host. It answers 204, or 429, 413, 415 or 400.

## Page rendering and CSP

[app/layout.tsx](../app/layout.tsx) awaits `connection()`, forcing request-time rendering so each
response can carry a fresh nonce. [proxy.ts](../proxy.ts) runs on page requests (not `/api`, static
assets or prefetches), generates the nonce, sets `Content-Security-Policy` and forwards `x-nonce`
to Next.js, which applies it to framework scripts. The policy also sets `report-uri` and
`report-to` to `/api/csp-report`, and the response carries a `Reporting-Endpoints` header. See
[ADR-003](ADR-003-nonce-csp-dynamic-rendering.md).

## Client state flow

```
IntakeForm --requestPlan--> /api/plan
     |  Plan
     v
dispatch({ type: "replace", workspace: createWorkspace(intake, plan) })
     |
     v
workspaceStore (lib/workspaceStore.ts)
  snapshot: { status, workspace }      module-level singleton; a `storage` event from
                                       another tab drops the cache so the next read reloads
  dispatch(action):
     reducer(before.workspace, action)  (lib/workspace.ts, pure)
     unchanged -> return
     else snapshot = next
          workspace ? saveWorkspace : clearWorkspace  -> localStorage "eventcraft.plan.v2"
          (setAmount / setTotalBudget writes are debounced by PERSIST_DEBOUNCE_MS and
           flushed on pagehide or when the page is hidden)
          notify listeners
     |
     v
useWorkspace (components/useWorkspace.ts)
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
     server snapshot = { status: "loading" }  (no hydration mismatch)
     first client read = loadWorkspace(localStorage) validated by StoredWorkspaceSchema
     |
     v
PlanWorkspace / PlanSummary -> BudgetTable, Timeline, VendorChecklist, IdeasList, RefinePanel
```

Requests from the UI go through `usePendingRequest` ([components/usePendingRequest.ts](../components/usePendingRequest.ts)),
which owns one `AbortController` per request: it is aborted by Cancel, by a newer request and on
unmount, and its result is ignored when it was cancelled. `RefinePanel` is loaded with
`next/dynamic` because it sits below the tabs.

The intake form runs one of two flows ([components/intake/intakeFlows.ts](../components/intake/intakeFlows.ts)).
The create flow calls `/api/plan` and dispatches `replace`, after an inline confirmation when a
plan is already saved. The edit flow (`/plan/edit`) sends the saved plan and the edited intake to
`/api/refine` with the fixed instruction from `buildAdaptRequest` and dispatches `updateIntake`.
Importing a file on `/` dispatches `replace` with the validated workspace.

Reducer actions ([lib/workspace.ts](../lib/workspace.ts), `WorkspaceAction`): `replace`,
`setAmount`, `addLine`, `removeLine`, `setTotalBudget`, `toggleVendor`, `toggleMilestone`,
`applyPlan` (stores the old plan as `previousPlan`), `updateIntake` (replaces intake and plan and
clears `previousPlan`) and `undo` (restores `previousPlan`, one level). Every change updates
`savedAt`; actions that change nothing return the same state object so the store skips the write.

## Data model

`StoredWorkspace` = `{ version: WORKSPACE_VERSION (2), intake, plan, previousPlan | null, savedAt }`,
stored under `eventcraft.plan.v2`. A `Plan` has `summary`, `budget` (3-15 lines), `timeline` (4-25
milestones in phases `planning`, `booking`, `final-prep`, `event-day`, each with `done`), `vendors`
(3-15, up to 5 questions each, `booked`) and `ideas` (3-10). Items carry a UUID `id`. The model never
produces ids, `done` or `booked`; the server adds them. On refine, `booked` is carried over by
vendor category and `done` by milestone title.

## Design decisions

- [ADR-001](ADR-001-gemini-structured-output.md): schema-constrained Gemini output
- [ADR-002](ADR-002-localstorage-persistence.md): browser-only persistence
- [ADR-003](ADR-003-nonce-csp-dynamic-rendering.md): nonce CSP and dynamic rendering
