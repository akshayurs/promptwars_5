# EventCraft

GenAI planning assistant for weddings, birthdays and community events. A user describes the
event; Gemini 2.5 Flash returns a structured plan (budget allocation, dated timeline, vendor
checklist, personalised ideas) that the user edits, refines with follow-up instructions, and
prints or exports. Plans persist only in the browser.

## Stack

Next.js 16.4 App Router (Turbopack), React 19, TypeScript strict, Tailwind v4, Radix Checkbox/Tabs,
Zod 4, `@google/genai` 2.30 (server-side only). Tests: Vitest + React Testing Library,
Playwright + axe-core. Node >= 22.12.

Next.js 16 differs from older versions. Before touching routing, config, proxy/middleware, CSP,
metadata or caching, read the bundled docs in `node_modules/next/dist/docs/01-app/`
(see `AGENTS.md`, which `next dev` regenerates).

## Layout

- `app/` routes: `/` intake form, `/plan` workspace (tabs: budget, timeline, vendors, ideas +
  refine panel), `/plan/summary` read-only print/export view, `api/plan` and `api/refine` POST
  route handlers. `error.tsx`, `global-error.tsx`, `not-found.tsx`, `robots.ts`.
- `components/` client components; `components/ui/` primitives (Button, Field, Alert).
  `useWorkspace.ts` reads the store with `useSyncExternalStore`.
- `lib/schema.ts` is the single source of truth: Zod schemas drive TypeScript types, form
  validation, API validation, the Gemini response schema and the localStorage shape.
- `lib/gemini.ts` wraps the SDK (structured JSON output, one retry on malformed output, timeout and
  abort handling). `lib/prompts.ts` builds prompts as pure functions. `lib/plan.ts` adds ids and
  applies deterministic guards (budget fit, lead-time clamp, booking carry-over, diffs).
- `lib/api/planRoute.ts` is the shared route pipeline: rate limit -> body size/type check -> Zod
  -> generator with `AbortSignal` -> typed error responses with correlation ids.
- `lib/workspace.ts` pure reducer; `lib/workspaceStore.ts` external store that persists via
  `lib/storage.ts` (validated on read). `lib/constants.ts` holds every limit and tunable.
- `proxy.ts` sets the nonce CSP (requires request-time rendering: the root layout awaits
  `connection()`); `next.config.ts` sets the other security headers; `instrumentation.ts`
  validates env at startup and logs request errors.
- `tests/unit`, `tests/api`, `tests/components`, `tests/e2e`. Gemini is mocked in unit tests;
  e2e intercepts `/api/*` in the browser with fixture plans.

## Commands

```bash
npm run check      # lint + prettier + typecheck + unit tests with coverage + knip + build
npm run test:e2e   # builds, starts on :3100, runs Playwright (desktop + mobile) with axe
npm run dev        # needs GEMINI_API_KEY in .env.local
```

## Conventions (enforced by ESLint/TS, do not relax)

- No `any`, no `eslint-disable`, no `console`; explicit return types on exports; type aliases not
  interfaces; max 60 lines per function, 3 params, cognitive complexity 10; no nested ternaries.
- Every limit or magic number lives in `lib/constants.ts`.
- Pure functions take injectable clocks and id factories so tests are deterministic.
- Model output is only ever rendered as text nodes; user text is placed in delimited data blocks in
  prompts and never treated as instructions.
- No sample/static plan content, placeholder text or TODO markers anywhere in app code.
- Conventional Commits; stage only task-relevant files.

## Gotchas learned the hard way

- Gemini `responseJsonSchema` rejects schemas with many constraints ("too many states"). Strip
  `minLength/maxLength/minimum/maximum/minItems/maxItems/$schema` before sending; Zod enforces them
  after the response instead. Gemini does honour `description`, `enum`, `required`,
  `additionalProperties`.
- `gemini-2.5-flash` intermittently returns 503 "high demand"; surface it as a retryable 503.
- `import "server-only"` modules need the Vitest alias to an empty stub (see `vitest.config.ts`).
- `.env*` files are blocked for the assistant by a permission rule; the user maintains
  `.env.local` and `.env.example` by hand. Never attempt to read or write them.
- Nonce CSP + static prerendering = no scripts in production. Keep `await connection()` in
  `app/layout.tsx`.
- `npm audit` flags `braces` via `eslint-config-next` (dev only); `npm audit --omit=dev` is clean.
