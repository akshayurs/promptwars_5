# Architecture

EventCraft is a Next.js 16 App Router application (React 19, TypeScript, Tailwind CSS 4). It has no
database. The server validates input, calls Gemini 2.5 Flash and returns a plan; the browser owns
and persists all plan state.

## Layout

| Path                                                                                                                            | Responsibility                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [app/](../app)                                                                                                                  | Routes: `/` intake, `/plan` workspace, `/plan/summary`, `/api/plan`, `/api/refine`                                                                                                |
| [components/](../components)                                                                                                    | Feature components; their parts live in `intake/`, `budget/`, `timeline/`, `workspace/`, `summary/`, `refine/`; [ui/](../components/ui) holds primitives, icons and shared styles |
| [lib/schema.ts](../lib/schema.ts), [lib/intakeSchema.ts](../lib/intakeSchema.ts)                                                | Zod schemas and inferred types (single source of truth)                                                                                                                           |
| [lib/constants.ts](../lib/constants.ts)                                                                                         | Limits, API settings, storage key                                                                                                                                                 |
| [lib/gemini.ts](../lib/gemini.ts)                                                                                               | `PlanGenerator`: Gemini call, JSON parsing, retry, error mapping                                                                                                                  |
| [lib/prompts.ts](../lib/prompts.ts)                                                                                             | System and user prompt builders                                                                                                                                                   |
| [lib/api/](../lib/api)                                                                                                          | `createPlanRoute` pipeline and route dependencies                                                                                                                                 |
| [lib/http.ts](../lib/http.ts), [lib/rateLimit.ts](../lib/rateLimit.ts), [lib/logger.ts](../lib/logger.ts)                       | Body reading, response helpers, limiter, JSON logs                                                                                                                                |
| [lib/workspace.ts](../lib/workspace.ts), [lib/workspaceStore.ts](../lib/workspaceStore.ts), [lib/storage.ts](../lib/storage.ts) | Client state                                                                                                                                                                      |
| [proxy.ts](../proxy.ts), [next.config.ts](../next.config.ts)                                                                    | CSP nonce and security headers                                                                                                                                                    |
| [instrumentation.ts](../instrumentation.ts)                                                                                     | Validates `GEMINI_API_KEY` when the Node.js server starts                                                                                                                         |

## Request flow (`POST /api/plan`, `POST /api/refine`)

Both routes are built with `createPlanRoute` ([lib/api/planRoute.ts](../lib/api/planRoute.ts)); only
the schema and `execute` function differ.

```
Browser (lib/client.ts postJson)
  |  POST application/json
  v
app/api/{plan|refine}/route.ts
  |
  1. correlationId = crypto.randomUUID()
  2. limiter.consume(clientKey)          -> 429 + Retry-After
  3. readJsonBody (32,768 byte cap)      -> 415 / 413 / 400
  4. schema.safeParse                    -> 400 + issues[]
        plan:   IntakeSchema
        refine: RefineRequestSchema (intake + plan + instruction)
  5. signal = AbortSignal.any([timeout(45s), request.signal])
  6. generator.generate | generator.refine
        buildPlanPrompt | buildRefinePrompt
        -> Gemini gemini-2.5-flash (JSON mime type + JSON schema)
        -> JSON.parse -> GeneratedPlanSchema; retry once if malformed
  7. toPlan (assign UUIDs, vendors.booked = false)
     | mergeRefinedPlan (new UUIDs, keep booked vendors by category)
  |
  v  200 Plan | 502 malformed/upstream | 504 timeout | 500 unexpected
     headers: Cache-Control: no-store, X-Request-Id
  v
Browser: PlanSchema.safeParse(response) -> ApiResult
```

The generator is created lazily in [lib/api/deps.ts](../lib/api/deps.ts), so a missing key fails the
request instead of the build. The limiter and logger are injected, which lets tests supply fakes.

## Page rendering and CSP

[app/layout.tsx](../app/layout.tsx) awaits `connection()`, forcing request-time rendering so each
response can carry a fresh nonce. [proxy.ts](../proxy.ts) runs on page requests (not `/api`, static
assets or prefetches), generates the nonce, sets `Content-Security-Policy` and forwards `x-nonce`
to Next.js, which applies it to framework scripts. See
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
  snapshot: { status, workspace }      module-level singleton
  dispatch(action):
     reducer(before.workspace, action)  (lib/workspace.ts, pure)
     unchanged -> return
     else snapshot = next
          workspace ? saveWorkspace : clearWorkspace  -> localStorage "eventcraft.plan.v2"
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

Reducer actions: `replace`, `setAmount`, `toggleVendor`, `applyPlan` (stores the old plan as
`previousPlan`) and `undo` (restores `previousPlan`, one level). Every change updates `savedAt`.

## Data model

`StoredWorkspace` = `{ version: 2, intake, plan, previousPlan | null, savedAt }`. A `Plan` has
`summary`, `budget` (3-15 lines), `timeline` (4-25 milestones in phases `planning`, `booking`,
`final-prep`, `event-day`), `vendors` (3-15, up to 5 questions each, `booked`) and `ideas` (3-10).
Items carry a UUID `id`. The model never produces ids or `booked`; the server adds them.

## Design decisions

- [ADR-001](ADR-001-gemini-structured-output.md): schema-constrained Gemini output
- [ADR-002](ADR-002-localstorage-persistence.md): browser-only persistence
- [ADR-003](ADR-003-nonce-csp-dynamic-rendering.md): nonce CSP and dynamic rendering
